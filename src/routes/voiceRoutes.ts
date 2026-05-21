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
import { getWs } from "../workspace";
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

// `dados` carrega o resultado estruturado para a UI desenhar os cards
// (SKU, qtd, local / itens do kit). É opcional: se a IA degradar ou nada
// for encontrado, vem null e o frontend cai no texto `fala`.
async function executar(
  intent: IntentResult,
  ws: string
): Promise<{ fala: string; intencao: string; dados: any }> {
  const { intencao, termo, quantidade } = intent;

  switch (intencao) {
    case "buscar": {
      const { data, error } = await supabase.rpc("buscar_peca", { p_workspace: ws, termo });
      if (error) throw error;
      const p = data?.[0];
      return p
        ? {
            fala: FALA.buscaOk(p),
            intencao,
            dados: {
              sku: p.sku,
              nome: p.nome,
              quantidade: p.quantidade,
              localizacao_fisica: p.localizacao_fisica,
            },
          }
        : { fala: FALA.buscaVazia(termo), intencao, dados: null };
    }

    case "baixa": {
      // Não pedimos SKU à IA: resolvemos termo -> peça real e usamos o SKU.
      const { data: achados, error: e1 } = await supabase.rpc("buscar_peca", {
        p_workspace: ws,
        termo,
      });
      if (e1) throw e1;
      if (!achados?.length)
        return { fala: FALA.baixaNaoAchou(termo), intencao, dados: null };

      const { data, error: e2 } = await supabase.rpc("dar_baixa_estoque", {
        p_workspace: ws,
        p_sku: achados[0].sku,
        p_qtd: quantidade,
      });
      if (e2) throw e2;

      const r = data?.[0];
      if (r?.status === "OK")
        return {
          fala: FALA.baixaOk(r),
          intencao,
          dados: {
            sku: achados[0].sku,
            nome: r.nome,
            restante: r.restante,
            baixados: quantidade,
          },
        };
      if (r?.status === "SALDO_INSUFICIENTE")
        return {
          fala: FALA.baixaSemSaldo(r),
          intencao,
          dados: { sku: achados[0].sku, nome: r.nome, restante: r.restante },
        };
      return { fala: FALA.baixaNaoAchou(termo), intencao, dados: null };
    }

    case "kit": {
      const { data, error } = await supabase
        .from("estoque_pecas")
        .select("nome, sku, quantidade")
        .eq("workspace_id", ws)
        .ilike("categoria", `%${termo}%`)
        .limit(5);
      if (error) throw error;
      return {
        fala: FALA.kit(data || []),
        intencao,
        dados: data?.length ? data : null,
      };
    }

    default:
      return { fala: FALA.naoEntendi, intencao: "desconhecido", dados: null };
  }
}

voiceRouter.post("/process-voice", async (req: Request, res: Response) => {
  const texto = (req.body?.texto ?? "").toString().trim();

  if (!texto) {
    return res.status(400).json({ fala: FALA.naoEntendi, intencao: "desconhecido" });
  }

  // Plano define qual modelo Gemini usar (premium = 2.5-flash, raciocínio melhor)
  const papel = (req as any).papel as "pai" | "filho" | "trial" | undefined;
  const plano = papel === "trial" ? "free" : "premium";

  try {
    const intent = await interpretarComando(texto, plano);
    const out = await executar(intent, getWs(req));
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
