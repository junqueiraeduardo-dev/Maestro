/**
 * src/routes/importRoutes.ts
 *
 * Importação em lote (peças e equipamentos) a partir de planilha.
 *
 * O frontend faz o parse do CSV no navegador (zero dependência server)
 * e POSTa um array de objetos. Aqui validamos cada linha com a MESMA
 * regra do POST individual, inserimos em lote e devolvemos um resumo
 * { criados, duplicados, erros: [...] } para a UI exibir.
 *
 * Caps:
 *   - Máx 500 linhas por requisição (protege Supabase Free e tempo do request)
 *   - Mesmos limites de tamanho/caracter dos endpoints normais
 *
 * Não usa transação: cada linha é processada isolada. Se uma falha,
 * as outras seguem — o usuário recebe o motivo linha a linha.
 */
import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { logAtiv } from "../audit";
import { getWs } from "../workspace";

export const importRouter = Router();

const MAX_ITENS = 500;
const STATUS_EQUIP = ["operacional", "manutencao", "parado"] as const;
const SEGMENTOS = ["mro", "frota"] as const;

// ----------------------- sanitização (espelha catalogRoutes) -----------------------
function s(v: unknown, max = 120): string | null {
  if (v == null) return null;
  const t = String(v).trim().slice(0, max);
  return t.length ? t : null;
}
function code(v: unknown): string | null {
  const t = String(v ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  return t.length >= 2 && t.length <= 32 ? t : null;
}
function intIn(v: unknown, def: number, min: number, max: number): number {
  const n = parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function precoNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number"
    ? v
    : parseFloat(String(v).replace(",", ".").replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 99_999_999) return null;
  return Math.round(n * 100) / 100;
}
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

// ---------------------------------------------------------------------------
// POST /api/import/pecas   body: { itens: [{ sku, nome, quantidade, ... }] }
// ---------------------------------------------------------------------------
importRouter.post("/import/pecas", async (req: Request, res: Response) => {
  try {
    const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
    if (itens.length === 0)
      return res.status(400).json({ erro: "Nenhuma linha pra importar." });
    if (itens.length > MAX_ITENS)
      return res.status(400).json({ erro: `Importe no máximo ${MAX_ITENS} linhas por vez.` });

    const ws = getWs(req);

    // SKUs já existentes neste workspace (evita N queries)
    const { data: existentes } = await supabase
      .from("estoque_pecas")
      .select("sku")
      .eq("workspace_id", ws);
    const jaExiste = new Set((existentes || []).map((r: any) => r.sku));

    let criados = 0;
    let duplicados = 0;
    const erros: Array<{ linha: number; motivo: string }> = [];
    const novos: any[] = [];
    const skusDessaImport = new Set<string>();

    itens.forEach((raw: any, i: number) => {
      const sku = code(raw?.sku);
      const nome = s(raw?.nome, 140);
      if (!sku || !nome) {
        erros.push({ linha: i + 2, motivo: "SKU (A-Z0-9-) e nome são obrigatórios." });
        return;
      }
      if (jaExiste.has(sku) || skusDessaImport.has(sku)) {
        duplicados++;
        return;
      }
      skusDessaImport.add(sku);

      const segmento = SEGMENTOS.includes(raw?.segmento) ? raw.segmento : null;
      novos.push({
        workspace_id: ws,
        sku, nome,
        quantidade: intIn(raw?.quantidade, 0, 0, 1_000_000),
        localizacao_fisica: s(raw?.localizacao_fisica, 60),
        sinonimos: s(raw?.sinonimos, 240) || "",
        categoria: s(raw?.categoria, 60),
        tutorial_url: url(raw?.tutorial_url),
        ponto_reposicao: raw?.ponto_reposicao != null && raw?.ponto_reposicao !== ""
          ? intIn(raw.ponto_reposicao, 0, 0, 1_000_000)
          : null,
        perfil: s(raw?.perfil, 60),
        preco: precoNum(raw?.preco),
        segmento,
      });
    });

    if (novos.length > 0) {
      const { error } = await supabase.from("estoque_pecas").insert(novos);
      if (error) {
        // erro de banco em lote — devolve mensagem genérica + count
        console.error("[import] pecas insert:", error.message);
        return res.status(500).json({
          erro: "Falha ao inserir peças.",
          criados: 0, duplicados, erros,
        });
      }
      criados = novos.length;
      logAtiv(req, "importou peças", `${criados} item(ns)`);
    }

    res.json({ criados, duplicados, erros, total: itens.length });
  } catch (err: any) {
    console.error("[import] pecas:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao importar peças." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/import/equipamentos   body: { itens: [{ codigo, nome, ... }] }
// ---------------------------------------------------------------------------
importRouter.post("/import/equipamentos", async (req: Request, res: Response) => {
  try {
    const itens = Array.isArray(req.body?.itens) ? req.body.itens : [];
    if (itens.length === 0)
      return res.status(400).json({ erro: "Nenhuma linha pra importar." });
    if (itens.length > MAX_ITENS)
      return res.status(400).json({ erro: `Importe no máximo ${MAX_ITENS} linhas por vez.` });

    const ws = getWs(req);

    const { data: existentes } = await supabase
      .from("equipamentos")
      .select("codigo")
      .eq("workspace_id", ws);
    const jaExiste = new Set((existentes || []).map((r: any) => r.codigo));

    let criados = 0;
    let duplicados = 0;
    const erros: Array<{ linha: number; motivo: string }> = [];
    const novos: any[] = [];
    const codDessaImport = new Set<string>();

    itens.forEach((raw: any, i: number) => {
      const codigo = code(raw?.codigo);
      const nome = s(raw?.nome, 120);
      if (!codigo || !nome) {
        erros.push({ linha: i + 2, motivo: "Código (A-Z0-9-) e nome são obrigatórios." });
        return;
      }
      if (jaExiste.has(codigo) || codDessaImport.has(codigo)) {
        duplicados++;
        return;
      }
      codDessaImport.add(codigo);

      const status = STATUS_EQUIP.includes(raw?.status) ? raw.status : "operacional";
      novos.push({
        workspace_id: ws,
        codigo, nome,
        modelo: s(raw?.modelo, 80),
        ano: raw?.ano ? intIn(raw.ano, 0, 1900, 2100) : null,
        placa: s(raw?.placa, 16),
        tipo: s(raw?.tipo, 40),
        perfil: s(raw?.perfil, 60),
        status,
      });
    });

    if (novos.length > 0) {
      const { error } = await supabase.from("equipamentos").insert(novos);
      if (error) {
        console.error("[import] equipamentos insert:", error.message);
        return res.status(500).json({
          erro: "Falha ao inserir equipamentos.",
          criados: 0, duplicados, erros,
        });
      }
      criados = novos.length;
      logAtiv(req, "importou equipamentos", `${criados} item(ns)`);
    }

    res.json({ criados, duplicados, erros, total: itens.length });
  } catch (err: any) {
    console.error("[import] equipamentos:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao importar equipamentos." });
  }
});
