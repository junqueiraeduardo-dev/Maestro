/**
 * src/routes/exportRoutes.ts
 *
 * Exporta dados do workspace em CSV (peças, equipamentos, OS, movimentos).
 * Formato pronto pra Excel BR:
 *   - BOM UTF-8 no início (acentuação correta)
 *   - separador ';'  (Excel pt-BR usa ',' como decimal)
 *   - CRLF entre linhas
 *   - aspas duplas envolvem campos com ';', '"' ou quebra de linha
 *
 * Caps generosos mas finitos: protegem o Supabase Free de varredura
 * massiva e mantêm o download em segundos.
 */
import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { getWs } from "../workspace";

export const exportRouter = Router();

const TZ = "America/Sao_Paulo";

// Formato BR "dd/mm/aaaa hh:mm" — Excel reconhece como data se a coluna estiver formatada.
function dataBR(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
      timeZone: TZ,
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Escapa um valor CSV. Strings que contêm ; " ou nova linha viram "...",
 * com aspas duplicadas. Valores nulos/undefined viram string vazia.
 * Número segue como está (Excel BR usa vírgula decimal — convertemos).
 */
function csvCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number") {
    // Excel BR: decimal com vírgula. Não envolvemos em aspas — fica numérico.
    return String(v).replace(".", ",");
  }
  const s = String(v);
  if (/[;"\r\n]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function csvLine(cells: unknown[]): string {
  return cells.map(csvCell).join(";") + "\r\n";
}

function sendCsv(res: Response, filename: string, body: string) {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, "_");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${safe}"`);
  // BOM UTF-8 — Excel BR sem isso lê "Ã§" no lugar de "ç".
  res.send("﻿" + body);
}

function hoje(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

// ---------------------------------------------------------------------------
// PEÇAS — uma linha por peça do workspace.
// ---------------------------------------------------------------------------
exportRouter.get("/export/pecas.csv", async (req: Request, res: Response) => {
  try {
    const ws = getWs(req);
    const { data, error } = await supabase
      .from("estoque_pecas")
      .select("sku,nome,quantidade,localizacao_fisica,categoria,sinonimos,perfil,preco,ponto_reposicao,segmento,tutorial_url")
      .eq("workspace_id", ws)
      .order("nome")
      .limit(10000);
    if (error) throw error;

    let csv = csvLine([
      "SKU", "Nome", "Quantidade", "Localização", "Categoria",
      "Sinônimos", "Perfil", "Preço (R$)", "Ponto de Reposição",
      "Segmento", "Tutorial",
    ]);
    (data || []).forEach((p: any) => {
      csv += csvLine([
        p.sku, p.nome, p.quantidade, p.localizacao_fisica, p.categoria,
        p.sinonimos, p.perfil,
        p.preco != null ? Number(p.preco) : "",
        p.ponto_reposicao,
        p.segmento, p.tutorial_url,
      ]);
    });
    sendCsv(res, `maestro-pecas-${hoje()}.csv`, csv);
  } catch (err: any) {
    console.error("[export] pecas:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao exportar peças." });
  }
});

// ---------------------------------------------------------------------------
// EQUIPAMENTOS — uma linha por equipamento + nº de OS no ano corrente.
// ---------------------------------------------------------------------------
exportRouter.get("/export/equipamentos.csv", async (req: Request, res: Response) => {
  try {
    const ws = getWs(req);
    const { data, error } = await supabase
      .from("equipamentos")
      .select("codigo,nome,modelo,ano,placa,tipo,status,custo_mes,perfil")
      .eq("workspace_id", ws)
      .order("codigo")
      .limit(10000);
    if (error) throw error;

    // contagem OS do ano por equipamento (igual ao /api/equipamentos)
    const anoIni = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: osAno } = await supabase
      .from("ordens_servico")
      .select("equipamentos(codigo)")
      .eq("workspace_id", ws)
      .gte("aberta_em", anoIni);
    const cont: Record<string, number> = {};
    (osAno || []).forEach((o: any) => {
      const c = o.equipamentos?.codigo;
      if (c) cont[c] = (cont[c] || 0) + 1;
    });

    let csv = csvLine([
      "Código", "Nome", "Modelo", "Ano", "Placa", "Tipo",
      "Status", "Custo/mês (R$)", "Perfil", "OS no ano",
    ]);
    (data || []).forEach((e: any) => {
      csv += csvLine([
        e.codigo, e.nome, e.modelo, e.ano, e.placa, e.tipo,
        e.status,
        e.custo_mes != null ? Number(e.custo_mes) : "",
        e.perfil,
        cont[e.codigo] || 0,
      ]);
    });
    sendCsv(res, `maestro-equipamentos-${hoje()}.csv`, csv);
  } catch (err: any) {
    console.error("[export] equipamentos:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao exportar equipamentos." });
  }
});

// ---------------------------------------------------------------------------
// OS — uma linha por ordem de serviço. Aceita ?status= e ?desde=YYYY-MM-DD.
// ---------------------------------------------------------------------------
exportRouter.get("/export/os.csv", async (req: Request, res: Response) => {
  try {
    const ws = getWs(req);
    let query = supabase
      .from("ordens_servico")
      .select("codigo,tipo,prioridade,status,descricao,mecanico,aberta_em,fechada_em,equipamentos(codigo,nome)")
      .eq("workspace_id", ws)
      .order("aberta_em", { ascending: false })
      .limit(10000);

    const st = String(req.query.status || "").trim();
    if (st === "aberta" || st === "concluida") query = query.eq("status", st);

    const desde = String(req.query.desde || "").trim();
    // YYYY-MM-DD — Date.parse aceita isso como UTC. Suficiente pra filtro grosso.
    if (/^\d{4}-\d{2}-\d{2}$/.test(desde)) {
      query = query.gte("aberta_em", `${desde}T00:00:00-03:00`);
    }

    const { data, error } = await query;
    if (error) throw error;

    let csv = csvLine([
      "OS", "Equipamento (código)", "Equipamento", "Tipo", "Prioridade",
      "Status", "Mecânico", "Aberta em", "Fechada em", "Descrição",
    ]);
    (data || []).forEach((r: any) => {
      const eq = r.equipamentos || {};
      csv += csvLine([
        r.codigo, eq.codigo, eq.nome, r.tipo, r.prioridade,
        r.status, r.mecanico,
        dataBR(r.aberta_em), dataBR(r.fechada_em),
        r.descricao,
      ]);
    });
    sendCsv(res, `maestro-os-${hoje()}.csv`, csv);
  } catch (err: any) {
    console.error("[export] os:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao exportar OS." });
  }
});

// ---------------------------------------------------------------------------
// MOVIMENTOS — baixas via voz (historico_servicos). Cada peça vira uma linha.
// ---------------------------------------------------------------------------
exportRouter.get("/export/movimentos.csv", async (req: Request, res: Response) => {
  try {
    const ws = getWs(req);
    const { data, error } = await supabase
      .from("historico_servicos")
      .select("descricao_servico,operador,pecas_utilizadas,created_at")
      .eq("workspace_id", ws)
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw error;

    let csv = csvLine([
      "Data", "Operador", "Descrição", "SKU", "Quantidade",
    ]);
    (data || []).forEach((h: any) => {
      const pecas = Array.isArray(h.pecas_utilizadas) ? h.pecas_utilizadas : [];
      if (pecas.length === 0) {
        csv += csvLine([dataBR(h.created_at), h.operador, h.descricao_servico, "", ""]);
        return;
      }
      pecas.forEach((p: any) => {
        csv += csvLine([
          dataBR(h.created_at), h.operador, h.descricao_servico,
          p?.sku ?? "", p?.qtd ?? p?.quantidade ?? "",
        ]);
      });
    });
    sendCsv(res, `maestro-movimentos-${hoje()}.csv`, csv);
  } catch (err: any) {
    console.error("[export] movimentos:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao exportar movimentos." });
  }
});
