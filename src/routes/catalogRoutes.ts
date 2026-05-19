/**
 * src/routes/catalogRoutes.ts
 *
 * O CLIENTE cadastra os dados dele:
 *   - Equipamentos (frota / máquinas)
 *   - Peças no estoque (almoxarifado)
 *
 * Toda entrada é validada e sanitizada no servidor (defense-in-depth):
 *   - códigos/SKU: whitelist [A-Z0-9-], 2..32
 *   - termos de busca: whitelist de caracteres (impede injeção de filtro PostgREST)
 *   - enums verificados; números com faixa; strings com teto de tamanho
 * Acesso ao banco só via service_role (RLS ligado, sem policy pública).
 */
import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { requireAdmin } from "../auth";
import { logAtiv } from "../audit";

export const catalogRouter = Router();

// ----------------------- sanitização -----------------------
const STATUS_EQUIP = ["operacional", "manutencao", "parado"] as const;
const SEGMENTOS = ["mro", "frota"] as const;

/** string simples com teto de tamanho (ou null se vazia) */
function s(v: unknown, max = 120): string | null {
  if (v == null) return null;
  const t = String(v).trim().slice(0, max);
  return t.length ? t : null;
}

/** código/SKU: só A-Z 0-9 e hífen, 2..32, caixa alta */
function code(v: unknown): string | null {
  const t = String(v ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "");
  return t.length >= 2 && t.length <= 32 ? t : null;
}

/**
 * Termo de busca seguro: mantém só letras/números/espaço/-/ "/" e corta em 60.
 * Remove vírgula, parênteses, ponto, asterisco, dois-pontos, aspas — exatamente
 * os metacaracteres que o PostgREST usa em filtros (.or=) — impede injeção.
 */
function term(v: unknown): string {
  return String(v ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s\-/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function intIn(v: unknown, def: number, min: number, max: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

/** URL http/https válida (ou null). Bloqueia javascript:, data:, etc. */
function url(v: unknown): string | null {
  const t = String(v ?? "").trim().slice(0, 400);
  if (!t) return null;
  try {
    const u = new URL(t);
    return u.protocol === "http:" || u.protocol === "https:" ? t : null;
  } catch {
    return null;
  }
}

// =====================================================================
// EQUIPAMENTOS
// =====================================================================
catalogRouter.post("/equipamentos", async (req: Request, res: Response) => {
  try {
    const codigo = code(req.body?.codigo);
    const nome = s(req.body?.nome, 120);
    if (!codigo || !nome)
      return res
        .status(400)
        .json({ erro: "Código (A-Z0-9-, 2-32) e nome são obrigatórios." });

    const status = STATUS_EQUIP.includes(req.body?.status)
      ? req.body.status
      : "operacional";

    const { data: existe } = await supabase
      .from("equipamentos")
      .select("id")
      .eq("codigo", codigo)
      .maybeSingle();
    if (existe)
      return res.status(409).json({ erro: `Já existe equipamento ${codigo}.` });

    const { data, error } = await supabase
      .from("equipamentos")
      .insert({
        codigo,
        nome,
        modelo: s(req.body?.modelo, 80),
        ano: req.body?.ano ? intIn(req.body.ano, 0, 1900, 2100) : null,
        placa: s(req.body?.placa, 16),
        tipo: s(req.body?.tipo, 40),
        status,
      })
      .select("codigo,nome,modelo,ano,placa,tipo,status")
      .single();
    if (error) throw error;
    logAtiv(req, "cadastrou equipamento", codigo);
    res.status(201).json({
      equip: {
        id: data.codigo,
        nome: data.nome,
        modelo: data.modelo,
        ano: data.ano,
        placa: data.placa,
        tipo: data.tipo,
        status: data.status,
        custoMes: 0,
        osAno: 0,
      },
    });
  } catch (err: any) {
    console.error("[catalog] equip create:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao cadastrar equipamento." });
  }
});

catalogRouter.patch("/equipamentos/:codigo", async (req: Request, res: Response) => {
  try {
    const codigo = code(req.params.codigo);
    if (!codigo) return res.status(400).json({ erro: "Código inválido." });

    const patch: Record<string, any> = {};
    if ("nome" in req.body) patch.nome = s(req.body.nome, 120);
    if ("modelo" in req.body) patch.modelo = s(req.body.modelo, 80);
    if ("placa" in req.body) patch.placa = s(req.body.placa, 16);
    if ("tipo" in req.body) patch.tipo = s(req.body.tipo, 40);
    if ("ano" in req.body)
      patch.ano = req.body.ano ? intIn(req.body.ano, 0, 1900, 2100) : null;
    if ("status" in req.body) {
      if (!STATUS_EQUIP.includes(req.body.status))
        return res.status(400).json({ erro: "Status inválido." });
      patch.status = req.body.status;
    }
    if (Object.keys(patch).length === 0)
      return res.status(400).json({ erro: "Nada para atualizar." });

    const { data, error } = await supabase
      .from("equipamentos")
      .update(patch)
      .eq("codigo", codigo)
      .select("codigo")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ erro: "Equipamento não encontrado." });
    logAtiv(req, "editou equipamento", codigo);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[catalog] equip patch:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao atualizar equipamento." });
  }
});

// =====================================================================
// PEÇAS / ESTOQUE
// =====================================================================
catalogRouter.get("/pecas", async (req: Request, res: Response) => {
  try {
    const q = term(req.query.q);
    let query = supabase
      .from("estoque_pecas")
      .select("sku,nome,quantidade,localizacao_fisica,categoria,segmento,tutorial_url")
      .order("nome")
      .limit(40);
    if (q) {
      // Busca "frouxa": quebra em palavras e casa QUALQUER uma em
      // nome/sku/sinônimos/categoria. Assim "kit de troca de oleo" acha
      // peças que contenham "kit" OU "troca" OU "oleo". q já sanitizado
      // (sem vírgula/parêntese/ponto) -> seguro no .or().
      const stop = new Set(["de", "da", "do", "e", "o", "a", "para", "com"]);
      const toks = q
        .split(" ")
        .filter((t) => t.length >= 2 && !stop.has(t))
        .slice(0, 6);
      const alvo = toks.length ? toks : [q];
      const ors = alvo
        .flatMap((t) => [
          `nome.ilike.%${t}%`,
          `sku.ilike.%${t}%`,
          `sinonimos.ilike.%${t}%`,
          `categoria.ilike.%${t}%`,
        ])
        .join(",");
      query = query.or(ors);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({
      pecas: (data || []).map((p: any) => ({
        sku: p.sku,
        nome: p.nome,
        qtd: p.quantidade,
        loc: p.localizacao_fisica,
        cat: p.categoria,
        seg: p.segmento,
        tutorial: p.tutorial_url || null,
      })),
    });
  } catch (err: any) {
    console.error("[catalog] pecas list:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao buscar peças." });
  }
});

catalogRouter.post("/pecas", async (req: Request, res: Response) => {
  try {
    const sku = code(req.body?.sku);
    const nome = s(req.body?.nome, 140);
    if (!sku || !nome)
      return res
        .status(400)
        .json({ erro: "SKU (A-Z0-9-, 2-32) e nome são obrigatórios." });

    const segmento = SEGMENTOS.includes(req.body?.segmento)
      ? req.body.segmento
      : null;

    const { data: existe } = await supabase
      .from("estoque_pecas")
      .select("id")
      .eq("sku", sku)
      .maybeSingle();
    if (existe)
      return res.status(409).json({ erro: `Já existe a peça ${sku}.` });

    const { error } = await supabase.from("estoque_pecas").insert({
      sku,
      nome,
      quantidade: intIn(req.body?.quantidade, 0, 0, 1_000_000),
      localizacao_fisica: s(req.body?.localizacao_fisica, 60),
      sinonimos: s(req.body?.sinonimos, 240) || "",
      categoria: s(req.body?.categoria, 60),
      tutorial_url: url(req.body?.tutorial_url),
      segmento,
    });
    if (error) throw error;
    logAtiv(req, "cadastrou peça", sku);
    res.status(201).json({ ok: true, sku });
  } catch (err: any) {
    console.error("[catalog] peca create:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao cadastrar peça." });
  }
});

catalogRouter.patch("/pecas/:sku", async (req: Request, res: Response) => {
  try {
    const sku = code(req.params.sku);
    if (!sku) return res.status(400).json({ erro: "SKU inválido." });

    const patch: Record<string, any> = {};
    if ("nome" in req.body) patch.nome = s(req.body.nome, 140);
    if ("localizacao_fisica" in req.body)
      patch.localizacao_fisica = s(req.body.localizacao_fisica, 60);
    if ("sinonimos" in req.body)
      patch.sinonimos = s(req.body.sinonimos, 240) || "";
    if ("categoria" in req.body) patch.categoria = s(req.body.categoria, 60);
    if ("tutorial_url" in req.body) patch.tutorial_url = url(req.body.tutorial_url);
    if ("segmento" in req.body)
      patch.segmento = SEGMENTOS.includes(req.body.segmento)
        ? req.body.segmento
        : null;
    if ("quantidade" in req.body)
      patch.quantidade = intIn(req.body.quantidade, 0, 0, 1_000_000);
    if (Object.keys(patch).length === 0)
      return res.status(400).json({ erro: "Nada para atualizar." });

    const { data, error } = await supabase
      .from("estoque_pecas")
      .update(patch)
      .eq("sku", sku)
      .select("sku")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ erro: "Peça não encontrada." });
    logAtiv(req, "editou peça", sku);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[catalog] peca patch:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao atualizar peça." });
  }
});

catalogRouter.delete("/pecas/:sku", requireAdmin, async (req: Request, res: Response) => {
  try {
    const sku = code(req.params.sku);
    if (!sku) return res.status(400).json({ erro: "SKU inválido." });
    const { data, error } = await supabase
      .from("estoque_pecas")
      .delete()
      .eq("sku", sku)
      .select("sku")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ erro: "Peça não encontrada." });
    logAtiv(req, "excluiu peça", sku);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[catalog] peca delete:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao excluir peça." });
  }
});

catalogRouter.delete("/equipamentos/:codigo", requireAdmin, async (req: Request, res: Response) => {
  try {
    const codigo = code(req.params.codigo);
    if (!codigo) return res.status(400).json({ erro: "Código inválido." });
    const { data, error } = await supabase
      .from("equipamentos")
      .delete()
      .eq("codigo", codigo)
      .select("codigo")
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ erro: "Equipamento não encontrado." });
    logAtiv(req, "excluiu equipamento", codigo);
    res.json({ ok: true });
  } catch (err: any) {
    console.error("[catalog] equip delete:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao excluir equipamento." });
  }
});
