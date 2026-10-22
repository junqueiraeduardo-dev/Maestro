/*
 * Progresso da Lara, salvo no localStorage do aparelho.
 * Nada vai para servidor: cada celular/computador guarda o seu.
 */
import { cargos } from '../data/cargos.js';
import { cartas } from '../data/cartas.js';

const CHAVE = 'clinica-dra-lara:v1';

const inicial = () => ({
  xp: 0,
  casos: {}, // { [idDoCaso]: { feito: true, acertos: 3 } }
  questoes: {}, // { [idDaQuestao]: 'certa' | 'errada' }
  cartasLidas: [], // ids das cartas já abertas
  cartasAvisadas: [], // ids das cartas cujo desbloqueio já foi anunciado
});

function carregar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE));
    if (salvo && typeof salvo === 'object') return { ...inicial(), ...salvo };
  } catch {
    /* sem localStorage (aba anônima) ou dado corrompido: começa do zero */
  }
  return inicial();
}

export const estado = carregar();
export const eventos = new EventTarget();

export function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch {
    /* armazenamento indisponível: o jogo segue funcionando na sessão */
  }
}

export function emitir(nome, detalhe) {
  eventos.dispatchEvent(new CustomEvent(nome, { detail: detalhe }));
}

export function ouvir(nome, fn) {
  eventos.addEventListener(nome, (e) => fn(e.detail));
}

/** Índice do cargo para uma quantidade de XP. */
export function indiceCargo(xp = estado.xp) {
  let i = 0;
  cargos.forEach((c, n) => {
    if (xp >= c.xp) i = n;
  });
  return i;
}

export function ganharXP(quantidade) {
  const antes = estado.xp;
  estado.xp += quantidade;
  salvar();
  emitir('xp', { antes, depois: estado.xp, quantidade });
}

export const casosFeitos = () => Object.values(estado.casos).filter((c) => c.feito).length;
export const questoesCertas = () => Object.values(estado.questoes).filter((q) => q === 'certa').length;

export function cartaLiberada(carta) {
  const r = carta.requisito || { tipo: 'livre' };
  if (r.tipo === 'casos') return casosFeitos() >= r.valor;
  if (r.tipo === 'questoes') return questoesCertas() >= r.valor;
  if (r.tipo === 'cargo') {
    const alvo = cargos.findIndex((c) => c.id === r.valor);
    return alvo >= 0 && indiceCargo() >= alvo;
  }
  return true;
}

/** Cartas liberadas que ainda não foram anunciadas. Marca como anunciadas. */
export function novasCartas() {
  const novas = cartas.filter((c) => cartaLiberada(c) && !estado.cartasAvisadas.includes(c.id));
  if (novas.length) {
    estado.cartasAvisadas.push(...novas.map((c) => c.id));
    salvar();
  }
  return novas;
}

export function recomecar() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* ignora */
  }
  const novo = inicial();
  Object.keys(estado).forEach((k) => delete estado[k]);
  Object.assign(estado, novo);
  emitir('recomecar');
}
