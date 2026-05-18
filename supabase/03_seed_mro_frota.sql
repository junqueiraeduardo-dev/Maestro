-- =====================================================================
-- Seed para os nichos: Manutenção Industrial (MRO) e Frota Pesada/Agro.
-- Rodar DEPOIS de 01_schema.sql e 02_rpc.sql.
-- Idempotente: pode rodar de novo sem duplicar (ON CONFLICT por SKU).
--
-- "segmento": 'mro' (fábrica) | 'frota' (caminhão/colheitadeira/trator).
-- "sinonimos": como o operador FALA (sem acento, gírias) -> busca por voz.
-- "categoria": nome do KIT/serviço -> usado pela intenção "kit".
-- =====================================================================

-- Coluna de segmento (não existe no 01_schema). Idempotente.
alter table public.estoque_pecas
    add column if not exists segmento text;

-- ---------------------------------------------------------------------
-- MANUTENÇÃO INDUSTRIAL / MRO
-- ---------------------------------------------------------------------
insert into public.estoque_pecas
    (nome, sku, quantidade, localizacao_fisica, sinonimos, categoria, segmento)
values
('Rolamento Rígido de Esferas SKF 6205-2RS', 'ROL-6205', 24, 'Gaveta R1',
 'rolamento,6205,esfera,mancal,rolamento de esfera', 'rolamentos', 'mro'),
('Correia Trapezoidal A-42',                 'COR-A42',  18, 'Painel C2',
 'correia,trapezoidal,correia v,a42,correia a 42', 'transmissao', 'mro'),
('Retentor de Eixo 35x52x7',                 'RET-355207', 30, 'Gaveta R2',
 'retentor,vedacao,selo,retentor 35 52,vedador', 'vedacao', 'mro'),
('Graxa Industrial EP2 1kg',                 'GRA-EP2',  15, 'Prateleira L1',
 'graxa,lubrificante,ep2,graxa de rolamento,graxa industrial', 'revisao 500 horas', 'mro'),
('Sensor Indutivo PNP M18',                  'SEN-M18',  12, 'Armario A3',
 'sensor,indutivo,proximidade,m18,sensor de presenca', 'automacao', 'mro'),
('Contator Tripolar 25A 220V',               'CTT-25A',  10, 'Painel E1',
 'contator,contactor,25a,partida,contator tripolar', 'eletrica', 'mro'),
('Disjuntor-Motor 6-10A',                    'DJM-610',   8, 'Painel E1',
 'disjuntor,disjuntor motor,termomagnetico,protecao motor', 'eletrica', 'mro'),
('Mangueira Hidráulica R2 1/2"',             'MAN-R2-12', 40, 'Carretel H1',
 'mangueira,hidraulica,r2,meia polegada,mangueira hidraulica', 'hidraulica', 'mro'),
('Filtro Coalescente de Ar Comprimido 1/2"', 'FAC-12',    9, 'Prateleira P2',
 'filtro,ar comprimido,pneumatico,coalescente,filtro de ar comprimido', 'pneumatica', 'mro')
on conflict (sku) do nothing;

-- ---------------------------------------------------------------------
-- FROTA PESADA / AGRO  (caminhão, colheitadeira, trator)
-- ---------------------------------------------------------------------
insert into public.estoque_pecas
    (nome, sku, quantidade, localizacao_fisica, sinonimos, categoria, segmento)
values
('Filtro de Combustível Separador de Água Racor', 'FIL-COMB', 20, 'Prateleira F3',
 'filtro combustivel,diesel,separador de agua,racor,filtro de diesel', 'revisao 500 horas', 'frota'),
('Filtro de Óleo Motor Diesel',                   'FIL-OLEO-D', 22, 'Prateleira F3',
 'filtro de oleo,filtro oleo motor,diesel,lubrificacao', 'troca de oleo motor', 'frota'),
('Óleo Hidráulico ISO 68 (Balde 20L)',            'OLE-H68',  14, 'Tanque T1',
 'oleo hidraulico,iso 68,fluido hidraulico,oleo hidraulico 68', 'revisao 500 horas', 'frota'),
('Óleo Motor 15W40 Diesel (Balde 20L)',           'OLE-1540', 16, 'Tanque T2',
 'oleo motor,15w40,diesel,oleo de motor,lubrificante motor', 'troca de oleo motor', 'frota'),
('Correia do Alternador Poly-V',                  'COR-ALT',  13, 'Painel C3',
 'correia,alternador,poly v,correia do alternador,correia dentada', 'transmissao', 'frota'),
('Bico Injetor Diesel',                           'BIC-INJ',   6, 'Armario I2',
 'bico,injetor,bico injetor,injecao,diesel', 'injecao', 'frota'),
('Lona de Freio (jogo)',                          'FRE-LONA',  9, 'Prateleira FR1',
 'lona,lona de freio,sapata,jogo de freio,freio', 'kit de freios', 'frota'),
('Pneu Agrícola 18.4-34',                         'PNE-1834',  4, 'Patio Y1',
 'pneu,pneu agricola,trator,18.4,pneu de trator', 'pneus', 'frota'),
('Elemento Filtrante de Ar do Motor',             'FIL-AR-EL', 17, 'Prateleira F4',
 'filtro de ar,elemento filtrante,filtro ar motor,ar do motor', 'troca de oleo motor', 'frota'),
('Kit Embreagem (platô + disco + rolamento)',     'KIT-EMB',   5, 'Bancada B2',
 'embreagem,plato,disco,kit de embreagem,rolamento de embreagem', 'embreagem', 'frota')
on conflict (sku) do nothing;
