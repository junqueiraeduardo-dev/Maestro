/*
 * Abertura: uma patinha atravessa a tela deixando pegadas e o
 * título "Clínica da Dra. Lara" surge letra por letra (SplitText).
 * Toque em qualquer lugar para pular.
 */
import { gsap, SplitText, reduzido } from '../lib/anim.js';

const PATA = '<svg viewBox="0 0 64 64"><use href="#ico-pata"/></svg>';

export function abertura() {
  return new Promise((resolver) => {
    const tela = document.getElementById('abertura');
    const pegadas = tela.querySelector('.abertura__pegadas');
    const titulo = tela.querySelector('.abertura__titulo');
    const outros = tela.querySelectorAll('.abertura__pre, .abertura__sub, .abertura__entrar, .abertura__pular');
    let terminou = false;

    function sair() {
      if (terminou) return;
      terminou = true;
      tl.kill();
      const saida = reduzido()
        ? gsap.to(tela, { opacity: 0, duration: 0.35 })
        : gsap.to(tela, { yPercent: -100, duration: 0.8, ease: 'power3.inOut' });
      saida.then(() => {
        split?.revert();
        tela.remove();
        resolver();
      });
    }
    tela.addEventListener('click', sair);

    let split;
    const tl = gsap.timeline();

    if (reduzido()) {
      tl.from(tela.querySelector('.abertura__conteudo'), { opacity: 0, duration: 0.5 });
      tl.to({}, { duration: 1.6 }).add(sair);
      return;
    }

    // ---- Pegadas: caminho levemente ondulado, alternando esquerda/direita
    const w = window.innerWidth;
    const h = window.innerHeight;
    const passos = Math.max(7, Math.round(w / 110));
    const linhaY = h * 0.78;
    for (let i = 0; i < passos; i++) {
      const p = document.createElement('div');
      p.className = 'pegada';
      p.innerHTML = PATA;
      const x = ((i + 0.5) / passos) * w;
      const y = linhaY + Math.sin(i * 0.9) * 26 + (i % 2 ? 16 : -16);
      gsap.set(p, { x, y, rotation: 90 + Math.cos(i * 0.9) * 18, scale: 0.6 });
      pegadas.appendChild(p);
    }
    const todas = pegadas.querySelectorAll('.pegada');

    // "Pisadas": cada pegada aparece afundando e depois some devagar
    tl.to(todas, {
      keyframes: [
        { opacity: 1, scale: 1.25, duration: 0.12, ease: 'power2.out' },
        { scale: 1, duration: 0.25, ease: 'back.out(3)' },
      ],
      stagger: 0.16,
    });
    tl.to(todas, { opacity: 0.18, duration: 1.2, stagger: 0.16, ease: 'power1.in' }, 0.7);

    // ---- Título letra por letra
    split = SplitText.create(titulo, { type: 'chars,words', charsClass: 'char' });
    tl.from(
      split.chars,
      {
        y: 60,
        rotation: () => gsap.utils.random(-25, 25),
        opacity: 0,
        scale: 0.4,
        duration: 0.7,
        ease: 'back.out(2.2)',
        stagger: 0.045,
      },
      0.35,
    );
    tl.from(outros, { opacity: 0, y: 16, duration: 0.5, stagger: 0.12 }, '-=0.4');
    // Um "pulinho" no título depois de montado
    tl.to(split.chars, { y: -8, duration: 0.18, stagger: { each: 0.025, yoyo: true, repeat: 1 }, ease: 'sine.inOut' });
    tl.to({}, { duration: 2.2 }).add(sair);
  });
}
