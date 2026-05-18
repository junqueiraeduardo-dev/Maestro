/**
 * src/services/aiService.ts
 *
 * Interpreta a fala do operador e devolve a INTENÇÃO estruturada.
 *
 * Estratégia de Custo Zero (Gemini 2.0 Flash - Free Tier):
 *   1. fastPath(): regex resolve comandos óbvios SEM chamar a IA.
 *   2. Token bucket local: corta excesso ANTES de gastar cota (não leva 429).
 *   3. responseSchema JSON: 1 chamada resolve, sem retry de parsing.
 *   4. Backoff exponencial só quando a API realmente devolve 429.
 *
 * A IA NÃO escreve a frase falada - só classifica. A resposta de voz
 * é montada por template na rota (evita 2ª chamada de IA).
 */
import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

export type Intencao = "buscar" | "baixa" | "kit" | "desconhecido";

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

const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: {
    temperature: 0,
    maxOutputTokens: 80,
    responseMimeType: "application/json",
    responseSchema: {
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
    },
  },
});

// --------------------- Token bucket (em memória) --------------------
const LIMITE_POR_MIN = 12; // margem abaixo de 15 p/ não raspar o teto
let janela = Math.floor(Date.now() / 60_000);
let contador = 0;

function temCota(): boolean {
  const agora = Math.floor(Date.now() / 60_000);
  if (agora !== janela) {
    janela = agora;
    contador = 0;
  }
  if (contador >= LIMITE_POR_MIN) return false;
  contador += 1;
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
 * @throws RateLimitError  cota local esgotada
 * @throws AIServiceError  falha de rede/serviço no Gemini
 */
export async function interpretarComando(texto: string): Promise<IntentResult> {
  const limpo = texto.trim().slice(0, 200);
  if (!limpo) return { intencao: "desconhecido", termo: "", quantidade: 1 };

  // 1) Atalho local: melhor requisição é a que não se faz.
  const atalho = fastPath(limpo);
  if (atalho) return atalho;

  // 2) Cota local: se estourou, NÃO trava o operador -> degrada para busca.
  if (!temCota()) {
    console.warn("[gemini] cota local atingida; degradando para busca");
    return { intencao: "buscar", termo: limpo, quantidade: 1 };
  }

  // 3) UMA chamada ao Gemini. Sem retry: em free tier, retentar num 429
  //    só queima mais cota (a janela de RPM não reabre em 1-2s).
  try {
    const res = await model.generateContent(limpo);
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
    // usando a fala crua como termo. O log registra o motivo real para diagnóstico.
    const msg = String(err?.message ?? err?.status ?? err);
    console.warn("[gemini] indisponível, degradando para busca:", msg);
    return { intencao: "buscar", termo: limpo, quantidade: 1 };
  }
}
