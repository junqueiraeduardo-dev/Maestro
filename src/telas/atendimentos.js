/*
 * Aba Atender: sala de espera + prontuário.
 *
 * - Cards dos pacientes entram em cascata (ScrollTrigger.batch)
 *   e reagem ao toque (inclinação 3D + "apertadinho").
 * - No prontuário, cada etapa é uma ficha. Ao avançar, a ficha
 *   atual voa para a trilha de concluídas e a próxima sobe da
 *   fila para a mesa — tudo com Flip.
 */
import { gsap, Flip, ScrollTrigger, reduzido } from '../lib/anim.js';
import { casos } from '../data/casos.js';
import { XP } from '../data/cargos.js';
import { estado, salvar, ganharXP, ouvir, emitir, casosFeitos } from '../lib/estado.js';
import { avisar, efeito } from '../lib/avisos.js';
import { montarLottie } from '../lib/lottie.js';
import { estouro } from '../lib/efeitos.js';
import { falar, reagir } from './mikasa.js';
import { pulsarCerta, tremerErrada } from './respostas.js';
import { abrirFolha, fecharFolha } from './folhas.js';

const lista = () => document.getElementById('lista-pacientes');
const corpo = () => document.getElementById('pront-corpo');
let gatilhos = [];

// ------------------------------------------------------------------
//  SALA DE ESPERA
// ------------------------------------------------------------------
function renderLista(animar) {
  const el = lista();
  gatilhos.forEach((t) => t.kill());
  el.innerHTML = '';
  casos.forEach((c) => {
    const feito = estado.casos[c.id]?.feito;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'paciente';
    b.innerHTML = `
      <span class="paciente__avatar" style="background:${c.cor}">${c.emoji}</span>
      <p class="paciente__nome"></p>
      <p class="paciente__especie"></p>
      <p class="paciente__queixa"></p>
      <span class="selo ${feito ? 'selo--ok' : ''}">${feito ? '✓ atendido' : 'aguardando'}</span>`;
    b.querySelector('.paciente__nome').textContent = c.nome;
    b.querySelector('.paciente__especie').textContent = c.especie;
    b.querySelector('.paciente__queixa').textContent = c.queixa;
    b.addEventListener('click', () => abrirCaso(c));
    tocavel(b);
    el.appendChild(b);
  });

  const feitos = casosFeitos();
  document.getElementById('sala-resumo').textContent =
    feitos === casos.length ? 'Todos os pacientes foram atendidos! Pode rever qualquer caso.' : `${casos.length - feitos} pacientes aguardando atendimento.`;

  if (animar) cascata();
}

/** Cards entram em cascata conforme aparecem na tela. */
function cascata() {
  const cards = lista().querySelectorAll('.paciente');
  if (reduzido()) {
    gsap.fromTo(cards, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    return;
  }
  gsap.set(cards, { opacity: 0, y: 40, rotationX: -25, transformPerspective: 700 });
  gatilhos = ScrollTrigger.batch(cards, {
    start: 'top 95%',
    once: true,
    onEnter: (lote) =>
      gsap.to(lote, {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 0.7,
        ease: 'back.out(1.5)',
        stagger: 0.09,
        overwrite: true,
      }),
  });
  ScrollTrigger.refresh();
}

/** Inclinação 3D seguindo o dedo/mouse + "apertadinho" ao tocar. */
function tocavel(card) {
  if (reduzido()) return;
  const rx = gsap.quickTo(card, 'rotationX', { duration: 0.4, ease: 'power3' });
  const ry = gsap.quickTo(card, 'rotationY', { duration: 0.4, ease: 'power3' });
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    ry(((e.clientX - r.left) / r.width - 0.5) * 10);
    rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
  });
  card.addEventListener('pointerleave', () => {
    rx(0);
    ry(0);
  });
  card.addEventListener('pointerdown', () => gsap.to(card, { scale: 0.96, duration: 0.12, ease: 'power2.out' }));
  const soltar = () => gsap.to(card, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  card.addEventListener('pointerup', soltar);
  card.addEventListener('pointercancel', soltar);
  card.addEventListener('pointerleave', soltar);
  // Avatar dá um pulinho ao passar o mouse
  card.addEventListener('pointerenter', () =>
    gsap.fromTo(card.querySelector('.paciente__avatar'), { y: 0 }, { y: -6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.out' }),
  );
}

// ------------------------------------------------------------------
//  PRONTUÁRIO
// ------------------------------------------------------------------
let caso = null;
let etapa = 0;
let tentativas = 0;
let acertos = 0;

function abrirCaso(c) {
  caso = c;
  etapa = 0;
  tentativas = 0;
  acertos = 0;
  const av = document.getElementById('pront-avatar');
  av.textContent = c.emoji;
  av.style.background = c.cor;
  document.getElementById('pront-nome').textContent = c.nome;
  document.getElementById('pront-especie').textContent = `${c.especie} · tutor(a): ${c.tutor}`;

  const el = corpo();
  el.scrollTop = 0;
  el.innerHTML = `
    <p class="queixa"></p>
    <div class="trilha" aria-label="Etapas concluídas"></div>
    <section class="mesa">
      <div class="mesa__slot"></div>
      <div class="mesa__conteudo"></div>
    </section>
    <div class="fila"><span class="fila__rotulo">Próximas</span></div>`;
  el.querySelector('.queixa').textContent = c.queixa;

  const fila = el.querySelector('.fila');
  c.etapas.forEach((et, i) => {
    const chip = document.createElement('span');
    chip.className = 'ficha';
    chip.dataset.flipId = `etapa-${i}`;
    chip.innerHTML = `<b>${i + 1}</b><span></span>`;
    chip.lastChild.textContent = et.titulo;
    fila.appendChild(chip);
  });

  // Primeira ficha vai direto para a mesa
  el.querySelector('.mesa__slot').appendChild(fila.querySelector('.ficha'));
  atualizarFila();
  renderEtapa();

  abrirFolha(document.getElementById('prontuario'), () => {
    if (reduzido()) return;
    gsap.from(el.querySelectorAll('.queixa, .trilha, .mesa, .fila'), { opacity: 0, y: 18, stagger: 0.08, duration: 0.45 });
  });
}

function atualizarFila() {
  const fila = corpo().querySelector('.fila');
  fila.hidden = !fila.querySelector('.ficha');
}

function renderEtapa() {
  const et = caso.etapas[etapa];
  const cont = corpo().querySelector('.mesa__conteudo');
  cont.innerHTML = `
    <p class="etapa__pergunta"></p>
    <ul class="opcoes">
      ${et.opcoes.map((_, i) => `<li><button class="opcao" type="button" data-i="${i}"><span class="opcao__letra">${'ABCDE'[i]}</span><span class="opcao__texto"></span></button></li>`).join('')}
    </ul>
    <div class="mesa__resultado"></div>`;
  cont.querySelector('.etapa__pergunta').textContent = et.pergunta;
  cont.querySelectorAll('.opcao__texto').forEach((s, i) => (s.textContent = et.opcoes[i]));
  cont.querySelectorAll('.opcao').forEach((b) => b.addEventListener('click', () => responder(b, Number(b.dataset.i))));
  tentativas = 0;
}

function responder(botao, i) {
  const et = caso.etapas[etapa];
  const cont = corpo().querySelector('.mesa__conteudo');
  tentativas++;

  if (i !== et.correta) {
    botao.classList.add('errada');
    botao.disabled = true;
    tremerErrada(botao);
    reagir('triste');
    falar('erro');
    const res = cont.querySelector('.mesa__resultado');
    res.innerHTML = '<p class="dica-erro">Hmm, não é bem isso. Pense no paciente e tente outra opção.</p>';
    efeito(res.firstChild, 'headShake');
    return;
  }

  cont.querySelectorAll('.opcao').forEach((b) => {
    b.disabled = true;
    if (b !== botao && !b.classList.contains('errada')) b.classList.add('apagada');
  });
  botao.classList.add('certa');
  pulsarCerta(botao);
  reagir('feliz');
  falar('acerto');

  if (tentativas === 1) {
    acertos++;
    // Cada etapa só pontua uma vez, mesmo se ela sair e voltar ao caso.
    const registro = (estado.casos[caso.id] ??= {});
    registro.pontuadas ??= [];
    if (!registro.feito && !registro.pontuadas.includes(etapa)) {
      registro.pontuadas.push(etapa);
      avisar(`+${XP.etapaCerta} XP`, 'xp');
      ganharXP(XP.etapaCerta);
    }
  }

  const ultima = etapa === caso.etapas.length - 1;
  const res = cont.querySelector('.mesa__resultado');
  res.innerHTML = `
    <div class="explicacao explicacao--certa"><strong>Isso!</strong><p></p></div>
    <div class="questao__acoes"><button class="btn btn--primario" type="button">${ultima ? 'Finalizar atendimento' : 'Próxima etapa'}</button></div>`;
  res.querySelector('p').textContent = et.explicacao;
  efeito(res.querySelector('.explicacao'), 'fadeInUp');
  res.querySelector('button').addEventListener('click', ultima ? finalizar : avancar);
  setTimeout(() => res.scrollIntoView({ block: 'nearest', behavior: reduzido() ? 'auto' : 'smooth' }), 120);
}

/** Move fichas com Flip: atual → trilha; próxima → mesa. */
function moverFichas(depois) {
  const el = corpo();
  const fichas = el.querySelectorAll('.ficha');
  const estadoFlip = Flip.getState(fichas);
  const atualFicha = el.querySelector('.mesa__slot .ficha');
  atualFicha.classList.add('feita');
  el.querySelector('.trilha').appendChild(atualFicha);
  const proxima = el.querySelector('.fila .ficha');
  if (proxima) el.querySelector('.mesa__slot').appendChild(proxima);
  atualizarFila();
  depois?.();
  if (reduzido()) return Promise.resolve();
  return Flip.from(estadoFlip, {
    duration: 0.7,
    ease: 'power3.inOut',
    absolute: true,
    stagger: 0.05,
    zIndex: 5,
  }).then();
}

function avancar() {
  const cont = corpo().querySelector('.mesa__conteudo');
  const sair = reduzido() ? gsap.to(cont, { opacity: 0, duration: 0.15 }) : gsap.to(cont, { opacity: 0, y: -16, duration: 0.22, ease: 'power2.in' });
  sair.then(() => {
    etapa++;
    moverFichas(() => {
      renderEtapa();
      gsap.set(cont, { opacity: 0, y: 0 });
    }).then(() => {
      corpo().querySelector('.mesa').scrollIntoView({ block: 'start', behavior: reduzido() ? 'auto' : 'smooth' });
      if (reduzido()) return gsap.to(cont, { opacity: 1, duration: 0.25 });
      gsap
        .timeline()
        .to(cont, { opacity: 1, duration: 0.3 })
        .from(cont.querySelectorAll('.etapa__pergunta, .opcao'), { y: 16, opacity: 0, stagger: 0.06, duration: 0.4, clearProps: 'all' }, 0);
    });
  });
}

function finalizar() {
  const primeiraVez = !estado.casos[caso.id]?.feito;
  const cont = corpo().querySelector('.mesa__conteudo');

  gsap.to(cont, { opacity: 0, duration: 0.2 }).then(() => {
    moverFichas(() => {
      corpo().querySelector('.mesa').remove();
      const fim = document.createElement('section');
      fim.className = 'cartao desfecho';
      fim.innerHTML = `
        <div class="desfecho__lottie" data-lottie="coracao"></div>
        <p class="rotulo">Atendimento concluído</p>
        <h3 class="titulo-sec"></h3>
        <p class="desfecho__texto"></p>
        <p class="desfecho__xp"></p>
        <button class="btn btn--primario btn--largo" type="button" data-fechar>Voltar à sala de espera</button>`;
      fim.querySelector('.titulo-sec').textContent = `${caso.nome} está bem!`;
      fim.querySelector('.desfecho__texto').textContent = caso.desfecho;
      fim.querySelector('.desfecho__xp').textContent = primeiraVez
        ? `${acertos}/${caso.etapas.length} etapas acertadas de primeira · +${XP.casoConcluido} XP de bônus`
        : `Revisão concluída: ${acertos}/${caso.etapas.length} etapas de primeira`;
      corpo().querySelector('.trilha').after(fim);
    });

    const fim = corpo().querySelector('.desfecho');
    const coracao = fim.querySelector('[data-lottie]');
    montarLottie(coracao).then((anim) => anim && !reduzido() && anim.goToAndPlay(0, true));

    if (!reduzido()) {
      gsap.from(fim, { scale: 0.85, opacity: 0, duration: 0.7, ease: 'back.out(1.7)' });
      gsap.from(fim.querySelectorAll(':scope > *:not(.desfecho__lottie)'), { y: 14, opacity: 0, stagger: 0.07, delay: 0.25, duration: 0.4 });
      const r = coracao.getBoundingClientRect();
      setTimeout(() => estouro((r.left + r.width / 2) / innerWidth, (r.top + r.height / 2) / innerHeight), 350);
    }
    fim.scrollIntoView({ block: 'start', behavior: reduzido() ? 'auto' : 'smooth' });
    reagir('feliz');
    falar('casoConcluido');

    if (primeiraVez) {
      estado.casos[caso.id] = { ...estado.casos[caso.id], feito: true, acertos };
      salvar();
      ganharXP(XP.casoConcluido);
      avisar(`Caso concluído! +${XP.casoConcluido} XP`, 'xp');
      emitir('caso-concluido', caso.id);
    }
    renderLista(false);
  });
}

// ------------------------------------------------------------------
export function iniciarAtendimentos() {
  renderLista(false);
  const folha = document.getElementById('prontuario');
  folha.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]')) fecharFolha(folha);
  });

  let salaMontada = false;
  ouvir('tela', (nome) => {
    if (nome !== 'atendimentos') return;
    if (!salaMontada) {
      document.querySelectorAll('.sala__lottie').forEach((l) => montarLottie(l));
      salaMontada = true;
    }
    renderLista(true);
    falar('telas.atendimentos');
  });
  ouvir('recomecar', () => renderLista(false));
}
