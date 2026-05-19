-- =====================================================================
-- VoiceParts AI - Esquema do Banco (Supabase / PostgreSQL)
-- Free Tier Supabase: 500 MB. Este schema é proposital enxuto.
-- =====================================================================

-- Extensão para busca "fuzzy" por voz (ex.: "filtro de oleo" ~ "Filtro de Óleo").
-- pg_trgm já vem disponível no Supabase, só precisa habilitar.
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- Tabela: estoque_pecas
-- ---------------------------------------------------------------------
create table if not exists public.estoque_pecas (
    id                uuid primary key default gen_random_uuid(),
    nome              text        not null,
    sku               text        not null unique,
    quantidade        integer     not null default 0 check (quantidade >= 0),
    localizacao_fisica text,                                  -- ex.: "Prateleira B3"
    sinonimos         text default '',                        -- "oleo,lubrificante,5w30" (tags por voz)
    categoria         text,                                   -- usado para sugestão de kit
    created_at        timestamptz not null default now(),
    updated_at        timestamptz not null default now()
);

-- Índice trigram: torna a busca por aproximação barata e rápida
-- (evita ter que chamar a IA só para "achar" a peça → economiza Rate Limit do Gemini).
create index if not exists idx_estoque_busca
    on public.estoque_pecas
    using gin ((nome || ' ' || coalesce(sinonimos, '')) gin_trgm_ops);

-- ---------------------------------------------------------------------
-- Tabela: historico_servicos
-- pecas_utilizadas em JSONB evita uma tabela de junção (MVP enxuto).
-- ---------------------------------------------------------------------
create table if not exists public.historico_servicos (
    id                uuid primary key default gen_random_uuid(),
    veiculo           text,
    descricao_servico text        not null,
    pecas_utilizadas  jsonb       not null default '[]'::jsonb, -- [{"sku":"X","qtd":2}]
    operador          text,
    created_at        timestamptz not null default now()
);

create index if not exists idx_historico_data
    on public.historico_servicos (created_at desc);

-- ---------------------------------------------------------------------
-- Trigger simples para manter updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_estoque_updated on public.estoque_pecas;
create trigger trg_estoque_updated
    before update on public.estoque_pecas
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- SEGURANÇA (RLS)
-- O backend usa a SERVICE_ROLE key (que ignora RLS). Mantemos RLS ligado
-- e SEM policy pública para que a ANON key não consiga ler/escrever direto.
-- ---------------------------------------------------------------------
alter table public.estoque_pecas      enable row level security;
alter table public.historico_servicos enable row level security;

-- Sem dados de exemplo: o estoque começa vazio. O cliente cadastra as
-- peças dele pela tela "Almoxarifado" (+) ou por voz.
