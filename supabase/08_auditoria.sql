-- =====================================================================
-- Maestro — Log de atividade (visível só para o "pai"/admin).
-- Rodar DEPOIS de 01..07. Idempotente. RLS ligado sem policy.
-- =====================================================================

create table if not exists public.atividade (
    id         uuid primary key default gen_random_uuid(),
    ator       text,                 -- nome/e-mail informado pelo app
    papel      text,                 -- pai | filho | trial
    acao       text not null,        -- ex.: "criou peça", "excluiu OS"
    alvo       text,                 -- ex.: "ROL-6205", "OS-1042"
    created_at timestamptz not null default now()
);
create index if not exists idx_ativ_data on public.atividade (created_at desc);

alter table public.atividade enable row level security;
