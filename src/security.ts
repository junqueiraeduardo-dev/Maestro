/**
 * src/security.ts — Middlewares de segurança do Maestro.
 *
 * Implementação sem dependências externas (sem helmet/express-rate-limit)
 * porque o sandbox local não consegue rodar `npm install` (cert).
 * No Render isso roda normal — só não dá pra adicionar pacotes daqui.
 *
 * Cobre:
 *   1. securityHeaders     → CSP, HSTS, X-Frame-Options, etc.
 *   2. rateLimit           → janela deslizante por IP + chave (login, etc.)
 *   3. ipDe(req)           → IP real atrás de proxy (Render usa X-Forwarded-For)
 *
 * Referência de threats:
 *   - OWASP Top 10 2025 A02 (Security Misconfiguration), A07 (Auth Failures)
 *   - Credential stuffing: Akamai mediu 26 bilhões/mês em 2024
 *   - CSP/HSTS/etc. cobrem XSS, clickjacking, MITM, content-type sniffing
 */
import { Request, Response, NextFunction } from "express";

// ---------------------------------------------------------------------------
// IP do cliente — Render coloca o IP real em X-Forwarded-For (primeiro item)
// ---------------------------------------------------------------------------
export function ipDe(req: Request): string {
  const xff = String(req.headers["x-forwarded-for"] || "");
  if (xff) return xff.split(",")[0].trim();
  return (req.ip || req.socket?.remoteAddress || "unknown").toString();
}

// ---------------------------------------------------------------------------
// HEADERS DE SEGURANÇA
//
// CSP: restringe o que pode rodar no navegador. Bloqueia XSS, supply chain.
//   - script-src: só nosso domínio + as 3 CDNs com SRI no index.html
//   - style-src: 'unsafe-inline' pq usamos estilos inline do React (necessário)
//   - frame-ancestors 'none': substitui X-Frame-Options (bloqueia clickjacking)
//   - img-src data: blob: → SVG inline da granulação + ícone Lucide
//   - connect-src 'self': fetch só pra própria origem (impede exfil pra atacante)
//
// HSTS: força HTTPS por 6 meses. Render já dá HTTPS — esse header garante que
//   nem com link http://… o browser cai.
//
// frame-ancestors em CSP → não precisa X-Frame-Options (CSP é mais novo + flexível).
// ---------------------------------------------------------------------------
const FONTS = "https://fonts.googleapis.com https://fonts.gstatic.com";
const REACT_CDN = "https://unpkg.com";

const CSP = [
  "default-src 'self'",
  // Babel-standalone EVAL js no cliente → 'unsafe-eval' inevitável.
  // 'unsafe-inline' para scripts INLINE no index.html (SW register etc.).
  // Quando migrarmos para build com bundler, removemos os dois.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${REACT_CDN}`,
  // Tags <style> inline + style="..." dos componentes React → 'unsafe-inline'
  `style-src 'self' 'unsafe-inline' ${FONTS}`,
  `font-src 'self' data: ${FONTS}`,
  // SVG inline (granulação) + ícone via data: + imagens próprias
  "img-src 'self' data: blob:",
  // fetch só para nossa própria origem → bloqueia exfiltração via XSS
  "connect-src 'self'",
  // Nada de form action externa
  "form-action 'self'",
  // Bloqueia <object>, <embed>, <applet>
  "object-src 'none'",
  // Substitui X-Frame-Options: ninguém pode embed o app em iframe
  "frame-ancestors 'none'",
  // base href fixo em "/"
  "base-uri 'self'",
  // Service Worker e Web Workers
  "worker-src 'self' blob:",
  // Manifest do PWA
  "manifest-src 'self'",
  // Bloqueia mixed content quando o app for HTTPS (Render)
  "upgrade-insecure-requests",
].join("; ");

/**
 * Cache-Control: no-store em respostas /api/*. Impede que browsers, proxies
 * corporativos ou caches CDN guardem respostas que carregam tokens, chaves
 * Premium, dados de usuário. Sem isso, voltar pelo histórico podia mostrar
 * pra outro usuário (em compartilhamento de máquina).
 *
 * NÃO aplicado em estáticos (HTML/JS/CSS) — esses PRECISAM cachear pra app
 * carregar rápido. SW controla o cache do shell.
 */
export function apiNoCache(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  // CSP — restringe XSS / supply chain
  res.setHeader("Content-Security-Policy", CSP);
  // HSTS — força HTTPS (Render) por 6 meses, inclui subdomínios se um dia tiver
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=15552000; includeSubDomains"
  );
  // Bloqueia o browser de "adivinhar" content-type (defesa XSS via mime sniffing)
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Não vaza URL completa pra cross-origin (privacidade)
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Negar todas as APIs sensíveis que não usamos
  res.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()"
  );
  // Cross-Origin-Opener-Policy: isola contexto da janela (defesa Spectre)
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  // X-Frame-Options legado (alguns browsers antigos ainda olham). CSP já cobre.
  res.setHeader("X-Frame-Options", "DENY");
  next();
}

// ---------------------------------------------------------------------------
// RATE LIMIT — sliding window em memória, sem dependência externa
//
// Cada chave (ex.: "login:ip:1.2.3.4") guarda timestamps de hits.
// Em cada chamada, joga fora hits fora da janela e conta o resto.
//
// Limitações conhecidas:
//   - In-memory: se Render reinicia, contadores zeram. Pra abuso real
//     persistente seria preciso Redis/Postgres, mas pra mitigar
//     credential stuffing (que é AUTOMAÇÃO em alta velocidade), o limite
//     in-memory por instância já corta o ataque.
//   - 1 instância no Render Free → contador único. Quando escalar pra mais
//     de 1 instância, atacante distribui — aí migra pra Redis.
//
// `chave` deve incluir o IP. Pra "login por email" também incluir o email,
// pra impedir credential stuffing focado em um único usuário (atacante
// rotaciona IPs mas tenta o mesmo email — capturamos pela 2ª chave).
// ---------------------------------------------------------------------------
type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();

// Tamanho máximo do Map pra não vazar memória num ataque distribuído.
// LRU rude: quando passa, joga fora as mais antigas.
const MAX_BUCKETS = 50_000;

function hit(chave: string, janelaMs: number, max: number): boolean {
  const agora = Date.now();
  let b = buckets.get(chave);
  if (!b) {
    if (buckets.size >= MAX_BUCKETS) {
      // Evict 25% mais antigos por timestamp do último hit
      const arr = Array.from(buckets.entries())
        .map(([k, v]) => [k, v.hits[v.hits.length - 1] || 0] as const)
        .sort((a, b2) => a[1] - b2[1])
        .slice(0, Math.floor(MAX_BUCKETS * 0.25));
      for (const [k] of arr) buckets.delete(k);
    }
    b = { hits: [] };
    buckets.set(chave, b);
  }
  // Mantém só hits dentro da janela
  b.hits = b.hits.filter((t) => agora - t < janelaMs);
  if (b.hits.length >= max) return false;
  b.hits.push(agora);
  return true;
}

/**
 * Middleware que bloqueia com 429 se passou do limite.
 * @param janelaMs janela em ms (ex.: 60_000 = 1 min)
 * @param max     hits máximos na janela
 * @param chaveDe função que constrói a chave a partir do request
 */
export function rateLimit(
  janelaMs: number,
  max: number,
  chaveDe: (req: Request) => string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const chave = chaveDe(req);
    if (!hit(chave, janelaMs, max)) {
      const retryS = Math.ceil(janelaMs / 1000);
      res.setHeader("Retry-After", String(retryS));
      return res.status(429).json({
        erro: "Muitas tentativas. Aguarde e tente de novo.",
        retryAfter: retryS,
      });
    }
    next();
  };
}

// Builders úteis ----------------------------------------------------------

/** "rota:ip" — limite por IP só (suficiente pra maioria) */
export const limitePorIp = (rota: string, janelaMs: number, max: number) =>
  rateLimit(janelaMs, max, (req) => `${rota}:ip:${ipDe(req)}`);

/** "rota:email" — limite por destino (impede stuffing focado num email) */
export const limitePorEmail = (rota: string, janelaMs: number, max: number) =>
  rateLimit(janelaMs, max, (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return `${rota}:email:${email || "anon"}`;
  });
