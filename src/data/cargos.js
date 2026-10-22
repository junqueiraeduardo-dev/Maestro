/*
 * ============================================================
 *  CARGOS E PONTUAÇÃO (XP)
 * ============================================================
 *
 *  COMO EDITAR
 *  - `cargos`: a carreira da Dra. Lara, em ordem. `xp` é quanto ela
 *    precisa acumular para chegar ao cargo. O primeiro precisa ser 0.
 *  - `emoji` aparece no crachá que gira como moeda na promoção.
 *  - `mensagem` aparece no modal de promoção.
 *  - `XP`: quantos pontos cada ação vale.
 *
 *  Pontuação máxima atual: 8 casos × 70 + 30 questões × 15 = 1010 XP.
 *  Se adicionar conteúdo, pode subir os valores de `xp` dos cargos.
 */

export const cargos = [
  { id: 'estagiaria', nome: 'Estagiária', xp: 0, emoji: '🩺', mensagem: 'Bem-vinda à clínica! Todo grande veterinário começa assim.' },
  { id: 'residente', nome: 'Residente', xp: 150, emoji: '🧪', mensagem: 'Você já atende sozinha os primeiros pacientes. A equipe está orgulhosa!' },
  { id: 'veterinaria', nome: 'Veterinária', xp: 400, emoji: '🐾', mensagem: 'Diploma na parede e jaleco com o seu nome bordado. Dra. Lara, oficialmente!' },
  { id: 'chefe', nome: 'Veterinária-chefe', xp: 750, emoji: '👑', mensagem: 'A clínica inteira agora é sua. Os bichinhos de todo o Brasil agradecem!' },
];

export const XP = {
  etapaCerta: 10, // cada etapa do prontuário acertada na primeira tentativa
  casoConcluido: 30, // bônus ao terminar um caso
  questaoCerta: 15, // primeira vez que acerta cada questão
};
