/**
 * src/routes/workspaceRoutes.ts
 *
 * GET  /api/workspaces           lista DO PRÓPRIO DONO (admin vê todos)
 * POST /api/workspaces           cria novo workspace (vincula ao dono)
 *
 * Isolamento multi-tenant via `owner_email` na tabela workspaces
 * (migração 15). Token premium-pago/trial carrega o e-mail; senha
 * mestra/admin não tem e-mail (acesso de gestão da operação inteira).
 */
import { Router, Request, Response } from "express";
import { supabase } from "../config/supabase";
import { invalidarDono } from "../workspace";

export const workspaceRouter = Router();

function slugSanitize(v: unknown): string | null {
  const t = String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return t.length >= 2 ? t : null;
}

workspaceRouter.get("/workspaces", async (req: Request, res: Response) => {
  try {
    const userEmail = (req as any).userEmail as string | null;
    let q = supabase
      .from("workspaces")
      .select("id,slug,nome,criado_em,owner_email")
      .order("criado_em");

    // Admin (token sem email) vê tudo. Demais veem só os próprios + sem-dono.
    if (userEmail) {
      // PostgREST: workspace é meu OU sem dono (legado / principal)
      q = q.or(`owner_email.eq.${userEmail},owner_email.is.null`);
    }

    const { data, error } = await q;
    if (error) throw error;
    // Não expõe owner_email pra cliente — só interno.
    res.json({
      workspaces: (data || []).map((w: any) => ({
        id: w.id, slug: w.slug, nome: w.nome, criado_em: w.criado_em,
      })),
    });
  } catch (err: any) {
    console.error("[ws] list:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao carregar workspaces." });
  }
});

workspaceRouter.post("/workspaces", async (req: Request, res: Response) => {
  try {
    const slug = slugSanitize(req.body?.slug);
    const nome = String(req.body?.nome ?? "").trim().slice(0, 80);
    if (!slug || !nome)
      return res
        .status(400)
        .json({ erro: "Informe slug (a-z, 0-9, hífen) e nome." });

    const userEmail = (req as any).userEmail as string | null;

    // Limite anti-abuso: cada e-mail cria no máximo 20 workspaces.
    // Admin (sem email) sem limite.
    if (userEmail) {
      const { count } = await supabase
        .from("workspaces")
        .select("id", { count: "exact", head: true })
        .eq("owner_email", userEmail);
      if ((count || 0) >= 20)
        return res.status(429).json({
          erro: "Limite de 20 workspaces por conta atingido.",
        });
    }

    const { data: existe } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existe)
      return res.status(409).json({ erro: `Já existe workspace "${slug}".` });

    const { data, error } = await supabase
      .from("workspaces")
      .insert({ slug, nome, owner_email: userEmail })
      .select("id,slug,nome")
      .single();
    if (error) throw error;
    invalidarDono(data.id);
    res.status(201).json({ workspace: data });
  } catch (err: any) {
    console.error("[ws] create:", err?.message ?? err);
    res.status(500).json({ erro: "Falha ao criar workspace." });
  }
});
