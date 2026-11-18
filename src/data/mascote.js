/*
 * ============================================================
 *  FALAS DA MIKASA — a gatinha preta mascote da clínica
 * ============================================================
 *
 *  COMO EDITAR
 *  - Cada grupo abaixo é uma lista de frases. Quando a situação
 *    acontece, a Mikasa sorteia UMA frase do grupo.
 *  - Para adicionar uma fala, coloque uma nova linha entre aspas
 *    com vírgula no final. Ex.:  'Miau! Nova fala aqui',
 *  - Para tirar uma fala, apague a linha inteira.
 *  - Frases curtas ficam melhores no balão (até ~110 caracteres).
 *  - Use {nome} para inserir o apelido (NOME, logo abaixo) e {cargo} para o cargo atual.
 *
 *  GRUPOS
 *  - boasVindas ... quando o site abre.
 *  - telas ........ quando ela entra em cada aba (inicio, atendimentos,
 *                   estudo, cartas).
 *  - dicas ........ dicas aleatórias quando ela toca na Mikasa.
 *  - acerto / erro  reações às respostas.
 *  - casoConcluido  quando termina um atendimento.
 *  - promocao ..... quando sobe de cargo.
 *  - cartaNova .... quando uma carta é desbloqueada.
 *  - ociosa ....... quando ela fica 30 segundos parada (bocejo).
 *  - secretas ..... falas de amor quando ela toca 5 vezes seguidas
 *                   na Mikasa (a gatinha ronrona).
 */

export const NOME = 'meu amor'; // como a Mikasa chama a aniversariante

export const falas = {
  boasVindas: [
    'Miau, {nome}! Eu sou a Mikasa, sua assistente oficial. Bora atender?',
    'Cheguei! Jaleco no lugar, bigodes alinhados. Vamos trabalhar, doutora?',
  ],

  telas: {
    inicio: [
      'Aqui você vê seu cargo e seu XP. Cada acerto te aproxima de chefe!',
      'Hoje é dia de cuidar de bichinhos e de estudar. Eu fico de olho.',
    ],
    atendimentos: [
      'A sala de espera está cheia! Escolha um paciente.',
      'Leia a queixa com calma. O tutor sempre dá pistas.',
    ],
    estudo: [
      'Biologia e Química do ENEM! Eu sento no teclado só se você deixar.',
      'Errar faz parte. Lê a explicação que fixa melhor!',
    ],
    cartas: [
      'Psiu… essas cartas foram escritas com muito amor.',
      'Cada promoção abre uma carta nova. Eu já li. Mentira, gatos não leem.',
    ],
  },

  dicas: [
    'Dica: cada unidade de pH a menos é 10 vezes mais ácido.',
    'Dica: coelhos e porquinhos-da-índia têm dentes que crescem a vida toda.',
    'Dica: vacina = imunidade ativa; soro = anticorpos prontos.',
    'Dica: gatos não podem ficar sem comer muitos dias — o fígado sofre.',
    'Dica: na mitose, a célula-filha é igual à mãe. Na meiose, o número de cromossomos cai pela metade.',
    'Dica: na dúvida entre duas alternativas, procure a palavra "sempre" ou "nunca". Costumam ser pegadinha.',
    'Sabia que gatos pretos como eu dão sorte? Pelo menos para você, sim.',
  ],

  acerto: [
    'Acertou! Ronrom de aprovação.',
    'Isso! Meus bigodes tremeram de orgulho.',
    'Perfeito, doutora!',
    'Miau-ravilhoso!',
  ],

  erro: [
    'Ops… lê a explicação, depois a gente tenta de novo.',
    'Tudo bem, até eu caio da janela às vezes.',
    'Quase! Respira e vamos de novo.',
  ],

  casoConcluido: [
    'Paciente salvo! Coloca mais um coraçãozinho no seu jaleco.',
    'Mais um tutor feliz saindo pela porta. Você nasceu para isso.',
  ],

  promocao: [
    'PROMOÇÃO! Vou dançar em cima do balcão!',
    'Agora você é {cargo}! Eu sabia!',
  ],

  cartaNova: [
    'Chegou uma carta para você… corre na aba Cartas!',
  ],

  ociosa: [
    'Aaaaahn… *bocejo* … você ainda está aí, doutora?',
    'Vou me espreguiçar aqui enquanto você pensa.',
  ],

  secretas: [
    'Rrrrrr… segredo: ele me pediu para te dizer que você é a pessoa favorita dele no mundo inteiro.',
    'Rrrrrr… ronronando porque sei que alguém te ama muito. Feliz aniversário, {nome}!',
    'Rrrrrr… cá entre nós: ele sorri toda vez que fala de você.',
  ],
};
