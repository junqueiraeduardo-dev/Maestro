/**
 * src/auth.ts — Planos de acesso (Premium por senha + Teste grátis).
 *
 * Stateless: o servidor não guarda sessão.
 *  - PREMIUM: cliente entra com a senha do plano (env ACCESS_PASSWORD) e
 *    recebe um token HMAC determinístico, sem expiração.
 *  - TESTE GRÁTIS: cliente pede 1 trial por e-mail; o servidor grava em
 *    `trials` (Supabase) a data de expiração e devolve um token ASSINADO
 *    que carrega `exp`. O limite de tempo é validado no servidor a cada
 *    requisição — não dá pra estender limpando o navegador.
 *
 * Comparações constant-time. Sem ACCESS_PASSWORD => FALHA FECHADO.
 */
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { supabase } from "./config/supabase";
import { validarChaveAssinatura } from "./pay";
import { enviarEmail } from "./mailer";

export const TRIAL_DIAS = 30;

/**
 * Validação de e-mail estrita. A regex permissiva /.+@.+\..+/ aceitava
 * vírgula, ponto-e-vírgula, parêntese, pipe etc. — chars que viram
 * separadores no filtro `.or()` do PostgREST. Email com vírgula podia
 * vazar dados de outro usuário cujo e-mail fosse o "outro lado" do split.
 *
 * Esta regex aceita só a forma comum (RFC 5322 simplificado):
 *   - local: letras, dígitos, e os símbolos seguros . _ % + -
 *   - @ obrigatório
 *   - domínio: letras, dígitos, hífen, pontos
 *   - TLD com >= 2 letras
 * Bloqueia: vírgula, ponto-e-vírgula, pipe, parêntese, aspas, espaço.
 */
export function emailValido(s: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(s)
    && s.length <= 160;
}

function sha256(s: string): Buffer {
  return crypto.createHash("sha256").update(s, "utf8").digest();
}
function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function hmacHex(key: string, msg: string): string {
  return crypto.createHmac("sha256", key).update(msg).digest("hex");
}
function b64url(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function unb64url(s: string): string {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf8"
  );
}

// ---------------------------------------------------------------------------
// Hash de senha do CLIENTE (scrypt — built-in, sem dependência externa).
//
// VERSÕES (formato armazenado):
//   v1 (legado) "saltHex:hashHex"        scrypt N=2^14 (default), sem pepper
//   v2 (atual)  "v2:saltHex:hashHex"     scrypt N=2^16, com PASSWORD_PEPPER
//
// PEPPER: segredo extra concatenado à senha antes do scrypt, vindo só do
// env (NÃO do DB). Defesa adicional contra leak de banco: atacante com o
// DB ainda precisa do env do Render pra brute-force ser efetivo.
//
// MIGRAÇÃO: verSenha aceita ambos formatos. Quando user loga com sucesso
// em hash v1, entrarHandler re-hash em v2 (migração lazy, transparente).
//
// CUSTO: scrypt N=2^16 ~ 50-100ms/hash. Aceitável: cadastro/login têm rate
// limit (3-6 req/min/IP). DoS via hashing custaria mais ao atacante que ao
// servidor.
// ---------------------------------------------------------------------------
const SCRYPT_V2_N = 1 << 16;                          // 65536
const SCRYPT_V2_MAXMEM = 128 * 1024 * 1024;           // 128 MB (default 32 não basta pra N=2^16)
const PEPPER = process.env.PASSWORD_PEPPER || "";     // env opcional; sem ele
                                                       // a defesa cai pra "só" v2 (N maior)

function hashSenhaV2(senha: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(senha + PEPPER, salt, 32, {
    N: SCRYPT_V2_N, maxmem: SCRYPT_V2_MAXMEM,
  });
  return `v2:${salt.toString("hex")}:${hash.toString("hex")}`;
}

function hashSenha(senha: string): string {
  return hashSenhaV2(senha);
}

function verSenha(senha: string, armazenado: string | null): boolean {
  if (!armazenado) return false;
  try {
    // v2: scrypt N=2^16 + pepper
    if (armazenado.startsWith("v2:")) {
      const [, saltHex, wantHex] = armazenado.split(":");
      if (!saltHex || !wantHex) return false;
      const have = crypto.scryptSync(senha + PEPPER, Buffer.from(saltHex, "hex"), 32, {
        N: SCRYPT_V2_N, maxmem: SCRYPT_V2_MAXMEM,
      });
      const want = Buffer.from(wantHex, "hex");
      return have.length === want.length && crypto.timingSafeEqual(have, want);
    }
    // v1 (legado): scrypt default, sem pepper
    const [saltHex, wantHex] = armazenado.split(":");
    if (!saltHex || !wantHex) return false;
    const have = crypto.scryptSync(senha, Buffer.from(saltHex, "hex"), 32);
    const want = Buffer.from(wantHex, "hex");
    return have.length === want.length && crypto.timingSafeEqual(have, want);
  } catch {
    return false;
  }
}

/** True se hash é v1 (precisa migrar pra v2 no próximo login bem-sucedido). */
function precisaMigrarHash(armazenado: string | null): boolean {
  return !!armazenado && !armazenado.startsWith("v2:");
}

/** Token Premium (sem expiração) — derivado da senha do plano. */
function premiumToken(pw: string): string {
  return hmacHex(pw, "maestro-access-v1");
}

/** Token do "pai" (admin) — derivado da senha de administrador. */
function adminToken(pwA: string): string {
  return hmacHex(pwA, "maestro-admin-v1");
}

/**
 * Papel do token:
 *  'pai'   = admin (senha de admin OU, se não houver admin configurado,
 *            a própria senha do plano vira dona)
 *  'filho' = usuário comum do plano
 *  'trial' = teste grátis
 *  null    = inválido
 */
function papelDoToken(token: string): "pai" | "filho" | "trial" | null {
  const pw = process.env.ACCESS_PASSWORD || "";
  const pwA = process.env.ACCESS_PASSWORD_ADMIN || "";
  const eq = (a: string, b: string) =>
    safeEqual(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
  if (pwA && eq(token, adminToken(pwA))) return "pai";
  if (pw && eq(token, premiumToken(pw))) return pwA ? "filho" : "pai";
  // assinatura paga (chave por e-mail): token assinado com expiração
  if (pw && token.startsWith("p.") && readSigned(pw, token, "p", "premium"))
    return "pai";
  if (pw && token.startsWith("t.") && readTrial(pw, token)) return "trial";
  return null;
}

/** Token assinado genérico: <prefix>.<payload b64url>.<hmac>. Carrega exp. */
function makeSignedToken(
  pw: string,
  prefix: string,
  planTag: string,
  email: string,
  expMs: number
): string {
  const payload = b64url(JSON.stringify({ e: email, exp: expMs, p: planTag }));
  return `${prefix}.${payload}.${hmacHex(pw, payload)}`;
}

/** Valida assinatura+expiração. Retorna payload ou null. */
function readSigned(
  pw: string,
  token: string,
  prefix: string,
  planTag: string
): { e: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== prefix) return null;
  const sig = hmacHex(pw, parts[1]);
  if (!safeEqual(Buffer.from(parts[2], "utf8"), Buffer.from(sig, "utf8")))
    return null;
  try {
    const p = JSON.parse(unb64url(parts[1]));
    if (
      p &&
      p.p === planTag &&
      typeof p.exp === "number" &&
      p.exp > Date.now()
    )
      return p;
  } catch {
    /* payload inválido */
  }
  return null;
}

function makeTrialToken(pw: string, email: string, expMs: number): string {
  return makeSignedToken(pw, "t", "trial", email, expMs);
}
function readTrial(pw: string, token: string) {
  return readSigned(pw, token, "t", "trial");
}

// ---------------------------------------------------------------------------
// PREMIUM — senha do plano
// ---------------------------------------------------------------------------
export async function loginHandler(req: Request, res: Response) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw)
    return res.status(503).json({ erro: "Servidor sem ACCESS_PASSWORD." });
  const pwA = process.env.ACCESS_PASSWORD_ADMIN || "";
  const senha = String(req.body?.senha ?? "");
  if (!senha) return res.status(401).json({ erro: "Senha incorreta." });

  // 1) Senha de administrador (pai)
  if (pwA && safeEqual(sha256(senha), sha256(pwA)))
    return res.json({ token: adminToken(pwA), plano: "premium", role: "pai" });

  // 2) Senha mestra do plano (equipe / dono único)
  if (safeEqual(sha256(senha), sha256(pw)))
    return res.json({
      token: premiumToken(pw),
      plano: "premium",
      role: pwA ? "filho" : "pai",
    });

  // 3) Chave de assinatura paga (recebida por e-mail) — expira na renovação
  const exp = await validarChaveAssinatura(senha);
  if (exp)
    return res.json({
      token: makeSignedToken(pw, "p", "premium", "", exp),
      plano: "premium",
      role: "pai",
    });

  return res.status(401).json({ erro: "Senha incorreta." });
}

// ---------------------------------------------------------------------------
// TESTE GRÁTIS — 1 por e-mail, expira em TRIAL_DIAS
// ---------------------------------------------------------------------------
// CADASTRAR: cria conta com senha PRÓPRIA + inicia teste grátis.
// (O endpoint continua sendo /api/trial por compat com o cliente.)
export async function trialHandler(req: Request, res: Response) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw)
    return res.status(503).json({ erro: "Servidor sem ACCESS_PASSWORD." });

  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
  const senha = String(req.body?.senha ?? "");
  // Nome do cliente — persistido no banco pra aparecer em QUALQUER aparelho
  // após login (antes vivia só no localStorage de quem cadastrou). Opcional.
  const nome = String(req.body?.nome ?? "").trim().slice(0, 80);
  // Código de convite OPCIONAL: se vier, vincula o trial ao workspace do
  // chefe que criou o convite. Senão, cai no workspace "principal".
  const conviteCodigo = String(req.body?.convite ?? "")
    .toUpperCase()
    .trim();

  if (!email || !emailValido(email))
    return res.status(400).json({ erro: "Informe um e-mail válido." });
  if (!senha || senha.length < 6)
    return res.status(400).json({ erro: "Senha precisa ter pelo menos 6 caracteres." });

  try {
    // Valida convite ANTES de qualquer escrita (se foi passado).
    // Retorna workspace_id do convite ou null.
    let workspaceDoConvite: string | null = null;
    if (conviteCodigo) {
      if (!/^[A-F0-9]{12}$/.test(conviteCodigo))
        return res.status(400).json({ erro: "Código de convite inválido." });
      const { data: conv } = await supabase
        .from("convites_equipe")
        .select("workspace_id,expira_em,max_usos,usos,revogado")
        .eq("codigo", conviteCodigo)
        .maybeSingle();
      if (!conv || conv.revogado)
        return res.status(404).json({ erro: "Convite não encontrado." });
      if (new Date(conv.expira_em).getTime() < Date.now())
        return res.status(410).json({ erro: "Convite expirou.", expirou: true });
      if (conv.usos >= conv.max_usos)
        return res.status(429).json({ erro: "Convite atingiu o limite de usos." });
      workspaceDoConvite = conv.workspace_id;
    }

    const { data: ex } = await supabase
      .from("trials")
      .select("expires_at, senha_hash")
      .eq("email", email)
      .maybeSingle();

    let expMs: number;
    if (ex) {
      // Já existe: se já tem senha, mande para "Entrar" (não recadastra).
      if (ex.senha_hash)
        return res.status(409).json({
          erro: "Este e-mail já tem conta. Use 'Entrar' com a sua senha.",
          jaCadastrado: true,
        });
      // Trial antigo sem senha (legado): define a senha agora.
      expMs = new Date(ex.expires_at).getTime();
      if (expMs <= Date.now())
        return res.status(403).json({
          erro: "Seu teste grátis expirou. Assine o Premium para continuar.",
          expirado: true,
        });
      const patch: any = { senha_hash: hashSenha(senha) };
      if (workspaceDoConvite) patch.workspace_padrao = workspaceDoConvite;
      const { error: e2 } = await supabase
        .from("trials")
        .update(patch)
        .eq("email", email);
      if (e2) throw e2;
    } else {
      expMs = Date.now() + TRIAL_DIAS * 86400_000;
      const { error } = await supabase.from("trials").insert({
        email,
        senha_hash: hashSenha(senha),
        expires_at: new Date(expMs).toISOString(),
        workspace_padrao: workspaceDoConvite,
      });
      if (error) throw error;
    }

    // Nome: gravação best-effort e TOLERANTE — se a coluna `nome` ainda não
    // existir (migração não rodada), o erro é ignorado e o cadastro segue.
    // Quando a coluna existir, passa a gravar sozinho. Não bloqueia nada.
    if (nome) {
      supabase.from("trials").update({ nome }).eq("email", email)
        .then(undefined, (e: any) => console.warn("[trial] grava nome:", e?.message ?? e));
    }

    // Incrementa contador do convite (best-effort; falha não bloqueia cadastro)
    if (conviteCodigo) {
      supabase.rpc("incrementa_convite", { p_codigo: conviteCodigo })
        .then(undefined, (e: any) => console.warn("[trial] incrementa convite:", e?.message ?? e));
    }

    const dias = Math.max(1, Math.ceil((expMs - Date.now()) / 86400_000));
    return res.json({
      token: makeTrialToken(pw, email, expMs),
      plano: "trial",
      expMs,
      dias,
      nome: nome || null,
    });
  } catch (err: any) {
    console.error("[auth] cadastrar:", err?.message ?? err);
    return res.status(500).json({ erro: "Falha ao cadastrar." });
  }
}

// Hash dummy fixo — usado quando email não existe pra que o scrypt rode
// IGUAL nos dois casos (existe vs não existe). Defesa contra timing attack
// que enumera emails (atacante mede tempo: rápido = não existe, lento = existe).
// Gerado uma única vez na boot via senha aleatória.
const DUMMY_HASH = hashSenha(crypto.randomBytes(32).toString("hex"));

// ENTRAR: login por email + senha pessoal (a que o cliente criou).
// Retorna o token do trial se ainda dentro do prazo.
//
// CONSTANT-TIME por design:
//  - Sempre faz a query no Supabase
//  - Sempre roda scrypt (DUMMY_HASH se usuário não existe)
//  - Mensagem genérica "E-mail ou senha incorretos" pros 2 casos de falha
//    (não vaza se foi email-não-existe vs senha-errada)
//
// Defende contra: CVE-2025-* style username enumeration via timing
// (Mautic, Sync-in, AWS IAM e outros tiveram isso em 2025).
export async function entrarHandler(req: Request, res: Response) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw)
    return res.status(503).json({ erro: "Servidor sem ACCESS_PASSWORD." });

  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
  const senha = String(req.body?.senha ?? "");
  if (!email || !senha)
    return res.status(400).json({ erro: "Informe e-mail e senha." });

  try {
    const { data: u } = await supabase
      .from("trials")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    // SEMPRE roda scrypt: existe → contra hash real; não existe → contra dummy.
    // Tempo total ~igual nos 2 caminhos → atacante não distingue por timing.
    const hashAlvo = u && u.senha_hash ? u.senha_hash : DUMMY_HASH;
    const senhaOk = verSenha(senha, hashAlvo);

    if (!u || !u.senha_hash || !senhaOk) {
      // Mensagem genérica: não revela se foi email-inexistente ou senha-errada.
      // (O flag `semConta` antigo virou só uma sugestão de UX no front; sem
      // info do servidor, o front oferece "cadastre-se" como opção neutra.)
      return res.status(401).json({ erro: "E-mail ou senha incorretos." });
    }

    // MIGRAÇÃO LAZY v1→v2: usuário acabou de provar que sabe a senha.
    // Aproveita pra re-hash em v2 (scrypt N=2^16 + pepper). Best-effort
    // (não bloqueia login se falhar). Próximos logins já são v2.
    if (precisaMigrarHash(u.senha_hash)) {
      const novoHash = hashSenhaV2(senha);
      supabase.from("trials").update({ senha_hash: novoHash }).eq("email", email)
        .then(undefined, (e: any) =>
          console.warn("[auth] migração v1→v2:", e?.message ?? e));
    }

    const expMs = new Date(u.expires_at).getTime();
    if (expMs <= Date.now())
      return res.status(403).json({
        erro: "Seu teste grátis expirou. Use a chave Premium.",
        expirado: true,
      });

    const dias = Math.max(1, Math.ceil((expMs - Date.now()) / 86400_000));
    return res.json({
      token: makeTrialToken(pw, email, expMs),
      plano: "trial",
      expMs,
      dias,
      nome: (u as any).nome ?? null,
    });
  } catch (err: any) {
    console.error("[auth] entrar:", err?.message ?? err);
    return res.status(500).json({ erro: "Falha ao entrar." });
  }
}

// ---------------------------------------------------------------------------
// RESET DE SENHA — "esqueci minha senha" via link mágico por e-mail.
//
// Token STATELESS de USO ÚNICO, sem tabela nova: a chave do HMAC inclui o
// `senha_hash` ATUAL do usuário. Ao redefinir a senha, o hash muda e o mesmo
// link deixa de validar (técnica do password-reset token do Django).
// Validade curta embutida no payload (`exp`).
// ---------------------------------------------------------------------------
const RESET_TTL_MS = 30 * 60_000; // 30 minutos

/** Chave do HMAC ligada ao hash atual: trocar a senha invalida links antigos. */
function resetKey(pw: string, senhaHash: string): string {
  return `${pw}|reset|${sha256(senhaHash).toString("hex")}`;
}

function makeResetToken(
  pw: string,
  email: string,
  senhaHash: string,
  expMs: number
): string {
  const payload = b64url(JSON.stringify({ e: email, exp: expMs }));
  return `r.${payload}.${hmacHex(resetKey(pw, senhaHash), payload)}`;
}

/** Valida assinatura (contra o hash atual) + expiração. Retorna payload ou null. */
function readResetToken(
  pw: string,
  token: string,
  senhaHash: string
): { e: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "r") return null;
  const sig = hmacHex(resetKey(pw, senhaHash), parts[1]);
  if (!safeEqual(Buffer.from(parts[2], "utf8"), Buffer.from(sig, "utf8")))
    return null;
  try {
    const p = JSON.parse(unb64url(parts[1]));
    if (
      p &&
      typeof p.e === "string" &&
      typeof p.exp === "number" &&
      p.exp > Date.now()
    )
      return p;
  } catch {
    /* payload inválido */
  }
  return null;
}

/** Lê o e-mail do payload SEM validar assinatura — só para localizar a conta. */
function emailDoPayloadReset(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "r") return null;
  try {
    const p = JSON.parse(unb64url(parts[1]));
    const e = typeof p?.e === "string" ? p.e.trim().toLowerCase() : "";
    return e && emailValido(e) ? e : null;
  } catch {
    return null;
  }
}

// POST /api/senha/esqueci — gera o link mágico e envia por e-mail.
// Resposta SEMPRE genérica (anti-enumeração): nunca revela se o e-mail existe.
export async function esqueciSenhaHandler(req: Request, res: Response) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw)
    return res.status(503).json({ erro: "Servidor sem ACCESS_PASSWORD." });

  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
  const resposta = {
    ok: true,
    msg: "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.",
  };
  if (!email || !emailValido(email)) return res.json(resposta);

  try {
    const { data: u } = await supabase
      .from("trials")
      .select("senha_hash")
      .eq("email", email)
      .maybeSingle();

    // Só gera/envia se a conta existe E tem senha. Senão, mesma resposta.
    if (u && u.senha_hash) {
      const expMs = Date.now() + RESET_TTL_MS;
      const token = makeResetToken(pw, email, u.senha_hash, expMs);
      const base = (process.env.APP_URL || "").replace(/\/+$/, "");
      const link = `${base}/?reset=${encodeURIComponent(token)}`;
      const corpo = `Recebemos um pedido para redefinir a senha da sua conta Maestro.

Para criar uma nova senha, abra o link abaixo (válido por 30 minutos):

    ${link}

Se você não pediu isso, ignore este e-mail — sua senha continua a mesma.`;
      // Fire-and-forget: não esperamos o envio pra responder (anti-timing).
      enviarEmail(email, "Redefinir sua senha — Maestro", corpo)
        .then((enviado) => {
          // DEV/fallback: sem SMTP, loga o link pra permitir testar o fluxo.
          if (!enviado)
            console.log(`[reset] link (dev) para ${email}: ${link}`);
        })
        .catch((e) => console.warn("[reset] envio:", e?.message ?? e));
    }
    return res.json(resposta);
  } catch (err: any) {
    console.error("[auth] esqueci:", err?.message ?? err);
    // Mesmo em erro: resposta genérica (não vaza estado do banco).
    return res.json(resposta);
  }
}

// POST /api/senha/redefinir — troca a senha usando o token do link mágico.
export async function redefinirSenhaHandler(req: Request, res: Response) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw)
    return res.status(503).json({ erro: "Servidor sem ACCESS_PASSWORD." });

  const token = String(req.body?.token ?? "");
  const senha = String(req.body?.senha ?? "");
  const erroGenerico = "Link inválido ou expirado. Peça um novo.";

  if (!token || !senha)
    return res.status(400).json({ erro: "Informe o link e a nova senha." });
  if (senha.length < 6)
    return res
      .status(400)
      .json({ erro: "A nova senha precisa ter pelo menos 6 caracteres." });

  const email = emailDoPayloadReset(token);
  if (!email) return res.status(400).json({ erro: erroGenerico });

  try {
    const { data: u } = await supabase
      .from("trials")
      .select("senha_hash")
      .eq("email", email)
      .maybeSingle();
    if (!u || !u.senha_hash)
      return res.status(400).json({ erro: erroGenerico });

    // Valida o token contra o hash ATUAL — se a senha já mudou, o link morreu.
    if (!readResetToken(pw, token, u.senha_hash))
      return res.status(400).json({ erro: erroGenerico });

    const { error } = await supabase
      .from("trials")
      .update({ senha_hash: hashSenha(senha) })
      .eq("email", email);
    if (error) throw error;

    return res.json({
      ok: true,
      msg: "Senha redefinida! Agora é só entrar com a nova senha.",
    });
  } catch (err: any) {
    console.error("[auth] redefinir:", err?.message ?? err);
    return res.status(500).json({ erro: "Falha ao redefinir a senha." });
  }
}

// ---------------------------------------------------------------------------
// Portão: aceita token Premium OU token Trial válido (não expirado)
// Popula `req.papel` e `req.userEmail` (este último null pra senha mestra/admin).
// ---------------------------------------------------------------------------
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw)
    return res.status(503).json({ erro: "Servidor sem ACCESS_PASSWORD." });

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token)
    return res.status(401).json({ erro: "Não autorizado.", auth: false });

  const papel = papelDoToken(token);
  if (!papel)
    return res
      .status(401)
      .json({ erro: "Sessão inválida ou teste expirado.", auth: false });

  (req as any).papel = papel;
  // E-mail do token (trial 't.' e premium pago 'p.'). Senha mestra → null.
  // workspaceMw usa isso pra isolar multi-tenant.
  (req as any).userEmail = emailDoToken(token);
  next();
}

/** Só o "pai" (admin) passa — para dados confidenciais e exclusões. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token && papelDoToken(token) === "pai") return next();
  return res.status(403).json({
    erro: "Apenas o administrador (pai) pode fazer isto.",
    admin: true,
  });
}

/**
 * Lê o e-mail embutido num token assinado (trial 't.' ou pago 'p.').
 * Tokens HMAC sem payload (senha mestra / admin) retornam null — esses não
 * representam uma conta pessoal individual e por isso não são "excluíveis".
 */
function emailDoToken(token: string): string | null {
  const pw = process.env.ACCESS_PASSWORD || "";
  if (!pw) return null;
  if (token.startsWith("t.")) {
    const p = readTrial(pw, token);
    return p?.e || null;
  }
  if (token.startsWith("p.")) {
    const p = readSigned(pw, token, "p", "premium");
    return p?.e || null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// DELETE /api/conta — LGPD: usuário apaga próprio cadastro
//
// Limites de design (necessários):
//  - Usuário com senha pessoal (cadastro grátis):
//      apaga linha em `trials` (e-mail, hash da senha, expires_at). OK.
//  - Usuário com chave Premium recebida por e-mail (paga):
//      apaga linha em `assinaturas` (e-mail + hash da chave). A assinatura no
//      Mercado Pago precisa ser cancelada SEPARADAMENTE pelo cliente no painel
//      do MP (o gateway é quem cobra). Avisamos isso na UI.
//  - Usuário com a senha mestra do plano (equipe, sem assinatura individual):
//      NÃO há conta individual a apagar — recusa com 400.
//
// Dados operacionais (peças, OS, equipamentos) PERMANECEM no workspace.
// Eles pertencem à empresa, não ao indivíduo (relevante pra equipes).
// ---------------------------------------------------------------------------
export async function excluirContaHandler(req: Request, res: Response) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ erro: "Não autorizado." });

    const email = emailDoToken(token);
    if (!email) {
      return res.status(400).json({
        erro:
          "Esta conta não pode ser excluída por aqui (acesso por senha mestra do plano). " +
          "Fale com o administrador.",
        equipe: true,
      });
    }

    // Apaga em ambas as tabelas — não importa qual exista.
    const [a, b] = await Promise.all([
      supabase.from("trials").delete().eq("email", email),
      supabase.from("assinaturas").delete().eq("email", email),
    ]);
    if (a.error && a.error.code !== "PGRST116") throw a.error;
    if (b.error && b.error.code !== "PGRST116") throw b.error;

    return res.json({ ok: true, email });
  } catch (err: any) {
    console.error("[auth] excluir conta:", err?.message ?? err);
    return res.status(500).json({ erro: "Falha ao excluir conta." });
  }
}
