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
const SYSTEM_PROMPT = `Você é o parser de um assistente de voz para mecânicos de oficina.
Receba a fala do mecânico e devolva APENAS um JSON com a intenção.

Intenções:
- "buscar": localizar/contar uma peça. Ex.: "onde está o filtro de óleo".
- "baixa": consumir/retirar peça do estoque. Ex.: "tira 2 óleo 5w30".
- "kit": sugerir peças de um serviço. Ex.: "monta o kit de troca de óleo".
- "desconhecido": não se encaixa em nada acima.

Regras:
- "termo": nome da peça ou serviço falado, em minúsculas, sem artigos.
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  // 2) Cota local antes de tocar a API.
  if (!temCota()) throw new RateLimitError();

  // 3) Chamada ao Gemini com backoff só para 429.
  let tentativa = 0;
  while (true) {
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
      const msg = String(err?.status ?? err?.message ?? err);
      const is429 = msg.includes("429");

      if (is429 && tentativa < 2) {
        await sleep(1000 * 2 ** tentativa); // 1s, 2s
        tentativa += 1;
        continue;
      }
      // JSON inválido ou outro erro -> não trava o fluxo de voz.
      if (err instanceof SyntaxError) {
        return { intencao: "desconhecido", termo: limpo, quantidade: 1 };
      }
      throw new AIServiceError(`Falha ao consultar o Gemini: ${msg}`);
    }
  }
}
