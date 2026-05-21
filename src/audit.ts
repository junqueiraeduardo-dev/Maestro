/**
 * src/audit.ts — Log de atividade ("o que cada um fez").
 *
 * O autor vem do header X-Ator (nome/e-mail do app). Atenção: é
 * informado pelo cliente, então é um registro de equipe (boa-fé), não
 * uma prova forte de autoria. O controle FORTE é o papel do token
 * (pai vs filho), validado no servidor.
 */
import { Request } from "express";
import { supabase } from "./config/supabase";

export function logAtiv(req: Request, acao: string, alvo: string): void {
  const ator = String(req.headers["x-ator"] ?? "—")
    .toString()
    .slice(0, 120);
  const papel = (req as any).papel || "?";
  const workspace_id = (req as any).workspaceId || null;
  // fire-and-forget: nunca atrapalha a resposta principal
  supabase
    .from("atividade")
    .insert({
      ator,
      papel,
      workspace_id,
      acao: String(acao).slice(0, 60),
      alvo: String(alvo).slice(0, 160),
    })
    .then(undefined, (e: any) =>
      console.warn("[audit]", e?.message ?? e)
    );
}
