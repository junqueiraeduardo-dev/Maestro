-- =====================================================================
-- Maestro — Assinaturas Premium (pagamento via Mercado Pago).
-- Rodar DEPOIS de 01..08. Idempotente. RLS ligado sem policy.
--
-- SEGURANÇA: NÃO guarda cartão/Pix. O cartão é digitado no checkout
-- HOSPEDADO do Mercado Pago (PCI deles) e nunca chega ao nosso servidor.
-- Aqui guardamos só: e-mail do assinante, o HASH da chave Premium
-- (nunca a chave em texto), o plano e a validade.
-- =====================================================================

create table if not exists public.assinaturas (
    id            uuid primary key default gen_random_uuid(),
    email         text not null,
    chave_hash    text not null,                 -- sha256(chave) — nunca a chave
    plano         text not null,                 -- mensal | anual | equipe
    status        text not null default 'ativa'  -- ativa | expirada | cancelada
        check (status in ('ativa','expirada','cancelada')),
    valido_ate    timestamptz not null,
    mp_payment_id text unique,                   -- idempotência do webhook
    created_at    timestamptz not null default now()
);
create index if not exists idx_assin_chave on public.assinaturas (chave_hash);
create index if not exists idx_assin_email on public.assinaturas (email);

alter table public.assinaturas enable row level security;
