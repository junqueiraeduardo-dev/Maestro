/*
 * Navegação entre abas: a tela que sai some em sequência, a que
 * entra aparece em cascata, e o destaque da aba desliza (Flip).
 */
import { gsap, Flip, ScrollTrigger, reduzido } from '../lib/anim.js';
import { emitir } from '../lib/estado.js';

let atual = 'inicio';
let animacao;

const abas = () => document.querySelectorAll('.aba');
const tela = (nome) => document.querySelector(`[data-tela="${nome}"]`);

/** Move um "destaque" para dentro do botão ativo e anima com Flip. */
export function moverDestaque(destaque, alvo, animar = true) {
  if (!destaque || !alvo) return;
  if (!animar || reduzido()) {
    alvo.prepend(destaque);
    return;
  }
  const estadoFlip = Flip.getState(destaque);
  alvo.prepend(destaque);
  Flip.from(estadoFlip, { duration: 0.55, ease: 'elastic.out(1, 0.8)' });
}

export function iniciarAbas() {
  const destaque = document.querySelector('.abas__indicador');
  moverDestaque(destaque, document.querySelector('.aba.ativa'), false);
  abas().forEach((b) => b.addEventListener('click', () => irPara(b.dataset.aba)));
  document.addEventListener('click', (e) => {
    const atalho = e.target.closest('[data-ir]');
    if (atalho) irPara(atalho.dataset.ir);
  });
}

export const abaAtual = () => atual;

export function irPara(nome) {
  if (nome === atual || !tela(nome)) return;
  const sai = tela(atual);
  const entra = tela(nome);
  atual = nome;

  abas().forEach((b) => b.classList.toggle('ativa', b.dataset.aba === nome));
  moverDestaque(document.querySelector('.abas__indicador'), document.querySelector(`.aba[data-aba="${nome}"]`));

  animacao?.progress(1);
  const itensSai = sai.querySelectorAll(':scope > *');
  const trocar = () => {
    sai.hidden = true;
    gsap.set(itensSai, { clearProps: 'opacity,transform' });
    entra.hidden = false;
    window.scrollTo({ top: 0 });
    ScrollTrigger.refresh();
    emitir('tela', nome);
  };

  if (reduzido()) {
    animacao = gsap.timeline().to(sai, { opacity: 0, duration: 0.15 }).add(trocar).set(sai, { opacity: 1 }).fromTo(entra, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    return;
  }

  animacao = gsap
    .timeline()
    .to(itensSai, { opacity: 0, y: -14, duration: 0.18, stagger: 0.035, ease: 'power1.in' })
    .add(trocar)
    .fromTo(
      entra.querySelectorAll(':scope > .anima-item'),
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power3.out', clearProps: 'transform' },
    );
}
