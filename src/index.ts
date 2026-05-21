/**
 * src/index.ts - Entry point.
 * Um único processo Express: serve a API /api/* e os estáticos de public/.
 * Deploy gratuito em um só serviço (Vercel/Render/Railway free).
 */
import "dotenv/config";
import path from "path";
import express from "express";
import { voiceRouter } from "./routes/voiceRoutes";
import { osRouter } from "./routes/osRoutes";
import { catalogRouter } from "./routes/catalogRoutes";
import { workspaceRouter } from "./routes/workspaceRoutes";
import { workspaceMw } from "./workspace";
import { loginHandler, trialHandler, entrarHandler, requireAuth, excluirContaHandler } from "./auth";
import { payPlanos, payCheckout, payWebhook, payChave } from "./pay";
import { securityHeaders, apiNoCache, limitePorIp, limitePorEmail } from "./security";

const app = express();

// Render fica atrás de proxy — sem isso `req.ip` mostra IP interno, não o real.
// `trust proxy` faz Express ler o primeiro item de X-Forwarded-For.
app.set("trust proxy", 1);

// Cabeçalhos de segurança em TODA resposta (CSP, HSTS, X-Frame-Options, etc.)
app.use(securityHeaders);

// CORS removido. API e estáticos compartilham a mesma origem (mesmo Express),
// então não precisa de CORS pra nada. Webhook do MP é server-to-server (não
// passa por browser), então CORS também não se aplica. Remover = mais seguro.

app.use(express.json({ limit: "16kb" })); // payload de voz é minúsculo

// Cache-Control no-store em TUDO de /api/*. Mata cache de tokens/chaves
// em browsers e proxies. Aplicado ANTES dos handlers, vale pra qualquer
// método (GET/POST/PATCH/DELETE) e qualquer rota /api.
app.use("/api", apiNoCache);

// Health check (útil p/ "manter acordado" o free tier que dorme)
app.get("/health", (_req, res) => res.json({ ok: true }));

// Ping-DB: acorda o Supabase Free (que pausa após 7 dias sem queries).
// Apontar UptimeRobot pra cá uma vez ao dia mantém o app vivo SEM tráfego real.
// Público (não exige token) pra UptimeRobot poder bater de fora.
app.get("/api/ping-db", async (_req, res) => {
  try {
    const { supabase } = await import("./config/supabase");
    // Query barata: count em uma tabela pequena (não traz dados).
    const { error } = await supabase
      .from("trials")
      .select("email", { count: "exact", head: true });
    if (error) throw error;
    res.json({ ok: true, db: "up" });
  } catch (err: any) {
    console.warn("[ping-db] falhou:", err?.message ?? err);
    res.status(503).json({ ok: false, db: "down" });
  }
});

// Login, teste grátis e pagamento são públicos (sem token).
// O webhook precisa ser público p/ o Mercado Pago chamar (é assinado).
//
// RATE LIMITS — defesa #1 contra credential stuffing / brute force.
// Aplicados ANTES do handler. Limites por IP + por e-mail (cobre ataques
// distribuídos com IPs rotativos focados num mesmo alvo).
//
//  /api/login    senha mestra OU chave Premium → 8 tentativas/min por IP
//  /api/entrar   email+senha → 6/min por IP + 5/min por email (anti-stuffing)
//  /api/trial    cadastro grátis → 3/min por IP (evita criar contas em massa)
//  /api/pay/chave  busca por payment_id → 10/min por IP (evita varredura)
//  /api/pay/checkout 5/min por IP (evita gerar muitas preferências MP)
app.post("/api/login",
  limitePorIp("login", 60_000, 8),
  loginHandler);
app.post("/api/trial",
  limitePorIp("trial", 60_000, 3),
  limitePorEmail("trial", 3_600_000, 1), // 1 cadastro por email por hora
  trialHandler);
app.post("/api/entrar",
  limitePorIp("entrar", 60_000, 6),
  limitePorEmail("entrar", 60_000, 5),
  entrarHandler);
app.get("/api/pay/planos", payPlanos);
app.post("/api/pay/checkout",
  limitePorIp("checkout", 60_000, 5),
  payCheckout);
app.post("/api/pay/webhook", payWebhook); // sem rate-limit: MP retenta legítimo
// Público: entrega a chave em texto na tela (válido 7d após pagto).
// Conhecer o payment_id do MP é o "token" de acesso → rate limit pesado
// pra impedir varredura sequencial de IDs.
app.get("/api/pay/chave",
  limitePorIp("chave", 60_000, 10),
  payChave);

// Portão: tudo abaixo de /api exige token válido
app.use("/api", requireAuth);

// LGPD: usuário apaga próprio cadastro. PRECISA estar ANTES do workspaceMw,
// pois a exclusão opera no e-mail do token, não em dados do workspace.
app.delete("/api/conta", excluirContaHandler);

// Resolução do workspace ativo (lê X-Workspace-Id; cai no "principal")
app.use("/api", workspaceMw);

// API (protegida)
app.use("/api", voiceRouter);
app.use("/api", osRouter);
app.use("/api", catalogRouter);
app.use("/api", workspaceRouter);

// Frontend estático (público) - será criado no próximo passo
app.use(
  express.static(path.join(__dirname, "..", "public"), {
    setHeaders: (res, filePath) => {
      // PWA: navegador exige Content-Type correto pro manifest, senão ignora
      if (filePath.endsWith(".webmanifest"))
        res.setHeader("Content-Type", "application/manifest+json; charset=utf-8");
      // SW deve poder ser revalidado a cada navegação (atualização do app)
      if (filePath.endsWith("sw.js"))
        res.setHeader("Cache-Control", "no-cache");
    },
  })
);

// 404 em JSON (frontend espera sempre um campo `fala`)
app.use((_req, res) => {
  res.status(404).json({ fala: "Recurso não encontrado.", intencao: "erro" });
});

// Handler de erro global (rede/parse) - nunca derruba o processo silenciosamente
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[fatal]", err?.message ?? err);
    res.status(500).json({ fala: "Erro interno do servidor.", intencao: "erro" });
  }
);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Maestro rodando em http://localhost:${port}`);
});
