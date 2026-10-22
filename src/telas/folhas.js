/*
 * Abrir e fechar as "folhas" (prontuário) e modais.
 * Celular: sobe de baixo. Computador: aparece com escala.
 */
import { gsap, reduzido } from '../lib/anim.js';
import { vigiar } from './mikasa.js';

const grande = () => window.matchMedia('(min-width: 720px)').matches;

export function abrirFolha(folha, depois) {
  const painel = folha.querySelector('.folha__painel');
  const fundo = folha.querySelector('.folha__fundo');
  folha.hidden = false;
  document.body.classList.add('travado');
  const tl = gsap.timeline({ onComplete: () => (depois?.(), vigiar()) });
  if (reduzido()) {
    tl.fromTo([fundo, painel], { opacity: 0 }, { opacity: 1, duration: 0.25 });
    return tl;
  }
  tl.fromTo(fundo, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0);
  if (grande()) tl.fromTo(painel, { opacity: 0, scale: 0.92, y: 30 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.4)' }, 0);
  else tl.fromTo(painel, { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: 'power4.out' }, 0);
  return tl;
}

export function fecharFolha(folha) {
  const painel = folha.querySelector('.folha__painel');
  const fundo = folha.querySelector('.folha__fundo');
  const fim = () => {
    folha.hidden = true;
    gsap.set([painel, fundo], { clearProps: 'all' });
    if (!document.querySelector('.folha:not([hidden]), .modal:not([hidden]), .surpresa:not([hidden])')) {
      document.body.classList.remove('travado');
    }
    vigiar();
  };
  if (reduzido()) return gsap.to([fundo, painel], { opacity: 0, duration: 0.2, onComplete: fim });
  const tl = gsap.timeline({ onComplete: fim });
  tl.to(fundo, { opacity: 0, duration: 0.3 }, 0);
  if (grande()) tl.to(painel, { opacity: 0, scale: 0.94, y: 20, duration: 0.25, ease: 'power2.in' }, 0);
  else tl.to(painel, { yPercent: 100, duration: 0.35, ease: 'power3.in' }, 0);
  return tl;
}

/** Modal genérico com fade (usado na confirmação de Recomeçar). */
export function abrirModal(modal) {
  const caixa = modal.querySelector('.modal__caixa');
  modal.hidden = false;
  document.body.classList.add('travado');
  vigiar();
  if (reduzido()) return gsap.fromTo(modal, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  return gsap
    .timeline()
    .fromTo(modal.querySelector('.modal__fundo'), { opacity: 0 }, { opacity: 1, duration: 0.25 })
    .fromTo(caixa, { opacity: 0, scale: 0.85, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'back.out(1.8)' }, 0);
}

export function fecharModal(modal) {
  const fim = () => {
    modal.hidden = true;
    gsap.set(modal.querySelectorAll('*'), { clearProps: 'opacity,transform' });
    gsap.set(modal, { clearProps: 'opacity' });
    if (!document.querySelector('.folha:not([hidden]), .modal:not([hidden]), .surpresa:not([hidden])')) {
      document.body.classList.remove('travado');
    }
    vigiar();
  };
  return gsap.to(modal, { opacity: 0, duration: 0.2, onComplete: fim });
}
