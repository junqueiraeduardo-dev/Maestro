/*
 * MIKASA — a gatinha preta da clínica.
 *
 * - Entra pulando do canto da tela.
 * - Balão com escala elástica e texto digitado letra por letra.
 * - A cabeça e os olhos seguem o dedo/mouse.
 * - Reações: feliz (acerto), orelhas baixas (erro), dança (promoção).
 * - 30 s sem mexer: boceja e se espreguiça.
 * - 5 toques seguidos: ronrona e conta um segredo de amor.
 * - Se estiver em cima de algum botão, ela se esconde de lado.
 *
 * As falas ficam em src/data/mascote.js.
 */
import { gsap, reduzido } from '../lib/anim.js';
import { falas, NOME } from '../data/mascote.js';
import { cargos } from '../data/cargos.js';
import { indiceCargo } from '../lib/estado.js';

// Formatos dos olhos para o MorphSVG (esquerdo / direito)
const OLHOS = {
  aberto: ['M38 48 C38 41 54 41 54 48 C54 55 38 55 38 48 Z', 'M66 48 C66 41 82 41 82 48 C82 55 66 55 66 48 Z'],
  feliz: ['M38 50 C41 41 51 41 54 50 C50 46 42 46 38 50 Z', 'M66 50 C69 41 79 41 82 50 C78 46 70 46 66 50 Z'],
  fechado: ['M38 48 C42 50.5 50 50.5 54 48 C50 49.5 42 49.5 38 48 Z', 'M66 48 C70 50.5 78 50.5 82 48 C78 49.5 70 49.5 66 48 Z'],
  triste: ['M38 47 C44 45 54 44 54 49 C54 55 38 55 38 47 Z', 'M66 49 C66 44 76 45 82 47 C82 55 66 55 66 49 Z'],
};

const $ = (s) => document.querySelector(s);
let gata, balao, fala, cabeca, tudo, cauda, pupilas, reflexos, olhoE, olhoD, orelhaE, orelhaD, blush, bocaAberta, zzz;
let seguirRot, seguirPX, seguirPY;
let tlFala, tlReacao, timerOcioso, timerPiscar;
let escondida = false;
let ocupada = false; // durante reações longas (bocejo, ronrom, dança)
let lado = 1; // 1 = canto direito (celular); -1 = canto esquerdo (computador)

const sorteia = (lista) => lista[Math.floor(Math.random() * lista.length)];
const preencher = (t) => t.replaceAll('{nome}', NOME).replaceAll('{cargo}', cargos[indiceCargo()].nome);

// ------------------------------------------------------------------
//  FALA
// ------------------------------------------------------------------
/** Mostra um texto no balão, digitado letra por letra. */
export function dizer(texto, { segredo = false, duracao } = {}) {
  if (!balao || !texto) return;
  // Escondida (para não cobrir um botão), ela só fala segredos.
  if (escondida && !segredo) return;
  const deCima = lado === 1; // no celular o balão desce do topo
  texto = preencher(texto);
  tlFala?.kill();
  balao.classList.toggle('segredo', segredo);
  // Um "fantasma" invisível com o texto inteiro reserva o tamanho do
  // balão; assim ele não pula enquanto as letras aparecem.
  fala.innerHTML = '<span class="mk-fantasma"></span><span class="mk-digitado"></span>';
  const [fantasma, digitado] = fala.children;
  fantasma.textContent = texto;
  const tempoLeitura = duracao ?? Math.max(3.2, texto.length * 0.06);

  if (reduzido()) {
    digitado.textContent = texto;
    tlFala = gsap
      .timeline()
      .fromTo(balao, { opacity: 0, scale: 1 }, { opacity: 1, duration: 0.25 })
      .to(balao, { opacity: 0, duration: 0.25 }, `+=${tempoLeitura}`);
    return;
  }

  const contador = { n: 0 };
  tlFala = gsap
    .timeline()
    .fromTo(balao, { opacity: 0, scale: 0.2, y: deCima ? -12 : 12 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
    .to(
      contador,
      {
        n: texto.length,
        duration: Math.min(2.6, texto.length * 0.03),
        ease: 'none',
        onUpdate: () => (digitado.textContent = texto.slice(0, Math.round(contador.n))),
      },
      0.12,
    )
    .to(balao, { opacity: 0, scale: 0.85, y: deCima ? -6 : 6, duration: 0.3, ease: 'power2.in' }, `+=${tempoLeitura}`);
}

/** Fala uma frase sorteada de um grupo de src/data/mascote.js. */
export function falar(grupo, opcoes) {
  const lista = grupo.split('.').reduce((o, k) => o?.[k], falas);
  if (Array.isArray(lista) && lista.length) dizer(sorteia(lista), opcoes);
}

// ------------------------------------------------------------------
//  EXPRESSÕES
// ------------------------------------------------------------------
function olhos(forma, duracao = 0.25) {
  const [e, d] = OLHOS[forma];
  const aberto = forma === 'aberto' || forma === 'triste';
  const tl = gsap.timeline();
  tl.to(olhoE, { morphSVG: e, duration: duracao, ease: 'power2.inOut' }, 0)
    .to(olhoD, { morphSVG: d, duration: duracao, ease: 'power2.inOut' }, 0)
    .to([...pupilas, ...reflexos], { opacity: aberto ? 1 : 0, duration: duracao * 0.6 }, 0);
  return tl;
}

function voltarAoNormal() {
  return gsap
    .timeline()
    .add(olhos('aberto'), 0)
    .to(orelhaE, { rotation: 0, duration: 0.4, ease: 'back.out(2)' }, 0)
    .to(orelhaD, { rotation: 0, duration: 0.4, ease: 'back.out(2)' }, 0)
    .to(blush, { opacity: 0, duration: 0.4 }, 0)
    .to(tudo, { rotation: 0, x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.4 }, 0)
    .to(bocaAberta, { scale: 0, duration: 0.25 }, 0);
}

function nova(tl) {
  tlReacao?.kill();
  tlReacao = tl;
  return tl;
}

export function reagir(tipo) {
  if (!gata) return;
  if (reduzido()) {
    gsap.fromTo(gata, { opacity: 0.6 }, { opacity: 1, duration: 0.3 });
    return;
  }
  if (tipo === 'feliz') {
    nova(
      gsap
        .timeline()
        .add(olhos('feliz'), 0)
        .to(blush, { opacity: 0.75, duration: 0.3 }, 0)
        .to(tudo, { y: -16, duration: 0.22, ease: 'power2.out', svgOrigin: '60 128' }, 0)
        .to(tudo, { y: 0, duration: 0.5, ease: 'bounce.out' })
        .to(cauda, { rotation: 18, duration: 0.12, yoyo: true, repeat: 5, svgOrigin: '86 116' }, 0)
        .add(voltarAoNormal(), '+=0.9'),
    );
  } else if (tipo === 'triste') {
    nova(
      gsap
        .timeline()
        .add(olhos('triste', 0.3), 0)
        .to(orelhaE, { rotation: -32, duration: 0.45, ease: 'power2.out' }, 0)
        .to(orelhaD, { rotation: 32, duration: 0.45, ease: 'power2.out' }, 0)
        .to(tudo, { y: 3, scaleY: 0.96, duration: 0.45, svgOrigin: '60 128' }, 0)
        .add(voltarAoNormal(), '+=1.6'),
    );
  }
}

export function dancar() {
  if (!gata || reduzido()) return;
  ocupada = true;
  const passos = gsap.timeline({ repeat: 3 });
  passos
    .to(tudo, { rotation: -12, y: -10, duration: 0.22, ease: 'sine.out', svgOrigin: '60 128' })
    .to(tudo, { rotation: 0, y: 0, duration: 0.18, ease: 'sine.in' })
    .to(tudo, { rotation: 12, y: -10, duration: 0.22, ease: 'sine.out' })
    .to(tudo, { rotation: 0, y: 0, duration: 0.18, ease: 'sine.in' });
  nova(
    gsap
      .timeline({ onComplete: () => (ocupada = false) })
      .add(olhos('feliz'), 0)
      .to(blush, { opacity: 0.8, duration: 0.3 }, 0)
      .to(cauda, { rotation: 22, duration: 0.16, yoyo: true, repeat: 19, svgOrigin: '86 116' }, 0)
      .add(passos, 0)
      .add(voltarAoNormal()),
  );
}

function bocejar() {
  if (!gata || ocupada || escondida || reduzido()) return;
  ocupada = true;
  nova(
    gsap
      .timeline({ onComplete: () => (ocupada = false) })
      // boceja
      .add(olhos('fechado', 0.4), 0)
      .to(cabeca, { rotation: -10, duration: 0.6, ease: 'sine.inOut', svgOrigin: '60 76' }, 0)
      .to(bocaAberta, { scale: 1, duration: 0.6, ease: 'sine.out', transformOrigin: '50% 30%' }, 0.1)
      .to(bocaAberta, { scale: 0, duration: 0.35, ease: 'sine.in' }, 1.4)
      .to(cabeca, { rotation: 0, duration: 0.5 }, 1.4)
      // se espreguiça
      .to(tudo, { scaleX: 1.14, scaleY: 0.86, duration: 0.7, ease: 'sine.inOut', svgOrigin: '60 128' }, 1.7)
      .to(cauda, { rotation: -25, duration: 0.7, ease: 'sine.inOut', svgOrigin: '86 116' }, 1.7)
      .to(tudo, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1, 0.4)' }, 2.5)
      .to(cauda, { rotation: 0, duration: 0.6 }, 2.5)
      .fromTo(zzz, { opacity: 0, y: 0 }, { opacity: 1, y: -14, duration: 0.8 }, 0.4)
      .to(zzz, { opacity: 0, y: -26, duration: 0.6 }, 1.4)
      .add(olhos('aberto'), 2.6),
  );
  falar('ociosa');
}

function ronronar() {
  if (!gata) return;
  falar('secretas', { segredo: true, duracao: 6 });
  if (reduzido()) return;
  ocupada = true;
  // Corações e "rrr" subindo
  const raiz = $('#mikasa');
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    s.className = 'mikasa__ronrom';
    if (i % 3 === 0) s.textContent = 'rrr';
    else s.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/></svg>';
    raiz.appendChild(s);
    gsap.fromTo(
      s,
      { x: gsap.utils.random(-30, 20), y: 30, opacity: 0, scale: 0.6 },
      {
        x: `+=${gsap.utils.random(-30, 30)}`,
        y: -70 - Math.random() * 40,
        opacity: 1,
        scale: 1.2,
        duration: 1.6,
        delay: i * 0.18,
        ease: 'power1.out',
        onComplete: () => s.remove(),
      },
    );
    gsap.to(s, { opacity: 0, duration: 0.5, delay: i * 0.18 + 1.1 });
  }
  nova(
    gsap
      .timeline({ onComplete: () => (ocupada = false) })
      .add(olhos('fechado', 0.3), 0)
      .to(blush, { opacity: 0.85, duration: 0.3 }, 0)
      .to(tudo, { x: 0.9, duration: 0.05, repeat: 39, yoyo: true, ease: 'none' }, 0)
      .to(cabeca, { rotation: 8, duration: 0.6, ease: 'sine.inOut', svgOrigin: '60 76' }, 0)
      .add(voltarAoNormal(), 2.4)
      .to(cabeca, { rotation: 0, duration: 0.4 }, 2.4),
  );
}

// ------------------------------------------------------------------
//  ENTRADA, PISCADAS E OLHAR
// ------------------------------------------------------------------
export function entrar() {
  return new Promise((ok) => {
    gsap.set($('#mikasa'), { autoAlpha: 1 });
    if (reduzido()) {
      gsap.fromTo(gata, { opacity: 0 }, { opacity: 1, duration: 0.4, onComplete: ok });
      return;
    }
    const salto = gsap.timeline({ onComplete: ok });
    salto
      .fromTo(gata, { x: 150 * lado, opacity: 0, rotation: 25 * lado }, { x: 0, opacity: 1, rotation: 0, duration: 0.75, ease: 'power1.out' }, 0)
      .fromTo(gata, { y: lado === 1 ? 60 : 30 }, { keyframes: [{ y: lado === 1 ? -30 : -90, duration: 0.38, ease: 'power2.out' }, { y: 0, duration: 0.37, ease: 'power2.in' }] }, 0)
      .to(gata, { scaleY: 0.78, scaleX: 1.15, duration: 0.1, ease: 'power2.out', transformOrigin: '50% 100%' })
      .to(gata, { scaleY: 1, scaleX: 1, duration: 0.7, ease: 'elastic.out(1.1, 0.35)' });
  });
}

function piscar() {
  clearTimeout(timerPiscar);
  timerPiscar = setTimeout(() => {
    if (!ocupada && !reduzido()) {
      gsap.to([olhoE, olhoD, ...pupilas, ...reflexos], {
        scaleY: 0.1,
        transformOrigin: '50% 50%',
        duration: 0.08,
        yoyo: true,
        repeat: 1,
        ease: 'power1.inOut',
      });
    }
    piscar();
  }, 2500 + Math.random() * 3500);
}

function seguirPonteiro(e) {
  if (reduzido() || ocupada || escondida) return;
  const r = gata.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height * 0.38;
  const dx = gsap.utils.clamp(-1, 1, (e.clientX - cx) / 320);
  const dy = gsap.utils.clamp(-1, 1, (e.clientY - cy) / 320);
  seguirRot(dx * 14 + dy * 3 * Math.sign(dx || 1));
  seguirPX(dx * 3);
  seguirPY(dy * 2.4);
}

// ------------------------------------------------------------------
//  NÃO COBRIR BOTÕES
// ------------------------------------------------------------------
const SELETOR_BOTOES = 'button:not(#mikasa-gata), a[href], .opcao, input, select';

function cobreBotao() {
  // Mede a posição "normal" dela (sem o deslocamento de esconder).
  const r = gata.getBoundingClientRect();
  const deslocamento = Number(gsap.getProperty(gata, 'x')) || 0;
  const caixa = { left: r.left - deslocamento + 6, right: r.right - deslocamento - 6, top: r.top + 8, bottom: r.bottom - 2 };
  for (const el of document.querySelectorAll(SELETOR_BOTOES)) {
    if (el.closest('#mikasa, [hidden]')) continue;
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    if (b.right > caixa.left && b.left < caixa.right && b.bottom > caixa.top && b.top < caixa.bottom) return true;
  }
  return false;
}

let checagemAgendada = false;
export function vigiar() {
  if (checagemAgendada || !gata) return;
  checagemAgendada = true;
  requestAnimationFrame(() => {
    checagemAgendada = false;
    const cobre = cobreBotao();
    if (cobre === escondida) return;
    escondida = cobre;
    gata.style.pointerEvents = cobre ? 'none' : '';
    gsap.to(gata, {
      x: cobre ? lado * 115 + '%' : 0,
      opacity: cobre ? 0 : 1,
      rotation: cobre ? lado * 20 : 0,
      duration: reduzido() ? 0.2 : 0.45,
      ease: cobre ? 'power2.in' : 'back.out(1.6)',
      overwrite: 'auto',
    });
    if (cobre) gsap.to(balao, { opacity: 0, duration: 0.2 });
  });
}

// ------------------------------------------------------------------
//  OCIOSIDADE E TOQUES
// ------------------------------------------------------------------
function reiniciarOcioso() {
  clearTimeout(timerOcioso);
  timerOcioso = setTimeout(() => {
    bocejar();
    reiniciarOcioso();
  }, 30000);
}

let toques = 0;
let ultimoToque = 0;
function tocouNaGata() {
  const agora = performance.now();
  toques = agora - ultimoToque < 1300 ? toques + 1 : 1;
  ultimoToque = agora;

  if (toques >= 5) {
    toques = 0;
    ronronar();
    return;
  }
  if (!reduzido() && !ocupada) {
    gsap.fromTo(gata, { scaleY: 0.86, scaleX: 1.1 }, { scaleY: 1, scaleX: 1, duration: 0.6, ease: 'elastic.out(1, 0.35)', transformOrigin: '50% 100%' });
  }
  if (toques === 1) falar('dicas');
}

// ------------------------------------------------------------------
export function iniciarMikasa() {
  gata = $('#mikasa-gata');
  balao = $('#mikasa-balao');
  fala = $('#mikasa-fala');
  cabeca = $('#mk-cabeca');
  tudo = $('#mk-tudo');
  cauda = $('#mk-cauda');
  olhoE = $('#mk-olho-e');
  olhoD = $('#mk-olho-d');
  orelhaE = $('#mk-orelha-e');
  orelhaD = $('#mk-orelha-d');
  bocaAberta = $('#mk-boca-aberta');
  zzz = $('#mk-zzz');
  pupilas = [$('#mk-pupila-e'), $('#mk-pupila-d')];
  reflexos = [$('#mk-reflexo-e'), $('#mk-reflexo-d')];
  blush = [$('#mk-blush-e'), $('#mk-blush-d')];

  const telaGrande = window.matchMedia('(min-width: 720px)');
  lado = telaGrande.matches ? -1 : 1;
  telaGrande.addEventListener('change', (e) => {
    lado = e.matches ? -1 : 1;
    vigiar();
  });

  gsap.set($('#mikasa'), { autoAlpha: 0 });
  gsap.set(bocaAberta, { scale: 0, transformOrigin: '50% 30%' });
  gsap.set(orelhaE, { svgOrigin: '42 42' });
  gsap.set(orelhaD, { svgOrigin: '78 42' });
  gsap.set(cabeca, { svgOrigin: '60 76' });
  gsap.set(tudo, { svgOrigin: '60 128' });
  gsap.set(cauda, { svgOrigin: '86 116' });

  seguirRot = gsap.quickTo(cabeca, 'rotation', { duration: 0.6, ease: 'power3' });
  seguirPX = gsap.quickTo(pupilas.concat(reflexos), 'x', { duration: 0.4, ease: 'power3' });
  seguirPY = gsap.quickTo(pupilas.concat(reflexos), 'y', { duration: 0.4, ease: 'power3' });

  window.addEventListener('pointermove', seguirPonteiro, { passive: true });
  window.addEventListener('pointerdown', seguirPonteiro, { passive: true });
  ['pointerdown', 'keydown', 'scroll', 'wheel', 'touchstart'].forEach((ev) =>
    window.addEventListener(ev, reiniciarOcioso, { passive: true, capture: true }),
  );
  window.addEventListener('pointermove', () => reiniciarOcioso(), { passive: true });
  gata.addEventListener('click', tocouNaGata);

  // Vigia sobreposição com botões: ao rolar, redimensionar e periodicamente
  window.addEventListener('resize', vigiar, { passive: true });
  setInterval(vigiar, 700);

  // Cauda balançando de leve o tempo todo
  if (!reduzido()) {
    gsap.to(cauda, { rotation: 7, svgOrigin: '86 116', duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }

  piscar();
  reiniciarOcioso();
}
