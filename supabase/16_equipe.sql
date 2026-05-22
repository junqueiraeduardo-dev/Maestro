-- =====================================================================
-- Maestro — Gestão de equipe + convites + cancelamento de assinatura.
-- Rodar DEPOIS de 15_workspace_owner.sql. Idempotente.
--
-- MODELO:
--  - O chefe (Premium pagante) gera um LINK de convite no app
--    (POST /api/equipe/convite). O link tem `?convite=CODIGO`.
--  - Funcionário abre o link → cadastra grátis → fica AUTOMATICAMENTE
--    vinculado ao workspace do chefe.
--  - Cada operação dele cai no audit_log do workspace do chefe.
--  - Chefe vê tudo pela tela "Gestão" (já existe, requer admin).
--
-- LIMITES:
--  - Convite expira em 7 dias por padrão
--  - max_usos opcional (default 25, igual ao plano Equipe)
--  - codigo de 12 chars hex (~10^14 combinações — inenumerável)
-- =====================================================================

-- Convites: chefe cria, funcionário usa pra entrar no workspace dele
create table if not exists public.convites_equipe (
    id            uuid primary key default gen_random_uuid(),
    codigo        text not null unique,            -- string randômica 12 chars
    workspace_id  uuid not null references public.workspaces(id) on delete cascade,
    criado_por    text not null,                   -- email do chefe que criou
    criado_em     timestamptz not null default now(),
    expira_em     timestamptz not null,            -- default +7 dias (app)
    max_usos      integer not null default 25,
    usos          integer not null default 0,
    revogado      boolean not null default false
);
create index if not exists idx_conv_codigo
  on public.convites_equipe (codigo) where not revogado;
create index if not exists idx_conv_workspace
  on public.convites_equipe (workspace_id);

alter table public.convites_equipe enable row level security;

-- Trial pode ter um workspace padrão (vinculado pelo convite usado)
-- Sem isso, trial caia no workspace "principal" (compartilhado).
alter table public.trials
  add column if not exists workspace_padrao uuid references public.workspaces(id);

create index if not exists idx_trials_workspace_padrao
  on public.trials (workspace_padrao) where workspace_padrao is not null;

-- Incremento atômico de `usos` no convite (evita race condition entre
-- dois cadastros simultâneos passando o limite).
create or replace function public.incrementa_convite(p_codigo text)
returns void language sql as $$
  update public.convites_equipe
    set usos = usos + 1
    where codigo = p_codigo
      and usos < max_usos
      and not revogado
      and expira_em > now();
$$;
