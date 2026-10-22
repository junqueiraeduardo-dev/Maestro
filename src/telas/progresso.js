/*
 * Barra de XP (enche com elasticidade e o número conta até o valor
 * novo), promoções de cargo (modal girando + crachá-moeda + confete)
 * e avisos de cartas novas.
 */
import { gsap, reduzido } from '../lib/anim.js';
import { cargos } from '../data/cargos.js';
import { estado, indiceCargo, novasCartas, ouvir, emitir } from '../lib/estado.js';
import { confetePromocao, fogos } from '../lib/efeitos.js';
import { avisar } from '../lib/avisos.js';
import { falar, dancar, vigiar } from './mikasa.js';
import { atualizarPonto } from './cartas.js';

const $ = (s) => document.querySelector(s);
const numero = { v: 0 };
let fila = Promise.resolve(); // promoções em sequência, uma de cada vez

function faixa(xp) {
  const i = indiceCargo(xp);
  const atual = cargos[i];
  const prox = cargos[i + 1];
  const fracao = prox ? (xp - atual.xp) / (prox.xp - atual.xp) : 1;
  return { i, atual, prox, fracao: gsap.utils.clamp(0, 1, fracao) };
}

function escreverCargo(i) {
  $('#cargo-nome').textContent = cargos[i].nome;
  $('#cargo-emoji').textContent = cargos[i].emoji;
}

function contar(ate, duracao = 1.1) {
  return gsap.to(numero, {
    v: ate,
    duration: reduzido() ? 0 : duracao,
    ease: 'power2.out',
    snap: { v: 1 },
    onUpdate: () => ($('#xp-valor').textContent = numero.v),
  });
}

/** Desenha a barra no estado atual, sem animação (abertura / recomeçar). */
export function pintarXP() {
  const { i, prox, fracao } = faixa(estado.xp);
  numero.v = estado.xp;
  $('#xp-valor').textContent = estado.xp;
  $('#xp-meta').textContent = prox ? `/ ${prox.xp}` : '· máximo!';
  escreverCargo(i);
  gsap.set('#xp-barra', { scaleX: fracao });
}

function animarBarra({ antes, depois }) {
  const a = faixa(antes);
  const d = faixa(depois);
  const barra = $('#xp-barra');
  const tl = gsap.timeline();

  if (reduzido()) {
    tl.add(contar(depois)).set(barra, { scaleX: d.fracao });
  } else if (d.i > a.i) {
    // Subiu de cargo: enche até o fim, "estoura" e recomeça do zero.
    tl.to(barra, { scaleX: 1, duration: 0.6, ease: 'power2.out' })
      .to('#xp-brilho', { keyframes: [{ opacity: 1, x: '0%', duration: 0 }, { x: '320%', duration: 0.6, ease: 'power1.inOut' }, { opacity: 0, duration: 0.1 }] }, '<')
      .set(barra, { scaleX: 0 })
      .to(barra, { scaleX: d.fracao, duration: 1.4, ease: 'elastic.out(1, 0.45)' });
    tl.add(contar(depois, 1.6), 0);
  } else {
    tl.to(barra, { scaleX: d.fracao, duration: 1.4, ease: 'elastic.out(1, 0.45)' })
      .fromTo('#xp-brilho', { opacity: 1, x: '-120%' }, { x: '320%', duration: 0.7, ease: 'power1.inOut' }, 0)
      .set('#xp-brilho', { opacity: 0 });
    tl.add(contar(depois), 0);
  }
  $('#xp-meta').textContent = d.prox ? `/ ${d.prox.xp}` : '· máximo!';
  // Número "pula" quando muda
  if (!reduzido()) gsap.fromTo('#xp-valor', { scale: 1.35, display: 'inline-block' }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  return { tl, subiu: d.i > a.i ? d.i : -1 };
}

// ------------------------------------------------------------------
//  PROMOÇÃO
// ------------------------------------------------------------------
function promover(i) {
  return new Promise((pronto) => {
    const c = cargos[i];
    const modal = $('#promocao');
    const caixa = modal.querySelector('.modal__caixa');
    const moeda = modal.querySelector('.cracha__moeda');
    $('#promo-emoji').textContent = c.emoji;
    $('#promo-cargo').textContent = c.nome;
    $('#promo-msg').textContent = c.mensagem;
    escreverCargo(i);
    modal.hidden = false;
    document.body.classList.add('travado');
    vigiar();

    const chefe = i === cargos.length - 1;
    confetePromocao();
    if (chefe) fogos(5500);
    dancar();
    falar('promocao');

    if (reduzido()) {
      gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    } else {
      gsap
        .timeline()
        .fromTo(modal.querySelector('.modal__fundo'), { opacity: 0 }, { opacity: 1, duration: 0.3 })
        // Modal entra com escala e rotação
        .fromTo(caixa, { opacity: 0, scale: 0.2, rotation: -25 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(1.7)' }, 0)
        // Crachá gira como moeda e assenta
        .fromTo(moeda, { rotationY: 0 }, { rotationY: 1080, duration: 1.6, ease: 'power3.out' }, 0.25)
        .from(caixa.querySelectorAll('.promo__cargo, .promo__msg, .btn'), { y: 14, opacity: 0, stagger: 0.1, duration: 0.4 }, 0.7)
        .to(moeda, { y: -6, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    }

    const fechar = () => {
      gsap.killTweensOf(moeda);
      const fim = () => {
        modal.hidden = true;
        gsap.set([modal, caixa, moeda, modal.querySelector('.modal__fundo')], { clearProps: 'all' });
        gsap.set(caixa.querySelectorAll('*'), { clearProps: 'opacity,transform' });
        if (!document.querySelector('.folha:not([hidden]), .surpresa:not([hidden])')) document.body.classList.remove('travado');
        vigiar();
        pronto();
      };
      if (reduzido()) return gsap.to(modal, { opacity: 0, duration: 0.2, onComplete: fim });
      gsap
        .timeline({ onComplete: fim })
        .to(caixa, { scale: 0.6, rotation: 12, opacity: 0, duration: 0.35, ease: 'back.in(1.6)' })
        .to(modal.querySelector('.modal__fundo'), { opacity: 0, duration: 0.25 }, 0.1);
    };
    modal.querySelector('[data-fechar]').addEventListener('click', fechar, { once: true });
  });
}

function anunciarCartas() {
  const novas = novasCartas();
  if (!novas.length) return;
  novas.forEach((c, n) => setTimeout(() => avisar(`💌 Nova carta: ${c.titulo}`, 'carta'), n * 900));
  atualizarPonto();
  emitir('cartas-mudaram');
  falar('cartaNova');
  if (!reduzido()) {
    gsap.fromTo('#cartas-ponto', { scale: 0 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)', delay: 0.4 });
  }
}

export function iniciarProgresso() {
  pintarXP();
  novasCartas(); // cartas já liberadas ao abrir não são reanunciadas
  atualizarPonto();

  ouvir('xp', (dados) => {
    const { tl, subiu } = animarBarra(dados);
    if (subiu >= 0) {
      const barraPronta = new Promise((ok) => tl.eventCallback('onComplete', ok));
      fila = fila.then(() => barraPronta).then(() => promover(subiu)).then(anunciarCartas);
    } else {
      anunciarCartas();
    }
  });
  ouvir('caso-concluido', anunciarCartas);
  ouvir('recomecar', pintarXP);
}
