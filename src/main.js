/*
 * Ponto de entrada: carrega estilos, liga cada tela e roda a abertura.
 */
import 'animate.css';
import './styles/main.css';

import { gsap, reduzido } from './lib/anim.js';
import { montarLottie } from './lib/lottie.js';
import { abertura } from './telas/abertura.js';
import { iniciarAbas } from './telas/abas.js';
import { iniciarMikasa, entrar, falar, vigiar } from './telas/mikasa.js';
import { iniciarInicio } from './telas/inicio.js';
import { iniciarAtendimentos } from './telas/atendimentos.js';
import { iniciarEstudo } from './telas/estudo.js';
import { iniciarCartas } from './telas/cartas.js';
import { iniciarProgresso } from './telas/progresso.js';

iniciarMikasa();
iniciarAbas();
iniciarInicio();
iniciarAtendimentos();
iniciarEstudo();
iniciarCartas();
iniciarProgresso();

// Estetoscópio da tela inicial
document.querySelectorAll('#tela-inicio [data-lottie]').forEach((el) => montarLottie(el));

abertura().then(async () => {
  // Itens da tela inicial entram em cascata depois da abertura
  if (!reduzido()) {
    gsap.from('#tela-inicio > .anima-item', { opacity: 0, y: 24, stagger: 0.09, duration: 0.6, clearProps: 'transform,opacity' });
    gsap.from('.topo, .abas', { opacity: 0, y: -12, duration: 0.5, stagger: 0.08, clearProps: 'transform,opacity' });
  }
  await entrar();
  falar('boasVindas');
  vigiar();
});

// Tecla Esc fecha a janela que estiver por cima
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const abertas = [...document.querySelectorAll('.modal:not([hidden]), .surpresa:not([hidden]), .folha:not([hidden])')];
  const topo = abertas.sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex))[0];
  topo?.querySelector('button[data-fechar]')?.click();
});

// App instalável: registra o service worker só na versão publicada.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
