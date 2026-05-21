-- =====================================================================
-- Maestro — Senha por cliente + Preço por peça.
-- Rodar DEPOIS de 01..12. Idempotente.
--
--   - trials.senha_hash : hash scrypt (formato "salt:hash") da senha
--     escolhida pelo cliente no cadastro. NUNCA guarda senha em texto.
--   - estoque_pecas.preco : preço unitário em R$ (para somar o valor
--     total do estoque). Opcional.
-- =====================================================================

alter table public.trials
    add column if not exists senha_hash text;

alter table public.estoque_pecas
    add column if not exists preco numeric(12,2);
