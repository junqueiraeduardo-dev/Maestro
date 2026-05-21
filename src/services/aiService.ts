/**
 * src/services/aiService.ts
 *
 * Interpreta a fala do operador e devolve a INTENÇÃO estruturada.
 *
 * Dois modelos, escolhidos pelo plano do usuário:
 *   FREE    → gemini-2.0-flash  (rápido, cota generosa: 15 RPM / 1500 RPD)
 *   PREMIUM → gemini-2.5-flash  (raciocínio melhor; cota free menor: 10 RPM / 250 RPD)
 *
 * Por que separar:
 *   - Quem paga não compete com a cota dos testes grátis (buckets distintos).
 *   - 2.5-flash entende comandos ambíguos/com ruído (oficina, fábrica) bem
 *     melhor que 2.0-flash — diferença sentida em "tira dois litro de óleo
 *     do hidráulico ali, daquela prateleira" e variações regionais.
 *
 * Estratégia de Custo Zero mantida:
 *   1. fastPath(): regex resolve comandos óbvios SEM chamar a IA.
 *   2. Token bucket local POR PLANO: corta excesso antes de gastar cota.
 *   3. responseSchema JSON: 1 chamada resolve, sem retry de parsing.
 *   4. Falha de IA degrada para "buscar" (READ-ONLY, seguro).
 *
 * A IA NÃO escreve a frase falada - só classifica. A resposta de voz
 * é montada por template na rota (evita 2ª chamada de IA).
 */
import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

export type Intencao = "buscar" | "baixa" | "kit" | "desconhecido";
export type Plano = "free" | "premium";

export interface IntentResult {
  intencao: Intencao;
  termo: string; // nome da peça/serviço, minúsculo, sem artigos
  quantidade: number; // inteiro >= 1
}

/** Erro de cota local (não chega a tocar a API). */
export class RateLimitError extends Error {
  constructor() {
    super("RATE_LIMIT_LOCAL");
    this.name = "RateLimitError";
  }
}

/** Falha ao falar com o Gemini (rede, 5xx, 429 persistente). */
export class AIServiceError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "AIServiceError";
  }
}

// --------------------------------------------------------------------
// System Prompt (curto = menos tokens = mais folga no Free Tier)
// --------------------------------------------------------------------
const SYSTEM_PROMPT = `Você é o parser de um assistente de voz de almoxarifado de manutenção industrial (MRO) e de frota pesada/agro (caminhão, colheitadeira, trator). O técnico fala com as mãos ocupadas. Devolva APENAS um JSON com a intenção.

Intenções:
- "buscar": localizar/contar um item. Ex.: "onde está o rolamento 6205", "quanto tem de filtro de combustível".
- "baixa": consumir/retirar item do estoque. Ex.: "tira 2 correias", "baixa 4 litros de óleo hidráulico".
- "kit": sugerir itens de uma manutenção/revisão. Ex.: "monta o kit de revisão de 500 horas", "kit de troca de óleo do motor".
- "desconhecido": não se encaixa em nada acima.

Regras:
- "termo": nome do item ou da manutenção falado, em minúsculas, sem artigos.
- "quantidade": inteiro; use 1 se não for dito.
- Nunca invente SKU. Nunca escreva frases para o usuário. Só o JSON.`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    intencao: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["buscar", "baixa", "kit", "desconhecido"],
    },
    termo: { type: SchemaType.STRING },
    quantidade: { type: SchemaType.INTEGER },
  },
  required: ["intencao", "termo", "quantidade"],
} as const;

// Dois modelos, instanciados uma vez (caro recriar a cada request).
const modeloFree = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    temperature: 0,
    maxOutputTokens: 80,
    responseMimeType: "application/json",
    responseSchema: RESPONSE_SCHEMA as any,
  },
});

const modeloPremium = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    temperature: 0,
    maxOutputTokens: 120, // 2.5 raciocina melhor; deixa espaço pra termos longos
    responseMimeType: "application/json",
    responseSchema: RESPONSE_SCHEMA as any,
  },
});

// --------------------- Token buckets (em memória) -------------------
// Buckets SEPARADOS por plano: assim picos de uso free não afetam premium.
// Limites ficam abaixo do teto do free tier do Google AI Studio:
//   free    bucket = 12/min  (teto real 2.0-flash = 15 RPM)
//   premium bucket =  8/min  (teto real 2.5-flash = 10 RPM)
const LIMITES: Record<Plano, number> = { free: 12, premium: 8 };

type Bucket = { janela: number; contador: number };
const buckets: Record<Plano, Bucket> = {
  free:    { janela: Math.floor(Date.now() / 60_000), contador: 0 },
  premium: { janela: Math.floor(Date.now() / 60_000), contador: 0 },
};

function temCota(plano: Plano): boolean {
  const b = buckets[plano];
  const agora = Math.floor(Date.now() / 60_000);
  if (agora !== b.janela) {
    b.janela = agora;
    b.contador = 0;
  }
  if (b.contador >= LIMITES[plano]) return false;
  b.contador += 1;
  return true;
}


// ------------------------- Fast-path (sem IA) -----------------------
function normalizar(qtd: string | undefined): number {
  const n = parseInt(qtd ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function fastPath(texto: string): IntentResult | null {
  const t = texto.toLowerCase().trim();

  const mBaixa = t.match(
    /^(?:baixa|tira|tirar|usa|usar|retira|retirar)\s+(\d+)?\s*(.+)$/
  );
  if (mBaixa) {
    return { intencao: "baixa", quantidade: normalizar(mBaixa[1]), termo: mBaixa[2].trim() };
  }

  const mBusca = t.match(
    /^(?:onde|cad[eê]|quanto(?:s)? tem|busca|buscar|procura|procurar|localiza)\s+(.+)$/
  );
  if (mBusca) {
    return { intencao: "buscar", quantidade: 1, termo: mBusca[1].trim() };
  }

  return null; // não é óbvio -> Gemini
}

// --------------------------- API pública ----------------------------
/**
 * Interpreta o texto transcrito e retorna a intenção estruturada.
 * @param texto   fala transcrita pelo Web Speech API
 * @param plano   'premium' (paga, usa 2.5-flash) ou 'free' (default, 2.0-flash)
 */
export async function interpretarComando(
  texto: string,
  plano: Plano = "free"
): Promise<IntentResult> {
  const limpo = texto.trim().slice(0, 200);
  if (!limpo) return { intencao: "desconhecido", termo: "", quantidade: 1 };

  // 1) Atalho local: melhor requisição é a que não se faz.
  const atalho = fastPath(limpo);
  if (atalho) return atalho;

  // 2) Cota local POR PLANO: se estourou, NÃO trava o operador -> degrada para busca.
  if (!temCota(plano)) {
    console.warn(`[gemini:${plano}] cota local atingida; degradando para busca`);
    return { intencao: "buscar", termo: limpo, quantidade: 1 };
  }

  // 3) UMA chamada ao Gemini com o modelo do plano.
  const modelo = plano === "premium" ? modeloPremium : modeloFree;
  try {
    const res = await modelo.generateContent(limpo);
    const parsed = JSON.parse(res.response.text()) as Partial<IntentResult>;

    const intencao = (parsed.intencao ?? "desconhecido") as Intencao;
    return {
      intencao: ["buscar", "baixa", "kit"].includes(intencao)
        ? intencao
        : "desconhecido",
      termo: (parsed.termo ?? "").toString().toLowerCase().trim(),
      quantidade: normalizar(String(parsed.quantidade ?? 1)),
    };
  } catch (err: any) {
    // 429 (quota), rede, 5xx ou JSON inválido: o assistente NÃO pode travar.
    // Degrada para "buscar" (operação READ-ONLY, segura: nunca dá baixa errada)
    // usando a fala crua como termo. O log registra o motivo real.
    const msg = String(err?.message ?? err?.status ?? err);
    console.warn(`[gemini:${plano}] indisponível, degradando para busca:`, msg);
    return { intencao: "buscar", termo: limpo, quantidade: 1 };
  }
}
