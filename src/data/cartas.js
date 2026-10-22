/*
 * ============================================================
 *  CARTAS DESBLOQUEÁVEIS
 * ============================================================
 *
 *  COMO EDITAR O TEXTO
 *  - Troque `titulo` e `texto`. Para pular linha dentro do texto,
 *    use \n (barra invertida + n). Ex.: 'Primeira linha\nSegunda linha'.
 *  - `assinatura` aparece no fim da carta.
 *
 *  COMO COLOCAR AS FOTOS
 *  - Salve as fotos em  public/fotos/  com os nomes
 *    foto1.jpg, foto2.jpg, foto3.jpg e foto4.jpg.
 *  - O campo `foto` abaixo diz qual arquivo cada carta usa.
 *    Pode trocar para .png ou .webp se preferir (ex.: '/fotos/foto1.png').
 *  - Se a foto não existir, a carta mostra o espaço reservado
 *    tracejado com a `legenda` — nada quebra.
 *  - Dica: fotos em pé (retrato), até ~1500 px de largura, ficam ótimas
 *    e carregam rápido no celular.
 *
 *  QUANDO CADA CARTA ABRE (`requisito`)
 *  - { tipo: 'casos', valor: 1 }    → depois de concluir 1 caso
 *  - { tipo: 'questoes', valor: 5 } → depois de acertar 5 questões
 *  - { tipo: 'cargo', valor: 'residente' } → ao chegar no cargo
 *       (use o `id` do cargo que está em src/data/cargos.js)
 *  - { tipo: 'livre' }              → já começa aberta
 *
 *  `final: true` marca a carta da surpresa final (bolo + chuva de
 *  corações). Deixe só uma carta com `final: true`.
 */

export const cartas = [
  {
    id: 'carta-1',
    titulo: 'Para a minha futura veterinária',
    foto: '/fotos/foto1.jpg',
    legenda: 'Nossa primeira foto juntos',
    requisito: { tipo: 'casos', valor: 1 },
    textoRequisito: 'Conclua seu primeiro atendimento',
    texto:
      'Lara, você acabou de atender seu primeiro paciente!\n\nEu sempre soube que esse jeito carinhoso com os bichinhos ia virar profissão. Esta clínica é pequenininha, mas foi feita com muito amor — igual ao que você sente por eles.',
    assinatura: 'Com todo o meu amor',
  },
  {
    id: 'carta-2',
    titulo: 'Residente, quem diria!',
    foto: '/fotos/foto2.jpg',
    legenda: 'Aquele dia que a gente riu até doer a barriga',
    requisito: { tipo: 'cargo', valor: 'residente' },
    textoRequisito: 'Seja promovida a Residente',
    texto:
      'Promoção merecida!\n\nCada questão que você estuda é um passo a mais rumo à faculdade. Quando bater o cansaço, lembra: eu estou aqui torcendo, com café, abraço e paciência infinita.',
    assinatura: 'Seu maior fã',
  },
  {
    id: 'carta-3',
    titulo: 'Dra. Lara, Veterinária',
    foto: '/fotos/foto3.jpg',
    legenda: 'Você + um bichinho = minha foto favorita',
    requisito: { tipo: 'cargo', valor: 'veterinaria' },
    textoRequisito: 'Chegue ao cargo de Veterinária',
    texto:
      'Olha só quem tem jaleco com nome bordado!\n\nAdmiro sua dedicação, sua curiosidade e o brilho no olho quando você fala de animais. O ENEM não sabe com quem está mexendo.',
    assinatura: 'Orgulhoso de você',
  },
  {
    id: 'carta-4',
    titulo: 'Feliz aniversário, meu amor',
    foto: '/fotos/foto4.jpg',
    legenda: 'A gente, hoje e sempre',
    requisito: { tipo: 'cargo', valor: 'chefe' },
    textoRequisito: 'Torne-se Veterinária-chefe',
    final: true,
    texto:
      'Veterinária-chefe! Você zerou a clínica — e eu nem fiquei surpreso.\n\nFeliz aniversário, Lara. Que este novo ano te leve até a faculdade dos seus sonhos, cheia de pacientes peludos, penudos e escamosos.\n\nE que eu continue do seu lado em cada plantão, cada prova e cada conquista.',
    assinatura: 'Te amo. Feliz aniversário! 🎂',
  },
];
