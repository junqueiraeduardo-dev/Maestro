-- =====================================================================
-- Maestro — Planos: registro de testes grátis (1 por e-mail).
-- Rodar DEPOIS de 01..06. Idempotente. RLS ligado sem policy.
-- Guarda só a expiração do teste — o token assinado carrega o resto.
-- =====================================================================

create table if not exists public.trials (
    email      text primary key,
    started_at timestamptz not null default now(),
    expires_at timestamptz not null
);

alter table public.trials enable row level security;
