/**
 * src/index.ts - Entry point.
 * Um único processo Express: serve a API /api/* e os estáticos de public/.
 * Deploy gratuito em um só serviço (Vercel/Render/Railway free).
 */
import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import { voiceRouter } from "./routes/voiceRoutes";
import { osRouter } from "./routes/osRoutes";
import { catalogRouter } from "./routes/catalogRoutes";
import { loginHandler, requireAuth } from "./auth";

const app = express();

app.use(cors());
app.use(express.json({ limit: "16kb" })); // payload de voz é minúsculo

// Health check (útil p/ "manter acordado" o free tier que dorme)
app.get("/health", (_req, res) => res.json({ ok: true }));

// Login é público (precisa ser alcançável sem token)
app.post("/api/login", loginHandler);

// Portão: tudo abaixo de /api exige token válido
app.use("/api", requireAuth);

// API (protegida)
app.use("/api", voiceRouter);
app.use("/api", osRouter);
app.use("/api", catalogRouter);

// Frontend estático (público) - será criado no próximo passo
app.use(express.static(path.join(__dirname, "..", "public")));

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
