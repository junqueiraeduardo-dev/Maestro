-- =====================================================================
-- Maestro — Multi-workspace.
--   Empresário com 3 lojas, produtor com 2 fazendas → switch rápido
--   sem misturar peças/equipamentos/OS. Idempotente. Rodar 1x.
-- Rodar DEPOIS de 01..10.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabela workspaces + workspace padrão "Principal" para dados existentes
-- ---------------------------------------------------------------------
create table if not exists public.workspaces (
    id        uuid primary key default gen_random_uuid(),
    slug      text not null unique,           -- código curto: "loja-centro"
    nome      text not null,                  -- "Loja Centro"
    criado_em timestamptz not null default now()
);
alter table public.workspaces enable row level security;

insert into public.workspaces (slug, nome)
values ('principal', 'Principal')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------
-- workspace_id em cada tabela operacional
-- ---------------------------------------------------------------------
alter table public.estoque_pecas
    add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.equipamentos
    add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.ordens_servico
    add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.inspecoes
    add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.historico_servicos
    add column if not exists workspace_id uuid references public.workspaces(id);
alter table public.atividade
    add column if not exists workspace_id uuid references public.workspaces(id);

-- Backfill: tudo que está sem workspace cai no "Principal"
do $$
declare ws uuid;
begin
    select id into ws from public.workspaces where slug = 'principal';
    update public.estoque_pecas      set workspace_id = ws where workspace_id is null;
    update public.equipamentos       set workspace_id = ws where workspace_id is null;
    update public.ordens_servico     set workspace_id = ws where workspace_id is null;
    update public.inspecoes          set workspace_id = ws where workspace_id is null;
    update public.historico_servicos set workspace_id = ws where workspace_id is null;
    update public.atividade          set workspace_id = ws where workspace_id is null;
end $$;

-- Índices para filtragem por workspace
create index if not exists idx_pecas_ws on public.estoque_pecas (workspace_id);
create index if not exists idx_equip_ws on public.equipamentos (workspace_id);
create index if not exists idx_os_ws    on public.ordens_servico (workspace_id);
create index if not exists idx_insp_ws  on public.inspecoes (workspace_id);
create index if not exists idx_ativ_ws  on public.atividade (workspace_id);

-- ---------------------------------------------------------------------
-- Unicidade COMPOSTA: o mesmo SKU/código pode existir em workspaces
-- diferentes (ex.: cada fazenda tem seu próprio "TRT-01").
-- Remove unicidade global antiga; cria índice único por (workspace, sku/codigo).
-- ---------------------------------------------------------------------
alter table public.estoque_pecas  drop constraint if exists estoque_pecas_sku_key;
alter table public.equipamentos   drop constraint if exists equipamentos_codigo_key;
alter table public.ordens_servico drop constraint if exists ordens_servico_codigo_key;
create unique index if not exists ux_pecas_ws_sku    on public.estoque_pecas  (workspace_id, sku);
create unique index if not exists ux_equip_ws_codigo on public.equipamentos   (workspace_id, codigo);
create unique index if not exists ux_os_ws_codigo    on public.ordens_servico (workspace_id, codigo);

-- ---------------------------------------------------------------------
-- RPCs recriadas com filtro de workspace.
-- (Mantém o mesmo retorno; só adiciona o parâmetro p_workspace.)
-- ---------------------------------------------------------------------
drop function if exists public.buscar_peca(text);
create or replace function public.buscar_peca(p_workspace uuid, termo text)
returns table (
    nome text,
    sku text,
    quantidade integer,
    localizacao_fisica text,
    score real
) language sql stable as $$
    select
        p.nome,
        p.sku,
        p.quantidade,
        p.localizacao_fisica,
        similarity(p.nome || ' ' || coalesce(p.sinonimos, ''), termo) as score
    from public.estoque_pecas p
    where p.workspace_id = p_workspace
      and (p.nome || ' ' || coalesce(p.sinonimos, '')) % termo
    order by score desc
    limit 3;
$$;

drop function if exists public.dar_baixa_estoque(text, integer, text, text);
create or replace function public.dar_baixa_estoque(
    p_workspace  uuid,
    p_sku        text,
    p_qtd        integer,
    p_descricao  text default 'Baixa via assistente de voz',
    p_operador   text default 'voz'
)
returns table (status text, restante integer, nome text)
language plpgsql as $$
declare
    v_nome  text;
    v_atual integer;
begin
    select e.nome, e.quantidade into v_nome, v_atual
    from public.estoque_pecas e
    where e.workspace_id = p_workspace and e.sku = p_sku
    for update;

    if not found then
        return query select 'NAO_ENCONTRADO'::text, 0, null::text;
        return;
    end if;

    if v_atual < p_qtd then
        return query select 'SALDO_INSUFICIENTE'::text, v_atual, v_nome;
        return;
    end if;

    update public.estoque_pecas
        set quantidade = quantidade - p_qtd
        where workspace_id = p_workspace and sku = p_sku;

    insert into public.historico_servicos (descricao_servico, pecas_utilizadas, operador, workspace_id)
    values (
        p_descricao,
        jsonb_build_array(jsonb_build_object('sku', p_sku, 'qtd', p_qtd)),
        p_operador,
        p_workspace
    );

    return query select 'OK'::text, (v_atual - p_qtd), v_nome;
end;
$$;
