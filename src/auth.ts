/**
 * src/auth.ts — Portão de acesso (senha compartilhada).
 *
 * Stateless e custo zero: não há banco de sessão. O cliente faz login
 * uma vez com a senha (env ACCESS_PASSWORD); o servidor devolve um token
 * determinístico HMAC. Toda chamada /api/* (exceto /api/login) exige esse
 * token em `Authorization: Bearer <token>`.
 *
 * Comparações são constant-time (timingSafeEqual) p/ não vazar via tempo.
 * Sem ACCESS_PASSWORD configurado o sistema FALHA FECHADO (nega tudo).
 */
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

function sha256(s: string): Buffer {
  return crypto.createHash("sha256").update(s, "utf8").digest();
}

function safeEqual(a: Buffer, b: Buffer): boolean {
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Token derivado da senha — o servidor não guarda estado de sessão. */
function expectedToken(pw: string): string {
  return crypto
    .createHmac("sha256", pw)
    .update("maestro-access-v1")
    .digest("hex");
}

export function loginHandler(req: Request, res: Response) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw) {
    return res
      .status(503)
      .json({ erro: "Servidor sem ACCESS_PASSWORD configurado." });
  }
  const senha = String(req.body?.senha ?? "");
  // compara hashes (mesmo tamanho) em tempo constante
  if (!senha || !safeEqual(sha256(senha), sha256(pw))) {
    return res.status(401).json({ erro: "Senha incorreta." });
  }
  return res.json({ token: expectedToken(pw) });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const pw = process.env.ACCESS_PASSWORD;
  if (!pw) {
    return res
      .status(503)
      .json({ erro: "Servidor sem ACCESS_PASSWORD configurado." });
  }
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expected = expectedToken(pw);
  if (
    !token ||
    !safeEqual(Buffer.from(token, "utf8"), Buffer.from(expected, "utf8"))
  ) {
    return res.status(401).json({ erro: "Não autorizado.", auth: false });
  }
  next();
}
