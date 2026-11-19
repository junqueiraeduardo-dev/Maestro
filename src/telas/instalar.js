/*
 * App no iPhone: o Safari só instala sites pela opção
 * "Adicionar à Tela de Início". Esta dica aparece no Safari do
 * iPhone/iPad quando a clínica ainda NÃO está aberta como app.
 * Também pede ao navegador para não apagar o progresso salvo.
 */
import { gsap, reduzido } from '../lib/anim.js';

const aberto = () =>
  window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

const ehIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function iniciarInstalar() {
  // Progresso guardado com prioridade (o navegador evita apagar)
  navigator.storage?.persist?.().catch(() => {});

  if (aberto() || !ehIOS()) return;
  if (document.documentElement.hasAttribute('data-arquivo')) return;

  const caixa = document.getElementById('instalar');
  caixa.hidden = false;
  if (!reduzido()) gsap.from(caixa, { y: 40, opacity: 0, duration: 0.6, delay: 1.2, ease: 'back.out(1.6)' });
  document.getElementById('instalar-ok').addEventListener(
    'click',
    () => gsap.to(caixa, { y: 30, opacity: 0, duration: 0.3, onComplete: () => (caixa.hidden = true) }),
    { once: true },
  );
}
