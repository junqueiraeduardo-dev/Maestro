/*
 * ============================================================
 *  CASOS CLÍNICOS — os pacientes da Clínica da Dra. Lara
 * ============================================================
 *
 *  COMO EDITAR
 *  - Cada caso é um objeto dentro da lista `casos` abaixo.
 *  - Para mudar um texto, é só trocar o que está entre aspas.
 *  - Para ADICIONAR um caso, copie um bloco inteiro { ... },
 *    cole no final da lista (antes do `]`), coloque uma vírgula
 *    entre os blocos e troque o `id` por um nome único
 *    (sem espaços nem acentos, ex.: 'hamster-pipoca').
 *
 *  CAMPOS DE CADA CASO
 *  - id ........ identificador único (usado para salvar o progresso).
 *  - nome ...... nome do paciente.
 *  - especie ... ex.: 'Cachorro', 'Gata', 'Coelho'.
 *  - emoji ..... desenho do card (qualquer emoji serve).
 *  - cor ....... cor de fundo do avatar (formato '#rrggbb').
 *  - tutor ..... quem trouxe o paciente.
 *  - queixa .... o que o tutor conta na recepção.
 *  - etapas .... as fases do prontuário, na ordem em que aparecem.
 *                Cada etapa tem:
 *                  titulo     → nome da fase (Anamnese, Exame físico...)
 *                  pergunta   → o que a Dra. Lara precisa decidir
 *                  opcoes     → lista de respostas possíveis
 *                  correta    → posição da resposta certa, contando do 0
 *                               (0 = primeira, 1 = segunda, 2 = terceira...)
 *                  explicacao → aparece depois que ela responde
 *  - desfecho .. mensagem final quando o caso termina.
 *
 *  REGRA DE OURO: conteúdo educativo e simplificado. Nada de doses
 *  de medicamentos — a conduta sempre fala em "o veterinário avalia
 *  e prescreve", nunca em quantidades.
 *
 *  XP: cada etapa acertada de primeira dá +10 XP e concluir o caso
 *  dá +30 XP (os valores ficam em src/data/cargos.js).
 */

export const casos = [
  {
    id: 'thor-vomito',
    nome: 'Thor',
    especie: 'Cachorro · Labrador, 3 anos',
    emoji: '🐕',
    cor: '#f6d8a8',
    tutor: 'Seu Carlos',
    queixa: 'Thor vomitou três vezes desde ontem e quase não comeu. Ontem ele roeu um brinquedo de borracha no quintal.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'Qual pergunta é mais importante fazer ao tutor agora?',
        opcoes: [
          'Se o Thor engoliu algum pedaço do brinquedo e se está fazendo cocô normalmente',
          'Qual é a cor favorita do Thor',
          'Se o Thor já foi a uma exposição de cães',
        ],
        correta: 0,
        explicacao: 'Vômito depois de roer objetos levanta a suspeita de corpo estranho no trato digestivo. Saber se ele engoliu pedaços e se as fezes estão normais ajuda a avaliar uma possível obstrução.',
      },
      {
        titulo: 'Exame físico',
        pergunta: 'Ao palpar o abdômen, o Thor sente dor. O que isso indica?',
        opcoes: [
          'Que ele está só com manha',
          'Que pode haver um problema abdominal que precisa de investigação por imagem',
          'Que ele está com fome',
        ],
        correta: 1,
        explicacao: 'Dor à palpação abdominal é um sinal de alerta. Junto com o histórico, justifica pedir exames de imagem para procurar o objeto.',
      },
      {
        titulo: 'Exames',
        pergunta: 'Qual exame ajuda a localizar um corpo estranho no estômago ou intestino?',
        opcoes: [
          'Exame de urina',
          'Radiografia e/ou ultrassom abdominal',
          'Teste de visão',
        ],
        correta: 1,
        explicacao: 'Radiografia e ultrassom mostram o trato digestivo. Alguns objetos aparecem direto no raio-X; outros são vistos pelos sinais que causam, como alças intestinais dilatadas.',
      },
      {
        titulo: 'Conduta',
        pergunta: 'O exame mostrou um pedaço de borracha obstruindo o intestino. E agora?',
        opcoes: [
          'Mandar para casa e esperar sair sozinho',
          'Encaminhar para remoção (endoscopia ou cirurgia), com suporte de fluidos e dor controlada',
          'Dar comida extra para empurrar o objeto',
        ],
        correta: 1,
        explicacao: 'Obstrução intestinal é uma emergência. A equipe estabiliza o paciente e remove o objeto. O veterinário define o melhor procedimento e os medicamentos de suporte.',
      },
    ],
    desfecho: 'O pedaço de borracha foi retirado e o Thor já está abanando o rabo. Seu Carlos prometeu trocar os brinquedos por outros mais resistentes!',
  },
  {
    id: 'luna-gata-xixi',
    nome: 'Luna',
    especie: 'Gata · SRD, 5 anos',
    emoji: '🐈',
    cor: '#e6d5f2',
    tutor: 'Dona Marta',
    queixa: 'A Luna vai à caixinha de areia várias vezes, faz força e sai quase nada de xixi. Às vezes mia ao tentar.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'Por que esse caso merece atenção rápida?',
        opcoes: [
          'Porque gatos que não conseguem urinar podem ter obstrução urinária, que é uma emergência',
          'Porque gatos detestam caixas de areia',
          'Não merece, é normal gatos fazerem pouco xixi',
        ],
        correta: 0,
        explicacao: 'Esforço para urinar com pouco ou nenhum xixi pode ser obstrução uretral. Sem saída de urina, substâncias tóxicas se acumulam no sangue — por isso é urgente.',
      },
      {
        titulo: 'Exame físico',
        pergunta: 'O que o veterinário palpa para checar se há obstrução?',
        opcoes: [
          'As orelhas',
          'A bexiga — se estiver muito cheia e dura, sugere obstrução',
          'As patas traseiras',
        ],
        correta: 1,
        explicacao: 'Uma bexiga grande, firme e dolorida mesmo com a gata tentando urinar indica que a urina não está conseguindo sair.',
      },
      {
        titulo: 'Exames',
        pergunta: 'A bexiga da Luna está pequena e não há obstrução. Qual exame ajuda a entender a causa?',
        opcoes: [
          'Urinálise (exame de urina) e, se preciso, ultrassom',
          'Raio-X do crânio',
          'Nenhum, só esperar',
        ],
        correta: 0,
        explicacao: 'A urinálise mostra sangue, cristais e sinais de infecção. O ultrassom ajuda a ver cálculos e a parede da bexiga.',
      },
      {
        titulo: 'Conduta',
        pergunta: 'Foi diagnosticada cistite idiopática felina, muito ligada a estresse. O que ajuda na recuperação?',
        opcoes: [
          'Diminuir a água para ela urinar menos',
          'Aumentar a ingestão de água, reduzir o estresse e seguir o tratamento que o veterinário prescrever',
          'Trocar a caixa de areia de lugar todo dia',
        ],
        correta: 1,
        explicacao: 'Mais água (fontes, ração úmida) dilui a urina. Ambiente tranquilo, caixas limpas e enriquecimento ambiental diminuem o estresse, que é um gatilho importante.',
      },
    ],
    desfecho: 'Luna ganhou uma fonte de água nova e um arranhador. Dona Marta mandou foto dela dormindo tranquila!',
  },
  {
    id: 'pipoca-coelho',
    nome: 'Pipoca',
    especie: 'Coelho · Mini Lop, 2 anos',
    emoji: '🐇',
    cor: '#f8e1e7',
    tutor: 'Júlia',
    queixa: 'O Pipoca parou de comer feno desde ontem à noite e não fez bolinhas de cocô hoje. Está quietinho no canto.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'Em coelhos, ficar sem comer e sem fazer cocô por várias horas é…',
        opcoes: [
          'Normal, coelhos fazem jejum',
          'Um sinal de alerta: pode ser estase gastrointestinal',
          'Sinal de que ele está feliz',
        ],
        correta: 1,
        explicacao: 'O intestino do coelho precisa de movimento constante. Parar de comer e de produzir fezes sugere estase gastrointestinal, que pode piorar rápido.',
      },
      {
        titulo: 'Exame físico',
        pergunta: 'Durante o exame, o que é útil avaliar no Pipoca?',
        opcoes: [
          'Os dentes, a hidratação e os sons do intestino',
          'Somente a cor do pelo',
          'O tamanho das orelhas',
        ],
        correta: 0,
        explicacao: 'Dentes crescem a vida toda nos coelhos e problemas dentários podem fazê-lo parar de comer. Hidratação e ruídos intestinais mostram como o trato digestivo está.',
      },
      {
        titulo: 'Diagnóstico',
        pergunta: 'Os dentes estão bons e a radiografia sugere estase. Qual é a base da alimentação saudável de um coelho?',
        opcoes: [
          'Frutas à vontade',
          'Pão e biscoitos',
          'Feno à vontade, com folhas verdes e pouca ração',
        ],
        correta: 2,
        explicacao: 'Feno é rico em fibra, mantém o intestino funcionando e desgasta os dentes. Frutas e petiscos açucarados devem ser raros.',
      },
      {
        titulo: 'Conduta',
        pergunta: 'Qual é a conduta adequada?',
        opcoes: [
          'Suporte com hidratação, controle da dor, estímulo à alimentação e medicamentos prescritos pelo veterinário',
          'Deixar sem comida por mais um dia',
          'Dar banho para animar',
        ],
        correta: 0,
        explicacao: 'O tratamento busca reidratar, aliviar a dor e fazer o intestino voltar a se mover. Banho estressa coelhos e deve ser evitado.',
      },
    ],
    desfecho: 'Na manhã seguinte, o Pipoca devorou o feno e encheu a caixinha de bolinhas. A Júlia chorou de alívio!',
  },
  {
    id: 'mel-gata-filhote',
    nome: 'Mel',
    especie: 'Gata · filhote, 2 meses',
    emoji: '🐱',
    cor: '#fde2c4',
    tutor: 'Pedro',
    queixa: 'Acabei de adotar a Mel! Quero saber o que preciso fazer para ela crescer saudável.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'Numa primeira consulta de filhote, o que é essencial perguntar?',
        opcoes: [
          'De onde ela veio, se já tomou alguma vacina ou vermífugo e como está comendo',
          'Qual o signo dela',
          'Se ela gosta de música',
        ],
        correta: 0,
        explicacao: 'O histórico mostra o que já foi feito e o que falta. Filhotes resgatados muitas vezes chegam sem vacinas e com parasitas.',
      },
      {
        titulo: 'Exame físico',
        pergunta: 'Ao examinar a Mel, há pontinhos pretos no pelo e ela coça bastante. Provável causa?',
        opcoes: [
          'Pulgas',
          'Alergia a leite',
          'Sol demais',
        ],
        correta: 0,
        explicacao: 'Pontinhos pretos (fezes de pulga) e coceira sugerem pulgas. Em filhotes, uma infestação grande pode até causar anemia.',
      },
      {
        titulo: 'Prevenção',
        pergunta: 'Para que servem as vacinas?',
        opcoes: [
          'Para curar doenças que o animal já tem',
          'Para estimular o sistema imune a produzir defesas antes do contato com o agente',
          'Para deixar o pelo mais brilhante',
        ],
        correta: 1,
        explicacao: 'Vacinas contêm antígenos (partes ou formas atenuadas/inativadas do agente) que ensinam o corpo a reagir rápido. É imunização ativa e preventiva.',
      },
      {
        titulo: 'Conduta',
        pergunta: 'Qual é o melhor plano para a Mel?',
        opcoes: [
          'Esperar ela ficar adulta para vacinar',
          'Montar um calendário de vacinas, vermifugação e controle de pulgas definido pelo veterinário',
          'Dar banho todos os dias',
        ],
        correta: 1,
        explicacao: 'Filhotes recebem uma série de doses com intervalos. O veterinário define o protocolo e os produtos adequados à idade e ao peso.',
      },
    ],
    desfecho: 'A Mel saiu com a carteirinha de vacinação novinha e um laço de presente. Pedro já marcou o retorno!',
  },
  {
    id: 'trovao-cavalo',
    nome: 'Trovão',
    especie: 'Cavalo · Mangalarga, 8 anos',
    emoji: '🐴',
    cor: '#e8d3bd',
    tutor: 'Sr. Antônio (haras)',
    queixa: 'O Trovão está olhando para a barriga, cavando o chão com a pata e tentando deitar e rolar. Comeu pouco hoje.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'Esses sinais em cavalos são típicos de…',
        opcoes: [
          'Cólica equina (dor abdominal)',
          'Saudade do dono',
          'Falta de exercício apenas',
        ],
        correta: 0,
        explicacao: '"Cólica" em cavalos é o nome geral para dor abdominal. Olhar para o flanco, cavar e rolar são sinais clássicos.',
      },
      {
        titulo: 'Exame físico',
        pergunta: 'Quais parâmetros ajudam a avaliar a gravidade?',
        opcoes: [
          'Frequência cardíaca, cor das mucosas e sons intestinais',
          'Comprimento da crina',
          'Cor dos cascos',
        ],
        correta: 0,
        explicacao: 'Frequência cardíaca alta, mucosas alteradas e ausência de sons intestinais indicam um quadro mais grave.',
      },
      {
        titulo: 'Curiosidade anatômica',
        pergunta: 'Por que os cavalos são mais vulneráveis a cólicas?',
        opcoes: [
          'Porque têm quatro estômagos',
          'Porque não conseguem vomitar e têm um intestino grosso longo e com curvas',
          'Porque comem muito rápido só à noite',
        ],
        correta: 1,
        explicacao: 'Cavalos são monogástricos (um estômago só), quase não conseguem vomitar e fermentam fibras no ceco e cólon, que são longos e cheios de curvas.',
      },
      {
        titulo: 'Conduta',
        pergunta: 'Qual atitude é correta enquanto o veterinário trata o Trovão?',
        opcoes: [
          'Deixar ele comer à vontade para melhorar',
          'Retirar o alimento, monitorar de perto e seguir o tratamento; casos graves podem precisar de cirurgia',
          'Dar um banho gelado',
        ],
        correta: 1,
        explicacao: 'O alimento é suspenso até a avaliação. O veterinário controla a dor e decide se o caso é clínico ou cirúrgico.',
      },
    ],
    desfecho: 'Foi uma cólica leve e o Trovão respondeu bem ao tratamento. No dia seguinte já pastava tranquilo!',
  },
  {
    id: 'kiwi-calopsita',
    nome: 'Kiwi',
    especie: 'Ave · Calopsita, 4 anos',
    emoji: '🦜',
    cor: '#fff1a8',
    tutor: 'Beatriz',
    queixa: 'O Kiwi está todo arrepiado, dormindo muito durante o dia e parou de cantar.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'Por que aves doentes costumam ser levadas tarde ao veterinário?',
        opcoes: [
          'Porque, como presas na natureza, escondem sinais de doença até estarem bem fracas',
          'Porque aves nunca adoecem',
          'Porque só ficam doentes no inverno',
        ],
        correta: 0,
        explicacao: 'Esconder fraqueza protege a ave de predadores. Quando o tutor percebe penas arrepiadas e apatia, a doença pode já estar avançada.',
      },
      {
        titulo: 'Exame físico',
        pergunta: 'Qual cuidado é importante ao examinar uma ave pequena?',
        opcoes: [
          'Contenção delicada e rápida, sem apertar o tórax',
          'Segurar firme pelo pescoço',
          'Examinar por uma hora seguida',
        ],
        correta: 0,
        explicacao: 'Aves não têm diafragma: elas dependem do movimento do tórax e dos sacos aéreos para respirar. Apertar o peito pode sufocá-las.',
      },
      {
        titulo: 'Manejo',
        pergunta: 'O tutor conta que o Kiwi come praticamente só sementes de girassol. Isso é…',
        opcoes: [
          'Perfeito, é a dieta ideal',
          'Uma dieta desequilibrada, rica em gordura e pobre em vitaminas',
          'Melhor que qualquer ração',
        ],
        correta: 1,
        explicacao: 'Dieta só de sementes é pobre em vitaminas (como a A) e cálcio. O ideal é uma base balanceada, com vegetais adequados e orientação profissional.',
      },
      {
        titulo: 'Conduta',
        pergunta: 'Enquanto aguarda os exames, o que ajuda o Kiwi?',
        opcoes: [
          'Ambiente aquecido, calmo e tratamento prescrito pelo veterinário',
          'Deixar a gaiola perto de uma janela com vento',
          'Banho frio para acordá-lo',
        ],
        correta: 0,
        explicacao: 'Aves doentes perdem calor facilmente. Calor, tranquilidade e suporte são fundamentais enquanto a causa é investigada.',
      },
    ],
    desfecho: 'Com aquecimento, tratamento e dieta nova, o Kiwi voltou a assobiar — inclusive "parabéns pra você"!',
  },
  {
    id: 'bolinha-porquinho',
    nome: 'Bolinha',
    especie: 'Porquinho-da-índia, 1 ano',
    emoji: '🐹',
    cor: '#d9ecd0',
    tutor: 'Rafa',
    queixa: 'A Bolinha está com as gengivas sangrando um pouco, mancando e comendo menos.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'O que é importante saber sobre a alimentação da Bolinha?',
        opcoes: [
          'Se ela recebe vitamina C pela dieta (vegetais frescos e ração específica)',
          'Se ela come carne',
          'Se ela bebe leite',
        ],
        correta: 0,
        explicacao: 'Assim como nós, porquinhos-da-índia não produzem vitamina C — precisam recebê-la todo dia pela alimentação.',
      },
      {
        titulo: 'Diagnóstico',
        pergunta: 'Gengiva sangrando e dor nas articulações combinam com falta de qual vitamina?',
        opcoes: [
          'Vitamina C (escorbuto)',
          'Vitamina D',
          'Vitamina K apenas',
        ],
        correta: 0,
        explicacao: 'A vitamina C é necessária para produzir colágeno. Sem ela, vasos e articulações ficam frágeis: é o escorbuto.',
      },
      {
        titulo: 'Fisiologia',
        pergunta: 'Os dentes dos porquinhos-da-índia…',
        opcoes: [
          'Param de crescer na vida adulta',
          'Crescem a vida toda e precisam de feno para se desgastar',
          'Caem todo ano',
        ],
        correta: 1,
        explicacao: 'Os dentes crescem continuamente. Mastigar feno desgasta e evita pontas que machucam a boca.',
      },
      {
        titulo: 'Conduta',
        pergunta: 'Qual o plano?',
        opcoes: [
          'Corrigir a dieta (feno, vegetais frescos, ração própria) e seguir a suplementação que o veterinário prescrever',
          'Trocar por ração de coelho',
          'Dar só frutas',
        ],
        correta: 0,
        explicacao: 'Ração de coelho não tem a vitamina C de que o porquinho precisa. Dieta correta e suplementação orientada resolvem o quadro.',
      },
    ],
    desfecho: 'Duas semanas depois, a Bolinha voltou saltitante e fazendo "uiiic uiiic" de felicidade!',
  },
  {
    id: 'mimosa-vaca',
    nome: 'Mimosa',
    especie: 'Vaca leiteira · Holandesa, 4 anos',
    emoji: '🐄',
    cor: '#dfe9f5',
    tutor: 'Dona Cida (sítio)',
    queixa: 'Um dos quartos do úbere da Mimosa está quente e inchado, e o leite saiu com grumos.',
    etapas: [
      {
        titulo: 'Anamnese',
        pergunta: 'Inflamação da glândula mamária com alteração no leite é chamada de…',
        opcoes: [
          'Mastite',
          'Gastrite',
          'Dermatite',
        ],
        correta: 0,
        explicacao: 'Mastite é a inflamação da glândula mamária, geralmente causada por bactérias que entram pelo teto.',
      },
      {
        titulo: 'Exame',
        pergunta: 'Qual teste simples, feito no próprio sítio, ajuda a detectar mastite?',
        opcoes: [
          'Teste da caneca de fundo escuro e o CMT (California Mastitis Test)',
          'Teste de gravidez',
          'Medir o comprimento do rabo',
        ],
        correta: 0,
        explicacao: 'A caneca de fundo escuro mostra grumos nos primeiros jatos; o CMT estima células de defesa no leite, indicando inflamação.',
      },
      {
        titulo: 'Ruminantes',
        pergunta: 'Curiosidade: o estômago dos bovinos tem quantos compartimentos?',
        opcoes: [
          'Um',
          'Quatro: rúmen, retículo, omaso e abomaso',
          'Dois',
        ],
        correta: 1,
        explicacao: 'Bovinos são ruminantes. Microrganismos do rúmen digerem a celulose, e o abomaso funciona como o "estômago verdadeiro".',
      },
      {
        titulo: 'Conduta',
        pergunta: 'O que ajuda a tratar e prevenir novos casos?',
        opcoes: [
          'Tratamento prescrito pelo veterinário, respeitar o período de descarte do leite e higiene na ordenha',
          'Vender o leite normalmente durante o tratamento',
          'Ordenhar menos vezes sem higiene',
        ],
        correta: 0,
        explicacao: 'Leite de animais em tratamento pode conter resíduos de medicamentos e deve ser descartado pelo tempo indicado. Higiene na ordenha é a principal prevenção.',
      },
    ],
    desfecho: 'A Mimosa se recuperou e Dona Cida mandou um queijo fresquinho para a clínica. Que delícia!',
  },
];
