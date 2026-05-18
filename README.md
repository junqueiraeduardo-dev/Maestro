# VoiceParts AI — MVP Custo Zero

Assistente de voz para mecânicos: buscar peças, dar baixa no estoque e sugerir kits.
**Infra de produção 100% gratuita.**

## Por que custa zero

| Camada      | Serviço                          | Custo                                  |
|-------------|----------------------------------|----------------------------------------|
| Voz (STT/TTS) | Web Speech API (navegador)     | $0 — roda no dispositivo do operador   |
| IA          | Gemini 1.5 Flash (AI Studio)     | $0 — Free Tier (~15 req/min, ~1500/dia)|
| Banco       | Supabase Postgres                | $0 — Free Tier (500 MB)                |
| Hospedagem  | Render/Railway/Fly.io (Node)     | $0 — Free Tier (server único)          |

## Estrutura

App único Node/TypeScript: o Express serve a API `/api/*` **e** os estáticos de `public/`
(um só deploy gratuito).

```
src/index.ts              Express: CORS, JSON, /health, monta /api, serve public/, erro global
src/config/supabase.ts    Cliente Supabase (service_role) + fail-fast de env
src/services/aiService.ts System Prompt + fast-path regex + token bucket + Gemini Flash (JSON)
src/routes/voiceRoutes.ts POST /api/process-voice → intenção → RPC → frase falável
public/index.html         UI Dark Mode + botão de microfone gigante
public/app.js             Web Speech API (STT pt-BR) + speechSynthesis (TTS)
supabase/01_schema.sql    Tabelas estoque_pecas + historico_servicos
supabase/02_rpc.sql       RPCs: buscar_peca (fuzzy) e dar_baixa_estoque (atômico)
```

## Como rodar

1. **Supabase:** crie um projeto → SQL Editor → rode `01_schema.sql`, depois `02_rpc.sql`.
2. **App:** copie `.env.example` → `.env`, preencha as chaves, `npm install`.
   - Dev: `npm run dev` · Produção: `npm run build && npm start`.
3. **Acesse** `http://localhost:3000` no Chrome/Edge/Android e toque no microfone.

## 3 truques de economia (a melhor requisição é a que não se faz)

1. **fast-path por regex** resolve "onde está", "tira 2 ..." sem chamar a IA.
2. **busca fuzzy no Postgres** (pg_trgm) resolve "buscar" sem IA.
3. **resposta por template** no backend → nunca há 2ª chamada de IA só pra escrever a frase.

## Limites a respeitar (Free Tier)

- Web Speech API: melhor no Chrome/Edge/Android; iOS Safari é instável.
- Gemini Flash grátis: token bucket local corta em 12 req/min antes de gastar cota.
- Render/Railway free "dormem" (cold start ~30s) → use o `/health` num cron grátis (UptimeRobot) para manter acordado.
- Supabase free pausa projeto após 7 dias sem uso → um ping/dia mantém ativo.
