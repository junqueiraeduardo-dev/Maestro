/**
 * src/workspace.ts — Resolução do workspace ativo a cada requisição.
 *
 * Isolamento multi-tenant (LGPD / segurança):
 *   - Cada workspace tem `owner_email` (migr. 15).
 *   - Usuário autenticado com e-mail no token (trial 't.', premium pago 'p.')
 *     só pode usar workspaces que ele mesmo criou OU que estão sem dono
 *     (legado, workspace "principal").
 *   - Admin/senha mestra (token sem e-mail) passa em todos — perfil de
 *     gestão da operação.
 *   - Cliente envia o ID do workspace ativo no header X-Workspace-Id.
 *   - Se não enviar (primeira sessão), middleware tenta achar o primeiro
 *     workspace do dono; senão cai no workspace "principal".
 */
import { Request, Response, NextFunction } from "express";
import { supabase } from "./config/supabase";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cache: id → owner_email (null se sem dono). Invalida a cada deploy.
const ownerOf = new Map<string, string | null>();
let defaultIdCache: string | null = null;

async function defaultWorkspaceId(): Promise<string | null> {
  if (defaultIdCache) return defaultIdCache;
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", "principal")
    .maybeSingle();
  if (data?.id) {
    defaultIdCache = data.id as string;
    ownerOf.set(defaultIdCache, null); // workspace "principal" não tem dono
  }
  return defaultIdCache;
}

/** Retorna owner_email do workspace; null se workspace sem dono; undefined se inexistente. */
async function donoDoWorkspace(id: string): Promise<string | null | undefined> {
  if (ownerOf.has(id)) return ownerOf.get(id);
  const { data } = await supabase
    .from("workspaces")
    .select("id,owner_email")
    .eq("id", id)
    .maybeSingle();
  if (!data?.id) return undefined; // não existe
  const dono = (data as any).owner_email || null;
  ownerOf.set(id, dono);
  return dono;
}

/**
 * Verifica se o e-mail tem permissão de usar o workspace.
 *   - admin (email null no token) → SEMPRE pode
 *   - workspace sem dono → qualquer um pode (legado: principal)
 *   - workspace com dono → só o próprio dono
 */
function podeUsar(emailUsuario: string | null, donoWs: string | null): boolean {
  if (!emailUsuario) return true;             // admin/senha mestra
  if (!donoWs) return true;                    // legado / workspace principal
  return emailUsuario === donoWs;
}

export async function workspaceMw(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userEmail = (req as any).userEmail as string | null;
  const header = String(req.headers["x-workspace-id"] || "").trim();

  if (header) {
    // Status codes UNIFICADOS pra impedir enumeração de workspaces alheios.
    // Antes: 400 (UUID invál), 404 (não existe), 403 (não é seu) — atacante
    // distinguia UUIDs existentes vs inexistentes via códigos diferentes.
    // Agora: TUDO 403 com a mesma mensagem genérica.
    const acessoNegado = () =>
      res.status(403).json({ erro: "Workspace inválido ou sem acesso." });
    if (!UUID_RE.test(header)) return acessoNegado();
    const dono = await donoDoWorkspace(header);
    if (dono === undefined) return acessoNegado();
    if (!podeUsar(userEmail, dono)) {
      // Permissão extra: trial convidado por link tem workspace_padrao
      // apontando pra workspace do chefe (não é dele, mas tem acesso).
      if (userEmail) {
        const { data: t } = await supabase
          .from("trials")
          .select("workspace_padrao")
          .eq("email", userEmail)
          .maybeSingle();
        if (t?.workspace_padrao !== header) return acessoNegado();
      } else {
        return acessoNegado();
      }
    }
    (req as any).workspaceId = header;
    return next();
  }

  // Sem header → tenta resolver workspace do usuário em ordem de prioridade:
  //   1. Workspace que o trial entrou por CONVITE (`workspace_padrao`)
  //      → quando funcionário usou link do chefe pra se cadastrar
  //   2. Workspace que o usuário é DONO (`owner_email`)
  //      → chefe Premium pago dono do próprio
  //   3. AUTO-CRIA workspace pro Premium pagante (multi-tenant)
  //      → primeiro acesso depois do pagamento, sem precisar de setup manual
  //   4. Workspace "principal" (default sem dono, legado / fallback)
  if (userEmail) {
    // 1) Convite: trial vinculado ao workspace do chefe
    const { data: t } = await supabase
      .from("trials")
      .select("workspace_padrao")
      .eq("email", userEmail)
      .maybeSingle();
    if (t?.workspace_padrao) {
      const dono = await donoDoWorkspace(t.workspace_padrao);
      if (dono !== undefined) {
        (req as any).workspaceId = t.workspace_padrao;
        return next();
      }
    }
    // 2) Dono próprio (chefe Premium)
    const { data } = await supabase
      .from("workspaces")
      .select("id")
      .eq("owner_email", userEmail)
      .order("criado_em")
      .limit(1)
      .maybeSingle();
    if (data?.id) {
      ownerOf.set(data.id as string, userEmail);
      (req as any).workspaceId = data.id as string;
      return next();
    }
    // 3) Sem workspace? Auto-cria pra QUALQUER usuário com e-mail (trial OU
    //    premium pago). Isolamento multi-tenant: cada usuário tem o próprio
    //    workspace na primeira requisição.
    //    Admin (ACCESS_PASSWORD, token sem e-mail) cai em "principal" abaixo.
    const wsAuto = await criarWorkspacePessoal(userEmail);
    if (wsAuto) {
      (req as any).workspaceId = wsAuto;
      // Pra trial: também grava workspace_padrao em `trials` pra próximas
      // requests serem instantâneas (cache + evitar re-tentar create no race).
      const papel = (req as any).papel;
      if (papel === "trial") {
        supabase.from("trials")
          .update({ workspace_padrao: wsAuto })
          .eq("email", userEmail)
          .then(undefined, () => {/* best effort */});
      }
      return next();
    }
  }

  const def = await defaultWorkspaceId();
  if (!def)
    return res.status(503).json({ erro: "Servidor sem workspace padrão." });
  (req as any).workspaceId = def;
  next();
}

/**
 * Cria workspace pessoal para QUALQUER usuário (trial ou premium) na
 * primeira vez que ele acessa — multi-tenant transparente. Idempotente:
 * se já existe (race), retorna o existente. Slug gerado a partir do email.
 */
async function criarWorkspacePessoal(email: string): Promise<string | null> {
  // Slug: parte antes do @, sem caracteres especiais, + sufixo curto pra
  // não colidir (pode existir "joao" de outro cliente). Tamanho cap 32.
  const local = email.split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 20) || "wsp";
  const sufixo = Math.random().toString(36).slice(2, 6);
  const slug = `${local}-${sufixo}`.slice(0, 32);
  const nome = `Workspace de ${email.split("@")[0]}`.slice(0, 80);

  try {
    const { data, error } = await supabase
      .from("workspaces")
      .insert({ slug, nome, owner_email: email })
      .select("id")
      .single();
    if (error) {
      // Se RACE entre 2 requests simultâneos, retoma o que já criou
      const { data: e } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_email", email)
        .limit(1)
        .maybeSingle();
      return e?.id || null;
    }
    ownerOf.set(data.id, email);
    return data.id;
  } catch (e: any) {
    console.warn("[ws] auto-create falhou:", e?.message ?? e);
    return null;
  }
}

export function getWs(req: Request): string {
  return (req as any).workspaceId as string;
}

/** Invalida o cache do dono de um workspace específico (após atualização). */
export function invalidarDono(id: string) {
  ownerOf.delete(id);
}
