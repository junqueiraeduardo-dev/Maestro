/**
 * src/routes/voiceRoutes.ts
 *
 * POST /api/process-voice
 *   body:  { texto: string }
 *   resp:  { fala: string, intencao: Intencao }
 *
 * Fluxo: texto -> aiService (intenção) -> Supabase RPC -> frase curta (template).
 * A frase é montada aqui (sem 2ª chamada de IA) e o frontend só fala.
 * Sempre retorna um campo `fala` falável, mesmo em erro.
 */
import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import {
  interpretarComando,
  IntentResult,
  RateLimitError,
  AIServiceError,
} from "../services/aiService";

export const voiceRouter = Router();

// ---- Templates de fala (curtos, vão direto pro Text-to-Speech) ----
const FALA = {
  buscaOk: (p: any) =>
    `${p.nome}. ${p.quantidade} em estoque, na ${p.localizacao_fisica || "área não informada"}.`,
  buscaVazia: (t: string) => `Não encontrei nada parecido com ${t}.`,
  baixaOk: (r: any) => `Baixa feita. Restam ${r.restante} de ${r.nome}.`,
  baixaSemSaldo: (r: any) =>
    `Saldo insuficiente. Só tem ${r.restante} de ${r.nome}.`,
  baixaNaoAchou: (t: string) => `Não achei a peça ${t} para dar baixa.`,
  kit: (itens: any[]) =>
    itens.length
      ? `Kit sugerido: ${itens.map((i) => i.nome).join(", ")}.`
      : "Não tenho um kit cadastrado para esse serviço.",
  limite: "Sistema ocupado, tente em alguns segundos.",
  erroIA: "Não consegui processar o comando agora.",
  erroDB: "Tive um problema ao consultar o estoque.",
  naoEntendi: "Não entendi o comando, repita por favor.",
};

async function executar(
  intent: IntentResult
): Promise<{ fala: string; intencao: string }> {
  const { intencao, termo, quantidade } = intent;

  switch (intencao) {
    case "buscar": {
      const { data, error } = await supabase.rpc("buscar_peca", { termo });
      if (error) throw error;
      return data?.length
        ? { fala: FALA.buscaOk(data[0]), intencao }
        : { fala: FALA.buscaVazia(termo), intencao };
    }

    case "baixa": {
      // Não pedimos SKU à IA: resolvemos termo -> peça real e usamos o SKU.
      const { data: achados, error: e1 } = await supabase.rpc("buscar_peca", {
        termo,
      });
      if (e1) throw e1;
      if (!achados?.length)
        return { fala: FALA.baixaNaoAchou(termo), intencao };

      const { data, error: e2 } = await supabase.rpc("dar_baixa_estoque", {
        p_sku: achados[0].sku,
        p_qtd: quantidade,
      });
      if (e2) throw e2;

      const r = data?.[0];
      if (r?.status === "OK") return { fala: FALA.baixaOk(r), intencao };
      if (r?.status === "SALDO_INSUFICIENTE")
        return { fala: FALA.baixaSemSaldo(r), intencao };
      return { fala: FALA.baixaNaoAchou(termo), intencao };
    }

    case "kit": {
      const { data, error } = await supabase
        .from("estoque_pecas")
        .select("nome")
        .ilike("categoria", `%${termo}%`)
        .limit(5);
      if (error) throw error;
      return { fala: FALA.kit(data || []), intencao };
    }

    default:
      return { fala: FALA.naoEntendi, intencao: "desconhecido" };
  }
}

voiceRouter.post("/process-voice", async (req: Request, res: Response) => {
  const texto = (req.body?.texto ?? "").toString().trim();

  if (!texto) {
    return res.status(400).json({ fala: FALA.naoEntendi, intencao: "desconhecido" });
  }

  try {
    const intent = await interpretarComando(texto);
    const out = await executar(intent);
    return res.status(200).json(out);
  } catch (err: any) {
    // Cada falha vira uma frase falável + status HTTP coerente.
    if (err instanceof RateLimitError) {
      return res.status(429).json({ fala: FALA.limite, intencao: "erro" });
    }
    if (err instanceof AIServiceError) {
      console.error("[voice] IA:", err.message);
      return res.status(502).json({ fala: FALA.erroIA, intencao: "erro" });
    }
    console.error("[voice] DB:", err?.message ?? err);
    return res.status(500).json({ fala: FALA.erroDB, intencao: "erro" });
  }
});
