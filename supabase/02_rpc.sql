-- =====================================================================
-- RPCs (lógica no banco) - reduz código no backend e garante atomicidade.
-- Rodar DEPOIS do 01_schema.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- buscar_peca(termo): busca fuzzy por nome OU sinônimos.
-- Resolve a intenção "buscar" SEM gastar chamada extra de IA.
-- ---------------------------------------------------------------------
create or replace function public.buscar_peca(termo text)
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
    where (p.nome || ' ' || coalesce(p.sinonimos, '')) % termo   -- usa índice gin_trgm
    order by score desc
    limit 3;
$$;

-- ---------------------------------------------------------------------
-- dar_baixa_estoque(p_sku, p_qtd): decremento ATÔMICO + log no histórico.
-- Retorna a quantidade restante (ou erro de negócio controlado).
-- ---------------------------------------------------------------------
create or replace function public.dar_baixa_estoque(
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
    where e.sku = p_sku
    for update;                       -- lock da linha: evita corrida

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
        where sku = p_sku;

    insert into public.historico_servicos (descricao_servico, pecas_utilizadas, operador)
    values (
        p_descricao,
        jsonb_build_array(jsonb_build_object('sku', p_sku, 'qtd', p_qtd)),
        p_operador
    );

    return query select 'OK'::text, (v_atual - p_qtd), v_nome;
end;
$$;
