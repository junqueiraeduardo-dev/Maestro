/*
 * Feedback das respostas (estudo e prontuário).
 * Acerto: a opção pulsa em verde, com um brilho que acende e apaga.
 * Erro: a opção treme levemente para os lados.
 */
import { gsap, reduzido } from '../lib/anim.js';

export function pulsarCerta(botao) {
  if (reduzido()) return gsap.fromTo(botao, { opacity: 0.6 }, { opacity: 1, duration: 0.3 });
  return gsap
    .timeline()
    .to(botao, { scale: 1.04, duration: 0.14, ease: 'power2.out' })
    .to(botao, { scale: 1, duration: 0.6, ease: 'elastic.out(1.2, 0.4)' })
    .fromTo(botao, { '--brilho': 0 }, { '--brilho': 1, duration: 0.2, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0);
}

export function tremerErrada(botao) {
  if (reduzido()) return gsap.fromTo(botao, { opacity: 0.6 }, { opacity: 1, duration: 0.3 });
  return gsap.fromTo(
    botao,
    { x: 0 },
    { keyframes: { x: [0, -9, 8, -6, 4, -2, 0] }, duration: 0.45, ease: 'power1.out', clearProps: 'x' },
  );
}
