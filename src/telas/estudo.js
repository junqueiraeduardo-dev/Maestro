/*
 * Aba Estudar: questões estilo ENEM de Biologia e Química.
 * Acerto → a opção pulsa em verde. Erro → a opção treme.
 */
import { gsap, reduzido } from '../lib/anim.js';
import { questoes } from '../data/questoes.js';
import { XP } from '../data/cargos.js';
import { estado, salvar, ganharXP, ouvir, questoesCertas } from '../lib/estado.js';
import { avisar, efeito } from '../lib/avisos.js';
import { moverDestaque } from './abas.js';
import { falar, reagir } from './mikasa.js';
import { pulsarCerta, tremerErrada } from './respostas.js';

const LETRAS = 'ABCDE';
let materia = 'todas';
let atual = null;

const caixa = () => document.getElementById('questao');
const filtradas = () => questoes.filter((q) => materia === 'todas' || q.materia === materia);

function escolherProxima() {
  const lista = filtradas();
  if (!lista.length) return null;
  const pendentes = lista.filter((q) => estado.questoes[q.id] !== 'certa');
  const base = pendentes.length ? pendentes : lista;
  // Começa depois da questão atual para não repetir em seguida.
  const i = atual ? base.findIndex((q) => q.id === atual.id) : -1;
  return base[(i + 1) % base.length];
}

function atualizarPlacar() {
  const total = questoes.length;
  const certas = questoesCertas();
  document.getElementById('estudo-placar').textContent =
    certas === total ? `Você acertou todas as ${total} questões! Pode revisar à vontade.` : `${certas} de ${total} questões acertadas`;
}

function render() {
  const q = atual;
  const el = caixa();
  if (!q) {
    el.innerHTML = '<p>Nenhuma questão nesta matéria ainda.</p>';
    return;
  }
  const quimica = q.materia === 'Química';
  const feita = estado.questoes[q.id] === 'certa';
  el.innerHTML = `
    <div class="questao__meta">
      <span class="etiqueta ${quimica ? 'etiqueta--quimica' : ''}">${q.materia}</span>
      <span class="etiqueta">${q.tema}</span>
      ${feita ? '<span class="etiqueta etiqueta--feita">já acertada</span>' : ''}
    </div>
    <p class="questao__enunciado"></p>
    <ul class="opcoes">
      ${q.opcoes.map((_, i) => `<li><button class="opcao" type="button" data-i="${i}"><span class="opcao__letra">${LETRAS[i]}</span><span class="opcao__texto"></span></button></li>`).join('')}
    </ul>
    <div class="questao__resultado"></div>`;
  el.querySelector('.questao__enunciado').textContent = q.enunciado;
  el.querySelectorAll('.opcao__texto').forEach((s, i) => (s.textContent = q.opcoes[i]));
  el.querySelectorAll('.opcao').forEach((b) => b.addEventListener('click', () => responder(Number(b.dataset.i))));
}

function responder(i) {
  const q = atual;
  const el = caixa();
  const botoes = [...el.querySelectorAll('.opcao')];
  botoes.forEach((b) => (b.disabled = true));
  const acertou = i === q.correta;
  const primeiraVez = estado.questoes[q.id] !== 'certa';

  if (acertou) {
    botoes[i].classList.add('certa');
    pulsarCerta(botoes[i]);
    reagir('feliz');
    falar('acerto');
    estado.questoes[q.id] = 'certa';
    salvar();
    if (primeiraVez) {
      avisar(`+${XP.questaoCerta} XP`, 'xp');
      ganharXP(XP.questaoCerta);
    }
  } else {
    botoes[i].classList.add('errada');
    botoes[q.correta].classList.add('certa');
    tremerErrada(botoes[i]);
    reagir('triste');
    falar('erro');
    if (!estado.questoes[q.id]) estado.questoes[q.id] = 'errada';
    salvar();
  }
  botoes.forEach((b, n) => n !== i && n !== q.correta && b.classList.add('apagada'));

  const res = el.querySelector('.questao__resultado');
  res.innerHTML = `
    <div class="explicacao ${acertou ? 'explicacao--certa' : ''}">
      <strong>${acertou ? 'Isso mesmo!' : `Resposta certa: ${LETRAS[q.correta]}`}</strong>
      <p></p>
    </div>
    <div class="questao__acoes"><button class="btn btn--primario" type="button">Próxima questão</button></div>`;
  res.querySelector('p').textContent = q.explicacao;
  // Nota com microefeito do Animate.css
  efeito(res.querySelector('.explicacao'), acertou ? 'fadeInUp' : 'headShake');
  const seguir = res.querySelector('button');
  seguir.addEventListener(
    'click',
    () => {
      seguir.disabled = true; // evita pular duas questões num toque duplo
      proxima();
    },
    { once: true },
  );
  atualizarPlacar();
}

function proxima() {
  const el = caixa();
  const seguinte = escolherProxima();
  if (reduzido()) {
    atual = seguinte;
    gsap.timeline().to(el, { opacity: 0, duration: 0.15 }).add(render).to(el, { opacity: 1, duration: 0.2 });
    return;
  }
  gsap
    .timeline()
    .to(el, { x: -40, opacity: 0, duration: 0.25, ease: 'power2.in' })
    .add(() => {
      atual = seguinte;
      render();
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    })
    .fromTo(el, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
    .from(el.querySelectorAll('.opcao'), { y: 14, opacity: 0, stagger: 0.06, duration: 0.35, clearProps: 'transform,opacity' }, '-=0.25');
}

function trocarMateria(nova, botao) {
  if (nova === materia) return;
  materia = nova;
  document.querySelectorAll('.filtro').forEach((b) => b.classList.toggle('ativo', b === botao));
  moverDestaque(document.querySelector('.filtros__indicador'), botao);
  atual = null;
  proxima();
}

export function iniciarEstudo() {
  const destaque = document.querySelector('.filtros__indicador');
  moverDestaque(destaque, document.querySelector('.filtro.ativo'), false);
  document.querySelectorAll('.filtro').forEach((b) => b.addEventListener('click', () => trocarMateria(b.dataset.materia, b)));
  atual = escolherProxima();
  render();
  atualizarPlacar();
  ouvir('recomecar', () => {
    atual = escolherProxima();
    render();
    atualizarPlacar();
  });
  ouvir('tela', (nome) => nome === 'estudo' && falar('telas.estudo'));
}
