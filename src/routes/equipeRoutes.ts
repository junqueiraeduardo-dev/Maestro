/**
 * src/routes/equipeRoutes.ts
 *
 * Gestão de equipe + assinatura, todos requerem auth (montados após
 * `requireAuth` em src/index.ts).
 *
 *   POST   /api/conta/cancelar           Premium cancela própria assinatura
 *                                        (status='cancelada'; chave continua
 *                                        válida até `valido_ate`)
 *   POST   /api/equipe/convite           chefe (admin) gera código de convite
 *   GET    /api/equipe/convite/:codigo   valida convite (cadastro precisa)
 *   POST   /api/equipe/convite/:codigo/revogar   revoga convite
 *   GET    /api/equipe                   lista membros do workspace
 *
 * Modelo de equipe (migração 16):
 *   Chefe Premium pago → workspace dele → gera link de convite →
 *   funcionário clica → cadastra grátis (trial) com `workspace_padrao`
 *   apontando pro workspace do chefe → todas as ações do funcionário
 *   caem no audit log do workspace do chefe.
 */
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { supabase } from "../config/supabase";
import { requireAdmin } from "../auth";
import { getWs, invalidarDono } from "../workspace";

export const equipeRouter = Router();

// ---------------------------------------------------------------------------
// POST /api/conta/cancelar — Premium cancela própria assinatura
//
// Não é "excluir conta" (essa apaga tudo). É CANCELAR: marca como
// cancelada, mas chave continua válida até `valido_ate` (cliente já pagou
// pelo período corrente — direito do consumidor).
//
// Cliente Premium tem email no token (p.{email}.sig). Chefe que entrou
// com ACCESS_PASSWORD não tem email no token → recusado (não há
// assinatura individual a cancelar).
// ---------------------------------------------------------------------------
equipeRouter.post("/conta/cancelar", async (req: Request, res: Response) => {
  try {
    const email = (req as any).userEmail as string | null;
    if (!email)
      return res.status(400).json({
        erro: "Acesso por senha mestra — sem assinatura individual a cancelar.",
      });

    const { data, error } = await supabase
      .from("assinaturas")
      .update({ status: "cancelada" })
      .eq("email", email)
      .eq("status", "ativa")
      .select("valido_ate")
      .maybeSingle();
    if (error) throw error;
    if (!data)
      return res.status(404).json({
        erro: "Não encontrei assinatura ativa pra cancelar.",
      });

    res.json({
      ok: true,
      valido_ate: data.valido_ate,
      msg: "Cancelada. Acesso continua até a data de validade.",
    });
  } catch (err: any) {
    console.error("[equipe] cancelar:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao cancelar assinatura." });
  }
});

// ---------------------------------------------------------------------------
// POST /api/equipe/convite — chefe gera link de convite
//
// Cria um código aleatório de 12 chars hex (~10^14 combinações; rate
// limit + revogação cobrem o resto). Expira em 7 dias por padrão.
// Vinculado ao workspace ativo do chefe.
// ---------------------------------------------------------------------------
equipeRouter.post(
  "/equipe/convite",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const email = (req as any).userEmail as string | null;
      // ADMIN com senha mestra (sem email no token) também pode criar
      // (suporte/manutenção), grava como "admin" no `criado_por`.
      const criadoPor = email || "admin";
      const ws = getWs(req);

      const diasInput = parseInt(String(req.body?.dias ?? "7"), 10);
      const dias = Math.min(30, Math.max(1, Number.isFinite(diasInput) ? diasInput : 7));
      const maxUsosInput = parseInt(String(req.body?.maxUsos ?? "25"), 10);
      const maxUsos = Math.min(100, Math.max(1, Number.isFinite(maxUsosInput) ? maxUsosInput : 25));

      const codigo = crypto.randomBytes(6).toString("hex").toUpperCase();
      const expira = new Date(Date.now() + dias * 86400_000);

      const { data, error } = await supabase
        .from("convites_equipe")
        .insert({
          codigo,
          workspace_id: ws,
          criado_por: criadoPor,
          expira_em: expira.toISOString(),
          max_usos: maxUsos,
        })
        .select("codigo,expira_em,max_usos")
        .single();
      if (error) throw error;
      res.status(201).json({
        codigo: data.codigo,
        expira_em: data.expira_em,
        max_usos: data.max_usos,
      });
    } catch (err: any) {
      console.error("[equipe] criar convite:", err?.message ?? err);
      res.status(500).json({ erro: "Falha ao criar convite." });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/equipe/convite/:codigo — valida convite (público de fato,
// mas montado dentro de /api o que exige auth — então quem cadastra
// precisa estar autenticado primeiro, OU chamamos isso antes do cadastro
// via uma versão PÚBLICA. Pra UX simples, expomos versão pública em
// index.ts.)
// ---------------------------------------------------------------------------
export async function validarConvite(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const codigo = String(req.params.codigo || "").toUpperCase().trim();
    if (!/^[A-F0-9]{12}$/.test(codigo)) {
      res.status(400).json({ erro: "Código inválido." });
      return;
    }
    const { data, error } = await supabase
      .from("convites_equipe")
      .select("codigo,workspace_id,expira_em,max_usos,usos,revogado")
      .eq("codigo", codigo)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.revogado) {
      res.status(404).json({ erro: "Convite não encontrado ou revogado." });
      return;
    }
    if (new Date(data.expira_em).getTime() < Date.now()) {
      res.status(410).json({ erro: "Convite expirou.", expirou: true });
      return;
    }
    if (data.usos >= data.max_usos) {
      res.status(429).json({ erro: "Convite atingiu o limite de usos.", esgotou: true });
      return;
    }
    // Nome do workspace pra UX ("Você vai entrar no workspace XYZ")
    const { data: ws } = await supabase
      .from("workspaces")
      .select("nome")
      .eq("id", data.workspace_id)
      .maybeSingle();
    res.json({
      codigo: data.codigo,
      workspace_nome: ws?.nome || "—",
      restantes: data.max_usos - data.usos,
    });
  } catch (err: any) {
    console.error("[equipe] validar convite:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao validar convite." });
  }
}

// ---------------------------------------------------------------------------
// POST /api/equipe/convite/:codigo/revogar — chefe cancela convite ativo
// ---------------------------------------------------------------------------
equipeRouter.post(
  "/equipe/convite/:codigo/revogar",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const codigo = String(req.params.codigo || "").toUpperCase().trim();
      const { error } = await supabase
        .from("convites_equipe")
        .update({ revogado: true })
        .eq("codigo", codigo)
        .eq("workspace_id", getWs(req));
      if (error) throw error;
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[equipe] revogar:", err?.message ?? err);
      res.status(500).json({ erro: "Falha ao revogar convite." });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/equipe — lista membros (trials vinculados) + convites ativos
// ---------------------------------------------------------------------------
equipeRouter.get(
  "/equipe",
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const ws = getWs(req);
      const [members, convs] = await Promise.all([
        supabase
          .from("trials")
          .select("email,expires_at")
          .eq("workspace_padrao", ws)
          .order("expires_at", { ascending: false })
          .limit(100),
        supabase
          .from("convites_equipe")
          .select("codigo,expira_em,max_usos,usos,revogado,criado_em")
          .eq("workspace_id", ws)
          .order("criado_em", { ascending: false })
          .limit(20),
      ]);
      if (members.error) throw members.error;
      if (convs.error) throw convs.error;
      res.json({
        membros: (members.data || []).map((m: any) => ({
          email: m.email,
          ate: m.expires_at,
        })),
        convites: (convs.data || []).map((c: any) => ({
          codigo: c.codigo,
          expira: c.expira_em,
          maxUsos: c.max_usos,
          usos: c.usos,
          revogado: c.revogado,
          ativo: !c.revogado
            && new Date(c.expira_em).getTime() > Date.now()
            && c.usos < c.max_usos,
        })),
      });
    } catch (err: any) {
      console.error("[equipe] lista:", err?.message ?? err);
      res.status(500).json({ erro: "Falha ao listar equipe." });
    }
  }
);
