-- =====================================================================
-- Maestro — Chave Premium TEMPORÁRIA pra entrega na tela (sem e-mail).
-- Rodar DEPOIS de 09_assinaturas.sql. Idempotente.
--
-- POR QUÊ:
--  Hoje a chave só é entregue por e-mail (Resend). Pra rodar em custo zero
--  (sem comprar domínio pro Resend), a chave precisa aparecer na tela do
--  cliente assim que o Mercado Pago confirma o pagamento.
--
-- COMO:
--  - Guardamos a chave EM TEXTO por 7 dias (chave_temp + chave_temp_until).
--  - Endpoint /api/pay/chave?payment_id=X devolve a chave dentro desse prazo.
--  - Depois de 7 dias, NULL — recuperação tem que ser por validarChave normal
--    (a chave em si continua válida no campo `chave_hash`, igual antes).
--
-- TRADE-OFF DE SEGURANÇA:
--  Plaintext temporário é maior superfície que só-hash. Mitigado por:
--   1) janela curta (7 dias) e índice pra limpeza
--   2) acesso por payment_id do MP (~10-12 dígitos, não enumerável fácil)
--   3) opcional: rate limit no endpoint (não implementado por simplicidade)
-- =====================================================================

alter table public.assinaturas
  add column if not exists chave_temp text,
  add column if not exists chave_temp_until timestamptz;

-- Índice pra cleanup futuro (cron pode rodar `update set null where < now()`)
create index if not exists idx_assin_chave_temp_until
  on public.assinaturas (chave_temp_until)
  where chave_temp is not null;
