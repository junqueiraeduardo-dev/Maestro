-- =====================================================================
-- Coluna de segmento para o estoque (MRO x Frota/Agro).
-- Rodar DEPOIS de 01_schema.sql e 02_rpc.sql.
-- Idempotente. SEM dados de exemplo: o cliente cadastra o próprio estoque.
--
-- "segmento": 'mro' (fábrica) | 'frota' (caminhão/colheitadeira/trator).
-- =====================================================================

alter table public.estoque_pecas
    add column if not exists segmento text;
