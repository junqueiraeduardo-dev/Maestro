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
import crypto from "crypto";
import { supabase } from "../config/supabase";
import { getWs } from "../workspace";
import { logAtiv } from "../audit";
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
  addOk: (nome: string, qtd: number, sku: string) =>
    `Pronto. Adicionei ${qtd} ${nome} no estoque com código ${sku}. Toque pra completar os dados.`,
  addExiste: (nome: string, qtd: number) =>
    `Já existia ${nome}. Aumentei o estoque em ${qtd} unidades.`,
  addNomeCurto: "Nome muito curto, repita com mais detalhes.",
  limite: "Sistema ocupado, tente em alguns segundos.",
  erroIA: "Não consegui processar o comando agora.",
  erroDB: "Tive um problema ao consultar o estoque.",
  naoEntendi: "Não entendi o comando, repita por favor.",
};

/**
 * Gera um SKU curto baseado no nome + sufixo aleatório.
 *  "filtro de óleo" → "FIL-A3F2"
 * Tira acentos, pega 3 primeiras letras + 4 hex random. Quase impossível
 * colidir (16^4 = 65k combinações por prefixo).
 */
function geraSkuDeNome(nome: string): string {
  const limpo = nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const prefixo = limpo.slice(0, 3) || "ITM";
  const sufixo = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${prefixo}-${sufixo}`;
}

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

    case "adicionar": {
      // Cadastro por voz com defaults sãos. Se já existe peça com nome
      // parecido (fuzzy match via RPC), incrementa o estoque ao invés
      // de criar duplicata. Caso novo, gera SKU temporário e a peça
      // entra com quantidade inicial — usuário completa no app depois.
      const nome = termo.trim();
      if (nome.length < 3) {
        return { fala: FALA.addNomeCurto, intencao, dados: null };
      }

      // 1) Tenta achar peça existente similar (defesa contra duplicação)
      const { data: similar } = await supabase.rpc("buscar_peca", {
        p_workspace: ws,
        termo: nome,
      });
      const jaTinha = similar?.[0];
      if (jaTinha && jaTinha.score > 0.5) {
        // Match alto → incrementa estoque ao invés de criar nova
        const { error: eUpd } = await supabase
          .from("estoque_pecas")
          .update({ quantidade: jaTinha.quantidade + quantidade })
          .eq("workspace_id", ws)
          .eq("sku", jaTinha.sku);
        if (eUpd) throw eUpd;
        return {
          fala: FALA.addExiste(jaTinha.nome, quantidade),
          intencao,
          dados: {
            sku: jaTinha.sku,
            nome: jaTinha.nome,
            quantidade: jaTinha.quantidade + quantidade,
            adicionados: quantidade,
            existia: true,
          },
        };
      }

      // 2) Nova peça — gera SKU único (retry até 3x em colisão improvável)
      let sku = geraSkuDeNome(nome);
      for (let i = 0; i < 3; i++) {
        const { data: col } = await supabase
          .from("estoque_pecas")
          .select("id")
          .eq("workspace_id", ws)
          .eq("sku", sku)
          .maybeSingle();
        if (!col) break;
        sku = geraSkuDeNome(nome);
      }

      const { error: eIns } = await supabase.from("estoque_pecas").insert({
        workspace_id: ws,
        sku,
        nome: nome.slice(0, 140),
        quantidade,
        localizacao_fisica: null,
        sinonimos: "",
        categoria: null,
      });
      if (eIns) throw eIns;
      // logAtiv precisa de req — workaround: passo via closure (refator pequeno)
      // Já fazemos isso em outras rotas; aqui chamamos do handler abaixo.
      return {
        fala: FALA.addOk(nome, quantidade, sku),
        intencao,
        dados: {
          sku,
          nome,
          quantidade,
          existia: false,
        },
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
    // Auditoria: registra ações que MUDAM dados (baixa, adicionar).
    if (intent.intencao === "baixa" && out.dados?.sku)
      logAtiv(req, "baixou peça (voz)", String(out.dados.sku));
    if (intent.intencao === "adicionar" && out.dados?.sku)
      logAtiv(req,
        out.dados.existia ? "incrementou estoque (voz)" : "cadastrou peça (voz)",
        String(out.dados.sku));
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
