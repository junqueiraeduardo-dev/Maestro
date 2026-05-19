# Maestro — CMMS por voz · MVP Custo Zero

Plataforma de manutenção (frotas e indústria) operada por voz. O primeiro
módulo — **Almoxarifado por voz** — busca peças, dá baixa no estoque e
sugere kits falando. **Infra de produção 100% gratuita.**

## Por que custa zero

| Camada        | Serviço                        | Custo                                   |
|---------------|--------------------------------|-----------------------------------------|
| Voz (STT/TTS) | Web Speech API (navegador)     | $0 — roda no dispositivo do operador    |
| IA            | Gemini 2.0 Flash (AI Studio)   | $0 — Free Tier (~15 req/min, ~1500/dia) |
| Banco         | Supabase Postgres              | $0 — Free Tier (500 MB)                 |
| Hospedagem    | Render (Node)                  | $0 — Free Tier (server único)           |

## Estrutura

App único Node/TypeScript: o Express serve a API `/api/*` **e** os estáticos de
`public/` (um só deploy gratuito). O frontend é React via Babel-standalone no
navegador — sem etapa de build, fiel à filosofia custo-zero.

```
src/index.ts              Express: CORS, JSON, /health, monta /api, serve public/, erro global
src/config/supabase.ts    Cliente Supabase (service_role) + fail-fast de env
src/services/aiService.ts System Prompt + fast-path regex + token bucket + Gemini 2.0 Flash (JSON)
src/routes/voiceRoutes.ts POST /api/process-voice → intenção → RPC → { fala, intencao, dados }
src/routes/osRoutes.ts    REST de Equipamentos + Ordens de Serviço (CRUD real)
public/index.html         Shell mobile (fontes, splash do monograma, carrega React+Babel)
public/ui.jsx             Tokens de design (M), ícones, componentes, Logo (monograma)
public/screens.jsx        7 telas: Home, Almoxarifado, OS, Equipamentos, Dashboard, detalhes
public/app.jsx            Navegação + voz REAL (Web Speech API → /api → TTS + card)
public/api.js             Cliente HTTP do frontend (window.API)
public/data.js            Mock restante (Almoxarifado: PARTS/MOVIMENTOS · Dashboard)
public/favicon.svg        Monograma de 5 barras (waveform/"M")
supabase/01_schema.sql    Tabelas estoque_pecas + historico_servicos
supabase/02_rpc.sql       RPCs: buscar_peca (fuzzy) e dar_baixa_estoque (atômico)
supabase/03_seed_mro_frota.sql  Coluna `segmento` no estoque (sem dados)
supabase/04_os_equipamentos.sql equipamentos, ordens_servico, os_pecas, os_comentarios
supabase/05_reset_dados.sql     Esvazia tudo (rodar 1x antes de entregar ao cliente)
```

> **Sem dados de exemplo.** As tabelas começam vazias — o cliente cadastra
> peças (Almoxarifado +/voz), equipamentos (Equipamentos +) e abre OS pela UI.

## O que é real vs. mock

- **Real:** voz → `/api/process-voice` → Supabase (buscar/baixa/kit, a baixa
  decrementa o estoque na hora). **Ordens de Serviço e Equipamentos** também:
  abrir/fechar OS, registrar peça, comentar, listar/filtrar equipamentos e
  ficha com timeline — tudo via `/api/os*` e `/api/equipamentos*`.
- **Mock (`data.js`):** Dashboard (KPIs/gráfico), histórico de movimentações
  e a busca textual do Almoxarifado. Próxima etapa: agregações do Dashboard.

## Como rodar

1. **Supabase:** crie um projeto → SQL Editor → rode na ordem `01_schema.sql`,
   `02_rpc.sql`, `03_seed_mro_frota.sql`, `04_os_equipamentos.sql`. Para zerar
   uma base que já tem dados de teste, rode também `05_reset_dados.sql`.
2. **App:** copie `.env.example` → `.env`, preencha as chaves **incluindo
   `ACCESS_PASSWORD`** (sem ela o app nega tudo — fail-closed), `npm install`.
   - Dev: `npm run dev` · Produção: `npm run build && npm start`.
3. **Acesse** `http://localhost:3000` no Chrome/Edge/Android e toque no microfone.

## 3 truques de economia (a melhor requisição é a que não se faz)

1. **fast-path por regex** resolve "onde está", "tira 2 ..." sem chamar a IA.
2. **busca fuzzy no Postgres** (pg_trgm) resolve "buscar" sem IA.
3. **resposta por template** no backend → nunca há 2ª chamada de IA só pra escrever a frase.

## Limites a respeitar (Free Tier)

- Web Speech API: melhor no Chrome/Edge/Android; iOS Safari é instável.
- Gemini grátis: token bucket local corta em 12 req/min; se estourar/cair, o
  backend degrada para "buscar" (nunca trava o operador).
- Render free "dorme" (cold start ~30s) → ping no `/health` (UptimeRobot) mantém acordado.
- Supabase free pausa após 7 dias sem uso → um ping/dia mantém ativo.
