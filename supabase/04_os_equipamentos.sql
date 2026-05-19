-- =====================================================================
-- Maestro — Módulo de Manutenção: Equipamentos + Ordens de Serviço.
-- Rodar DEPOIS de 01_schema.sql, 02_rpc.sql, 03_seed_mro_frota.sql.
-- Idempotente (tabelas com IF NOT EXISTS). SEM dados de exemplo:
-- o cliente cadastra equipamentos e abre OS pela própria UI.
-- RLS ligado sem policy: só o backend (service_role) acessa.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Equipamentos (caminhão, trator, empilhadeira, máquina industrial...)
-- ---------------------------------------------------------------------
create table if not exists public.equipamentos (
    id         uuid primary key default gen_random_uuid(),
    codigo     text not null unique,                 -- "EMP-04", "CAM-07"
    nome       text not null,
    modelo     text,
    ano        integer,
    placa      text,
    tipo       text,                                 -- "Caminhão", "Trator"...
    status     text not null default 'operacional'   -- operacional|manutencao|parado
        check (status in ('operacional','manutencao','parado')),
    horas      integer,
    km         integer,
    custo_mes  numeric(12,2) not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Ordens de Serviço
-- ---------------------------------------------------------------------
create table if not exists public.ordens_servico (
    id             uuid primary key default gen_random_uuid(),
    codigo         text not null unique,             -- "OS-1042"
    equipamento_id uuid references public.equipamentos(id) on delete set null,
    tipo           text not null default 'corretiva'
        check (tipo in ('corretiva','preventiva')),
    prioridade     text not null default 'normal'
        check (prioridade in ('normal','urgente')),
    status         text not null default 'aberta'
        check (status in ('aberta','andamento','concluida')),
    descricao      text not null,
    mecanico       text,
    aberta_em      timestamptz not null default now(),
    fechada_em     timestamptz,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);
create index if not exists idx_os_status on public.ordens_servico (status);
create index if not exists idx_os_equip  on public.ordens_servico (equipamento_id);
create index if not exists idx_os_aberta on public.ordens_servico (aberta_em desc);

-- Peças usadas na OS (tabela de junção simples)
create table if not exists public.os_pecas (
    id         uuid primary key default gen_random_uuid(),
    os_id      uuid not null references public.ordens_servico(id) on delete cascade,
    sku        text,
    nome       text not null,
    quantidade integer not null default 1 check (quantidade > 0),
    created_at timestamptz not null default now()
);
create index if not exists idx_ospecas_os on public.os_pecas (os_id);

-- Comentários / notas da OS
create table if not exists public.os_comentarios (
    id         uuid primary key default gen_random_uuid(),
    os_id      uuid not null references public.ordens_servico(id) on delete cascade,
    autor      text,
    texto      text not null,
    created_at timestamptz not null default now()
);
create index if not exists idx_oscom_os on public.os_comentarios (os_id);

-- updated_at automático (reusa set_updated_at do 01_schema)
drop trigger if exists trg_equip_updated on public.equipamentos;
create trigger trg_equip_updated
    before update on public.equipamentos
    for each row execute function public.set_updated_at();

drop trigger if exists trg_os_updated on public.ordens_servico;
create trigger trg_os_updated
    before update on public.ordens_servico
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- SEGURANÇA (RLS) — mesmo padrão das demais tabelas
-- ---------------------------------------------------------------------
alter table public.equipamentos   enable row level security;
alter table public.ordens_servico enable row level security;
alter table public.os_pecas       enable row level security;
alter table public.os_comentarios enable row level security;
