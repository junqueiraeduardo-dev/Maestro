-- =====================================================================
-- RESET — esvazia TODOS os dados operacionais para o cliente começar do zero.
-- Rode UMA VEZ no Supabase (SQL Editor) antes de entregar ao cliente.
--
-- ⚠️ DESTRUTIVO E PROPOSITAL: apaga peças, equipamentos, OS, comentários
-- e histórico. As TABELAS e RPCs permanecem (estrutura intacta) — só os
-- registros somem. Use só enquanto não há dados reais do cliente.
-- =====================================================================

truncate table
    public.os_comentarios,
    public.os_pecas,
    public.ordens_servico,
    public.equipamentos,
    public.estoque_pecas,
    public.historico_servicos
restart identity cascade;
