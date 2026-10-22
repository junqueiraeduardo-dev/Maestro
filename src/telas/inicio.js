/*
 * Aba Início: números, carreira e o botão Recomeçar
 * (com confirmação dentro da própria página).
 */
import { gsap, reduzido } from '../lib/anim.js';
import { cargos } from '../data/cargos.js';
import { casos } from '../data/casos.js';
import { questoes } from '../data/questoes.js';
import { cartas } from '../data/cartas.js';
import { estado, indiceCargo, casosFeitos, questoesCertas, cartaLiberada, ouvir, recomecar } from '../lib/estado.js';
import { abrirModal, fecharModal } from './folhas.js';
import { avisar } from '../lib/avisos.js';
import { falar } from './mikasa.js';
import { icone } from '../lib/ilustracoes.js';

const $ = (s) => document.querySelector(s);

function render(animar) {
  const valores = {
    'n-casos': [casosFeitos(), casos.length],
    'n-questoes': [questoesCertas(), questoes.length],
    'n-cartas': [cartas.filter(cartaLiberada).length, cartas.length],
  };
  Object.entries(valores).forEach(([id, [v, total]]) => {
    const el = document.getElementById(id);
    if (!animar || reduzido()) {
      el.textContent = `${v}/${total}`;
      return;
    }
    const n = { v: 0 };
    gsap.to(n, { v, duration: 0.9, ease: 'power2.out', snap: { v: 1 }, delay: 0.2, onUpdate: () => (el.textContent = `${n.v}/${total}`) });
  });

  const faltam = casos.length - casosFeitos();
  const questoesFaltam = questoes.length - questoesCertas();
  $('#heroi-frase').textContent =
    faltam || questoesFaltam
      ? `${faltam} ${faltam === 1 ? 'paciente' : 'pacientes'} na sala de espera e ${questoesFaltam} ${questoesFaltam === 1 ? 'questão' : 'questões'} do ENEM por acertar.`
      : 'Todos os pacientes atendidos e todas as questões certas. A clínica é sua.';

  const atual = indiceCargo();
  $('#carreira').innerHTML = cargos
    .map(
      (c, i) => `
      <li class="${i < atual ? 'alcancado' : ''} ${i === atual ? 'atual' : ''}">
        <span class="carreira__icone">${icone(c.icone)}</span>
        <span>${c.nome}</span>
        <span class="carreira__xp">${i <= atual ? (i === atual ? 'Você está aqui' : 'Concluído') : `${c.xp} XP`}</span>
      </li>`,
    )
    .join('');
  if (animar && !reduzido()) {
    gsap.from('#carreira li', { x: -20, opacity: 0, stagger: 0.07, duration: 0.45, delay: 0.15 });
  }
}

export function iniciarInicio() {
  render(false);
  const modal = $('#confirmar');
  $('#btn-recomecar').addEventListener('click', () => abrirModal(modal));
  modal.addEventListener('click', (e) => e.target.closest('[data-fechar]') && fecharModal(modal));
  $('#confirmar-sim').addEventListener('click', () => {
    recomecar();
    fecharModal(modal);
    avisar('Progresso zerado. De volta a Estagiária.');
    falar('boasVindas');
  });

  ouvir('tela', (nome) => {
    if (nome !== 'inicio') return;
    render(true);
    falar('telas.inicio');
  });
  ouvir('xp', () => render(false));
  ouvir('recomecar', () => render(true));
}
