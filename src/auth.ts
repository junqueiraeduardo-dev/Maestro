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

export const TRIAL_DIAS = 7;

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
export async function trialHandler(req: Request, res: Response) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw)
    return res.status(503).json({ erro: "Servidor sem ACCESS_PASSWORD." });

  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
  if (!email || !/.+@.+\..+/.test(email))
    return res.status(400).json({ erro: "Informe um e-mail válido." });

  try {
    const { data: ex } = await supabase
      .from("trials")
      .select("expires_at")
      .eq("email", email)
      .maybeSingle();

    let expMs: number;
    if (ex) {
      expMs = new Date(ex.expires_at).getTime();
      if (expMs <= Date.now())
        return res.status(403).json({
          erro: "Seu teste grátis expirou. Assine o Premium para continuar.",
          expirado: true,
        });
    } else {
      expMs = Date.now() + TRIAL_DIAS * 86400_000;
      const { error } = await supabase.from("trials").insert({
        email,
        expires_at: new Date(expMs).toISOString(),
      });
      if (error) throw error;
    }

    const dias = Math.max(1, Math.ceil((expMs - Date.now()) / 86400_000));
    return res.json({
      token: makeTrialToken(pw, email, expMs),
      plano: "trial",
      expMs,
      dias,
    });
  } catch (err: any) {
    console.error("[auth] trial:", err?.message ?? err);
    return res.status(500).json({ erro: "Falha ao iniciar o teste." });
  }
}

// ---------------------------------------------------------------------------
// Portão: aceita token Premium OU token Trial válido (não expirado)
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
