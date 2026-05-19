/**
 * src/routes/osRoutes.ts
 *
 * Backend real do módulo de Manutenção (Equipamentos + Ordens de Serviço).
 * Tudo via Supabase (service_role ignora RLS). As respostas já saem no
 * formato que as telas do frontend consomem (id = codigo, equip = nome...).
 *
 *   GET  /api/equipamentos            lista (filtros ?tipo= &q=)
 *   GET  /api/equipamentos/:codigo    ficha + timeline (derivada das OS)
 *   GET  /api/os                      lista (filtro ?status=)
 *   GET  /api/os/:codigo              detalhe + peças + comentários
 *   POST /api/os                      abre nova OS
 *   POST /api/os/:codigo/fechar       conclui a OS
 *   POST /api/os/:codigo/comentarios  adiciona nota
 *   POST /api/os/:codigo/pecas        registra peça usada
 */
import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";

export const osRouter = Router();

// ------------------------- helpers de data -------------------------
const TZ = "America/Sao_Paulo";

function relativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

function rotuloData(iso: string): string {
  const d = new Date(iso);
  const hm = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: TZ,
  }).format(d);
  const hoje = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ }).format(new Date());
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ }).format(d);
  const ontem = new Intl.DateTimeFormat("pt-BR", { timeZone: TZ })
    .format(new Date(Date.now() - 86400000));
  if (dia === hoje) return `Hoje ${hm}`;
  if (dia === ontem) return `Ontem ${hm}`;
  const dm = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: TZ,
  }).format(d);
  return `${dm} ${hm}`;
}

function diaCurto(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", timeZone: TZ,
  }).format(new Date(iso));
}

// Termo de busca seguro: remove os metacaracteres de filtro do PostgREST
// (vírgula, parênteses, ponto, asterisco, dois-pontos, aspas) -> sem injeção.
function termoSeguro(v: unknown): string {
  return String(v ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s\-/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

// row do banco -> shape que as telas esperam
function mapOs(r: any) {
  const eq = r.equipamentos || {};
  return {
    id: r.codigo,
    codigo: r.codigo,
    equip: eq.nome || "Equipamento",
    equipId: eq.codigo || "",
    tipo: r.tipo,
    prio: r.prioridade,
    status: r.status,
    mec: r.mecanico || "—",
    desc: r.descricao,
    abertaEm: rotuloData(r.aberta_em),
    aberta: relativo(r.aberta_em),
    fechadaEm: r.fechada_em ? rotuloData(r.fechada_em) : null,
  };
}

const OS_SELECT =
  "codigo,tipo,prioridade,status,descricao,mecanico,aberta_em,fechada_em,equipamentos(codigo,nome)";

// =====================================================================
// EQUIPAMENTOS
// =====================================================================
osRouter.get("/equipamentos", async (req: Request, res: Response) => {
  try {
    const { tipo, q } = req.query as { tipo?: string; q?: string };
    let query = supabase
      .from("equipamentos")
      .select("codigo,nome,modelo,ano,placa,tipo,status,custo_mes")
      .order("codigo");
    if (tipo && tipo !== "todos") query = query.eq("tipo", String(tipo).slice(0, 40));
    const qs = termoSeguro(q);
    if (qs) query = query.or(`nome.ilike.%${qs}%,placa.ilike.%${qs}%`);
    const { data, error } = await query;
    if (error) throw error;

    // osAno = nº de OS do equipamento no ano corrente
    const anoIni = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const { data: osDoAno } = await supabase
      .from("ordens_servico")
      .select("equipamento_id,equipamentos(codigo)")
      .gte("aberta_em", anoIni);
    const cont: Record<string, number> = {};
    (osDoAno || []).forEach((o: any) => {
      const c = o.equipamentos?.codigo;
      if (c) cont[c] = (cont[c] || 0) + 1;
    });

    const equipamentos = (data || []).map((e: any) => ({
      id: e.codigo,
      nome: e.nome,
      modelo: e.modelo,
      ano: e.ano,
      placa: e.placa,
      tipo: e.tipo,
      status: e.status,
      custoMes: Number(e.custo_mes) || 0,
      osAno: cont[e.codigo] || 0,
    }));
    res.json({ equipamentos });
  } catch (err: any) {
    console.error("[os] equipamentos:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao carregar equipamentos." });
  }
});

osRouter.get("/equipamentos/:codigo", async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const { data: e, error } = await supabase
      .from("equipamentos")
      .select("*")
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!e) return res.status(404).json({ erro: "Equipamento não encontrado." });

    const { data: oss } = await supabase
      .from("ordens_servico")
      .select("codigo,descricao,status,aberta_em,fechada_em")
      .eq("equipamento_id", e.id)
      .order("aberta_em", { ascending: false })
      .limit(12);

    const history = (oss || []).map((o: any) => ({
      data: diaCurto(o.fechada_em || o.aberta_em),
      titulo: `${o.codigo} ${o.status === "concluida" ? "fechada" : "aberta"}`,
      desc: o.descricao,
      tipo: "os",
    }));
    const anoIni = new Date(new Date().getFullYear(), 0, 1).toISOString();
    const osAno = (oss || []).filter(
      (o: any) => new Date(o.aberta_em).toISOString() >= anoIni
    ).length;
    const ultima = (oss || []).find((o: any) => o.fechada_em);

    res.json({
      equip: {
        id: e.codigo,
        nome: e.nome,
        modelo: e.modelo,
        ano: e.ano,
        placa: e.placa,
        tipo: e.tipo,
        status: e.status,
        custoMes: Number(e.custo_mes) || 0,
        osAno,
        ultimaManut: ultima ? diaCurto(ultima.fechada_em) : "—",
      },
      history,
    });
  } catch (err: any) {
    console.error("[os] equipamento:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao carregar equipamento." });
  }
});

// =====================================================================
// ORDENS DE SERVIÇO
// =====================================================================
osRouter.get("/os", async (req: Request, res: Response) => {
  try {
    const { status } = req.query as { status?: string };
    let query = supabase
      .from("ordens_servico")
      .select(OS_SELECT)
      .order("aberta_em", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ os: (data || []).map(mapOs) });
  } catch (err: any) {
    console.error("[os] lista:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao carregar ordens." });
  }
});

osRouter.get("/os/:codigo", async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const { data: r, error } = await supabase
      .from("ordens_servico")
      .select(OS_SELECT + ",id")
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!r) return res.status(404).json({ erro: "OS não encontrada." });
    const row = r as any;

    const [{ data: pecas }, { data: coment }] = await Promise.all([
      supabase.from("os_pecas").select("sku,nome,quantidade").eq("os_id", row.id),
      supabase
        .from("os_comentarios")
        .select("autor,texto,created_at")
        .eq("os_id", row.id)
        .order("created_at"),
    ]);

    res.json({
      os: mapOs(row),
      pecas: (pecas || []).map((p: any) => ({
        sku: p.sku,
        nome: p.nome,
        qtd: p.quantidade,
      })),
      comentarios: (coment || []).map((c: any) => ({
        autor: c.autor || "—",
        texto: c.texto,
        hora: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit", minute: "2-digit", timeZone: TZ,
        }).format(new Date(c.created_at)),
      })),
      tempo: {
        iniciado: new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit", minute: "2-digit", timeZone: TZ,
        }).format(new Date(row.aberta_em)),
        desdeMin: Math.max(
          0,
          Math.floor((Date.now() - new Date(row.aberta_em).getTime()) / 60000)
        ),
      },
    });
  } catch (err: any) {
    console.error("[os] detalhe:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao carregar a OS." });
  }
});

osRouter.post("/os", async (req: Request, res: Response) => {
  try {
    const equipId = String(req.body?.equipId ?? "").trim();
    const desc = String(req.body?.desc ?? "").trim();
    const tipo = req.body?.tipo === "preventiva" ? "preventiva" : "corretiva";
    const prio = req.body?.prio === "urgente" ? "urgente" : "normal";
    const mec = String(req.body?.mec ?? "Operador").trim() || "Operador";
    if (!equipId || !desc)
      return res.status(400).json({ erro: "Informe equipamento e descrição." });

    const { data: eq } = await supabase
      .from("equipamentos")
      .select("id")
      .eq("codigo", equipId)
      .maybeSingle();
    if (!eq) return res.status(400).json({ erro: "Equipamento inválido." });

    // novo código: maior sufixo numérico + 1
    const { data: todos } = await supabase
      .from("ordens_servico")
      .select("codigo");
    let maxN = 1041;
    (todos || []).forEach((o: any) => {
      const n = parseInt(String(o.codigo).replace(/\D/g, ""), 10);
      if (Number.isFinite(n) && n > maxN) maxN = n;
    });
    const codigo = `OS-${maxN + 1}`;

    const { data, error } = await supabase
      .from("ordens_servico")
      .insert({
        codigo,
        equipamento_id: eq.id,
        tipo,
        prioridade: prio,
        status: "aberta",
        descricao: desc,
        mecanico: mec,
      })
      .select(OS_SELECT)
      .single();
    if (error) throw error;

    // equipamento entra em manutenção quando abre OS corretiva
    if (tipo === "corretiva")
      await supabase
        .from("equipamentos")
        .update({ status: "manutencao" })
        .eq("id", eq.id);

    res.status(201).json({ os: mapOs(data) });
  } catch (err: any) {
    console.error("[os] criar:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao abrir a OS." });
  }
});

osRouter.post("/os/:codigo/fechar", async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const { data, error } = await supabase
      .from("ordens_servico")
      .update({ status: "concluida", fechada_em: new Date().toISOString() })
      .eq("codigo", codigo)
      .select(OS_SELECT)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ erro: "OS não encontrada." });
    res.json({ ok: true, os: mapOs(data) });
  } catch (err: any) {
    console.error("[os] fechar:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao fechar a OS." });
  }
});

osRouter.post("/os/:codigo/comentarios", async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const texto = String(req.body?.texto ?? "").trim();
    const autor = String(req.body?.autor ?? "Operador").trim() || "Operador";
    if (!texto) return res.status(400).json({ erro: "Comentário vazio." });
    const { data: os } = await supabase
      .from("ordens_servico")
      .select("id")
      .eq("codigo", codigo)
      .maybeSingle();
    if (!os) return res.status(404).json({ erro: "OS não encontrada." });
    const { error } = await supabase
      .from("os_comentarios")
      .insert({ os_id: os.id, autor, texto });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error("[os] comentario:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao adicionar nota." });
  }
});

osRouter.post("/os/:codigo/pecas", async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const nome = String(req.body?.nome ?? "").trim();
    const sku = String(req.body?.sku ?? "").trim() || null;
    const qtd = Math.max(1, parseInt(String(req.body?.qtd ?? "1"), 10) || 1);
    if (!nome) return res.status(400).json({ erro: "Informe a peça." });
    const { data: os } = await supabase
      .from("ordens_servico")
      .select("id")
      .eq("codigo", codigo)
      .maybeSingle();
    if (!os) return res.status(404).json({ erro: "OS não encontrada." });
    const { error } = await supabase
      .from("os_pecas")
      .insert({ os_id: os.id, sku, nome, quantidade: qtd });
    if (error) throw error;
    res.status(201).json({ ok: true });
  } catch (err: any) {
    console.error("[os] peca:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao registrar peça." });
  }
});
