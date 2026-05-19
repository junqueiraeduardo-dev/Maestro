-- =====================================================================
-- Maestro — Tutorial em vídeo (peças) + Inspeção do Dia.
-- Rodar DEPOIS de 01..04. Idempotente. RLS ligado sem policy.
-- =====================================================================

-- Link de tutorial (YouTube etc.) por peça — o dono cola no cadastro.
alter table public.estoque_pecas
    add column if not exists tutorial_url text;

-- ---------------------------------------------------------------------
-- Inspeções (checklist pré-operacional por equipamento)
-- ---------------------------------------------------------------------
create table if not exists public.inspecoes (
    id             uuid primary key default gen_random_uuid(),
    equipamento_id uuid references public.equipamentos(id) on delete cascade,
    operador       text,
    itens          jsonb not null default '[]'::jsonb,  -- [{item,ok,obs}]
    ok             boolean not null default true,        -- true = sem problema
    created_at     timestamptz not null default now()
);
create index if not exists idx_insp_data  on public.inspecoes (created_at desc);
create index if not exists idx_insp_equip on public.inspecoes (equipamento_id);

alter table public.inspecoes enable row level security;
