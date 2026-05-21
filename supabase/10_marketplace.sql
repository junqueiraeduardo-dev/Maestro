-- =====================================================================
-- Maestro — Marketplace: ponto de reposição por peça.
-- Quando qtd < ponto_reposicao, app sugere comprar (Mercado Livre).
-- Rodar DEPOIS de 01..09. Idempotente.
-- =====================================================================

alter table public.estoque_pecas
    add column if not exists ponto_reposicao integer
        check (ponto_reposicao is null or ponto_reposicao >= 0);
