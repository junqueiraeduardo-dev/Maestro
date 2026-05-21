-- =====================================================================
-- Maestro — Isolamento multi-tenant dos workspaces (LGPD + segurança).
-- Rodar DEPOIS de 11_workspaces.sql e 14_chave_temp.sql. Idempotente.
--
-- PROBLEMA RESOLVIDO:
--  Antes desta migração, qualquer usuário autenticado (premium ou trial)
--  podia ler/escrever em QUALQUER workspace mandando o UUID no header
--  X-Workspace-Id. Cliente A podia ver dados do cliente B se descobrisse
--  o UUID dele (e o GET /api/workspaces listava todos).
--
-- COMO FUNCIONA AGORA:
--  Cada workspace tem `owner_email` — o e-mail que o criou.
--  O middleware no servidor lê o e-mail do token e EXIGE que o workspace
--  alvo pertença a esse e-mail (admin/senha mestra bypassa).
--
-- COMPATIBILIDADE COM DADOS EXISTENTES:
--  Workspaces sem dono (criados antes desta migração) ficam com
--  owner_email = NULL — o middleware trata isso como "pertence ao admin"
--  (compatibilidade pra não quebrar workspace "principal" inicial).
-- =====================================================================

alter table public.workspaces
  add column if not exists owner_email text;

-- Índice por dono pra GET /api/workspaces filtrar rápido
create index if not exists idx_workspaces_owner
  on public.workspaces (owner_email);
