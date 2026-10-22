/*
 * Aba Cartas: envelopes que abrem com a aba girando em 3D,
 * a carta sobe, a foto aparece e o texto surge linha por linha.
 * A carta final abre a chuva de corações e, ao fechar, a surpresa
 * com o bolo de aniversário.
 */
import { gsap, SplitText, ScrollTrigger, reduzido } from '../lib/anim.js';
import { cartas } from '../data/cartas.js';
import { cargos } from '../data/cargos.js';
import { estado, salvar, cartaLiberada, ouvir } from '../lib/estado.js';
import { chuvaDeCoracoes, fogos } from '../lib/efeitos.js';
import { tocar } from '../lib/lottie.js';
import { falar, dancar, vigiar } from './mikasa.js';
import { icone } from '../lib/ilustracoes.js';

const $ = (s) => document.querySelector(s);
let gatilhos = [];

function infoRequisito(c) {
  if (c.textoRequisito) return c.textoRequisito;
  const r = c.requisito || {};
  if (r.tipo === 'cargo') return `Chegue a ${cargos.find((x) => x.id === r.valor)?.nome ?? r.valor}`;
  if (r.tipo === 'casos') return `Conclua ${r.valor} caso(s)`;
  if (r.tipo === 'questoes') return `Acerte ${r.valor} questões`;
  return '';
}

export function atualizarPonto() {
  const novas = cartas.some((c) => cartaLiberada(c) && !estado.cartasLidas.includes(c.id));
  $('#cartas-ponto').hidden = !novas;
}

function render(animar) {
  const el = $('#lista-cartas');
  gatilhos.forEach((t) => t.kill());
  el.innerHTML = '';
  cartas.forEach((c) => {
    const livre = cartaLiberada(c);
    const lida = estado.cartasLidas.includes(c.id);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `envelope ${livre ? '' : 'trancado'} ${livre && !lida ? 'nova' : ''}`;
    b.innerHTML = `
      <span class="envelope__selo">${icone(livre ? (c.final ? 'bolo' : 'coracao') : 'cadeado')}</span>
      <p class="envelope__titulo"></p>
      <p class="envelope__info"></p>`;
    b.querySelector('.envelope__titulo').textContent = livre ? c.titulo : 'Carta lacrada';
    b.querySelector('.envelope__info').textContent = livre ? (lida ? 'Lida · toque para reler' : 'Nova! Toque para abrir') : infoRequisito(c);
    b.setAttribute('aria-disabled', String(!livre));
    b.addEventListener('click', () => (livre ? abrir(c) : balancar(b)));
    el.appendChild(b);
  });
  atualizarPonto();

  if (!animar) return;
  const itens = el.querySelectorAll('.envelope');
  if (reduzido()) return gsap.fromTo(itens, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  gsap.set(itens, { opacity: 0, y: 50, rotation: () => gsap.utils.random(-6, 6) });
  gatilhos = ScrollTrigger.batch(itens, {
    start: 'top 95%',
    once: true,
    onEnter: (lote) => gsap.to(lote, { opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: 'back.out(1.6)', stagger: 0.1 }),
  });
  ScrollTrigger.refresh();
  // Envelopes novos "pulam" chamando atenção
  gsap.to(el.querySelectorAll('.envelope.nova .envelope__selo'), { scale: 1.15, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.8 });
}

function balancar(b) {
  if (reduzido()) return;
  gsap.fromTo(b, { rotation: 0 }, { keyframes: { rotation: [0, -4, 4, -3, 2, 0] }, duration: 0.5, ease: 'power1.out' });
  falar('telas.cartas');
}

// ------------------------------------------------------------------
//  ABRIR CARTA
// ------------------------------------------------------------------
let splitTexto;
let splitSurpresa;

function montarFoto(c) {
  const caixa = $('#carta-foto');
  const reserva = () => {
    caixa.innerHTML = `<div class="foto-reservada">${icone('camera', 'foto-reservada__icone')}<div class="foto-reservada__legenda"></div><small></small></div>`;
    caixa.querySelector('.foto-reservada__legenda').textContent = c.legenda || 'Espaço para uma foto';
    caixa.querySelector('.foto-reservada small').textContent = `Coloque ${c.foto.split('/').pop()} em public/fotos/`;
  };
  reserva();
  if (!c.foto) return;
  const img = new Image();
  img.alt = c.legenda || 'Foto da carta';
  img.decoding = 'async';
  img.onload = () => {
    caixa.innerHTML = '';
    caixa.appendChild(img);
    if (!reduzido()) gsap.from(img, { opacity: 0, scale: 1.08, duration: 0.8 });
  };
  img.src = c.foto;
}

function abrir(c) {
  const cena = $('#carta-aberta');
  const fundo = cena.querySelector('.folha__fundo');
  const envelope = cena.querySelector('.envelope-grande');
  const aba = cena.querySelector('.envelope-grande__aba');
  const papel = $('#carta-papel');
  const textoEl = $('#carta-texto');

  $('#carta-titulo').textContent = c.titulo;
  textoEl.innerHTML = '';
  c.texto.split('\n\n').forEach((par) => {
    const p = document.createElement('p');
    p.textContent = par.replaceAll('\n', ' ');
    textoEl.appendChild(p);
  });
  $('#carta-assinatura').textContent = c.assinatura || '';
  montarFoto(c);
  papel.scrollTop = 0;
  cena.dataset.carta = c.id;

  cena.hidden = false;
  document.body.classList.add('travado');
  splitTexto?.revert();

  if (!estado.cartasLidas.includes(c.id)) {
    estado.cartasLidas.push(c.id);
    salvar();
  }

  if (reduzido()) {
    gsap.set(envelope, { opacity: 0 });
    gsap.fromTo([fundo, papel], { opacity: 0 }, { opacity: 1, duration: 0.3 });
    if (c.final) chuvaDeCoracoes();
    render(false);
    return;
  }

  splitTexto = SplitText.create(textoEl.querySelectorAll('p'), { type: 'lines', linesClass: 'linha' });

  gsap
    .timeline({ onComplete: vigiar })
    .set(papel, { opacity: 0, y: 60, scale: 0.55 })
    .set(aba, { rotationX: 0, zIndex: 4 })
    .set([cena.querySelectorAll('.carta-papel__titulo, .carta-papel__assinatura, .carta-papel__foto'), splitTexto.lines], { opacity: 0 })
    .fromTo(fundo, { opacity: 0 }, { opacity: 1, duration: 0.3 })
    .fromTo(envelope, { opacity: 0, y: 80, scale: 0.7, rotation: -6 }, { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.6, ease: 'back.out(1.6)' }, 0.05)
    // Aba do envelope girando em 3D
    .to(aba, { rotationX: 180, duration: 0.75, ease: 'power2.inOut', transformPerspective: 800 }, '+=0.1')
    .set(aba, { zIndex: 0 }, '-=0.37')
    // A carta sai de dentro do envelope
    .to(papel, { opacity: 1, y: -40, scale: 0.6, duration: 0.45, ease: 'power2.out' })
    .to(envelope, { y: 160, opacity: 0, duration: 0.5, ease: 'power2.in' }, '<0.15')
    .to(papel, { y: 0, scale: 1, duration: 0.7, ease: 'back.out(1.3)' }, '<0.1')
    // Revela foto, título e texto
    .fromTo(cena.querySelector('.carta-papel__foto'), { opacity: 0, rotation: -8, scale: 0.85 }, { opacity: 1, rotation: -1.5, scale: 1, duration: 0.7, ease: 'back.out(1.8)' })
    .fromTo(cena.querySelector('.carta-papel__titulo'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.35')
    .fromTo(splitTexto.lines, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.12 }, '-=0.1')
    .fromTo(cena.querySelector('.carta-papel__assinatura'), { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.5 })
    .add(() => c.final && chuvaDeCoracoes(5000), 1.6);

  render(false);
}

function fechar() {
  const cena = $('#carta-aberta');
  const id = cena.dataset.carta;
  const final = cartas.find((c) => c.id === id)?.final;
  const fim = () => {
    cena.hidden = true;
    gsap.set(cena.querySelectorAll('*'), { clearProps: 'opacity,transform,zIndex' });
    splitTexto?.revert();
    splitTexto = null;
    if (final) surpresa();
    else document.body.classList.remove('travado');
    vigiar();
  };
  if (reduzido()) return gsap.to(cena, { opacity: 0, duration: 0.2, onComplete: () => (gsap.set(cena, { opacity: 1 }), fim()) });
  gsap
    .timeline({ onComplete: fim })
    .to('#carta-papel', { y: 40, opacity: 0, scale: 0.92, duration: 0.3, ease: 'power2.in' })
    .to(cena.querySelector('.folha__fundo'), { opacity: 0, duration: 0.25 }, 0.1);
}

// ------------------------------------------------------------------
//  SURPRESA FINAL
// ------------------------------------------------------------------
function surpresa() {
  const tela = $('#surpresa');
  tela.hidden = false;
  document.body.classList.add('travado');
  tocar(tela.querySelector('[data-lottie]'));
  chuvaDeCoracoes(6000);
  fogos(3500);
  dancar();
  falar('secretas', { segredo: true, duracao: 6 });
  vigiar();
  if (reduzido()) return gsap.fromTo(tela, { opacity: 0 }, { opacity: 1, duration: 0.3 });
  splitSurpresa?.revert();
  splitSurpresa = SplitText.create(tela.querySelector('.surpresa__titulo'), { type: 'words,chars' });
  gsap
    .timeline()
    .fromTo(tela, { opacity: 0 }, { opacity: 1, duration: 0.4 })
    .from(tela.querySelector('.surpresa__lottie'), { scale: 0.3, rotation: -15, duration: 0.9, ease: 'elastic.out(1, 0.5)' }, 0.1)
    .from(splitSurpresa.chars, { y: 30, opacity: 0, rotation: 20, stagger: 0.035, duration: 0.5, ease: 'back.out(2)' }, 0.4)
    .from(tela.querySelectorAll('.surpresa__texto, .btn'), { y: 16, opacity: 0, stagger: 0.12, duration: 0.4 });
}

function fecharSurpresa() {
  const tela = $('#surpresa');
  gsap.to(tela, {
    opacity: 0,
    duration: 0.4,
    onComplete: () => {
      tela.hidden = true;
      gsap.set(tela, { clearProps: 'opacity' });
      splitSurpresa?.revert();
      splitSurpresa = null;
      document.body.classList.remove('travado');
      vigiar();
    },
  });
}

// ------------------------------------------------------------------
export function iniciarCartas() {
  render(false);
  $('#carta-aberta').addEventListener('click', (e) => e.target.closest('[data-fechar]') && fechar());
  $('#surpresa').addEventListener('click', (e) => e.target.closest('[data-fechar]') && fecharSurpresa());
  ouvir('tela', (nome) => {
    if (nome !== 'cartas') return;
    render(true);
    falar('telas.cartas');
  });
  ouvir('cartas-mudaram', () => render(false));
  ouvir('recomecar', () => render(false));
}
