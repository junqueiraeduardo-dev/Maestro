-- =====================================================================
-- Maestro — Perfil por item (isolamento por profissão).
-- Cada peça/equipamento é tagueada com o perfil em que foi cadastrada.
-- Listagem filtra pelo perfil atual; NULL = visível a todos (compat).
-- Rodar DEPOIS de 01..11. Idempotente.
-- =====================================================================

alter table public.estoque_pecas
    add column if not exists perfil text;

alter table public.equipamentos
    add column if not exists perfil text;

create index if not exists idx_pecas_perfil on public.estoque_pecas (perfil);
create index if not exists idx_equip_perfil on public.equipamentos (perfil);
