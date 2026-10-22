/*
 * Barra do topo que some ao rolar para baixo e volta ao rolar para
 * cima. É o ÚNICO listener de rolagem do site: roda no máximo uma vez
 * por quadro (requestAnimationFrame) e também avisa a Mikasa para
 * conferir se ficou em cima de algum botão.
 */
import { vigiar } from './mikasa.js';

export function iniciarTopo() {
  const topo = document.querySelector('.topo');
  const medir = () => document.documentElement.style.setProperty('--topo-h', `${topo.offsetHeight}px`);
  medir();
  new ResizeObserver(medir).observe(topo);

  let ultimoY = window.scrollY;
  let agendado = false;

  const quadro = () => {
    agendado = false;
    const y = window.scrollY;
    const delta = y - ultimoY;
    if (Math.abs(delta) > 6) {
      // Desce → esconde; sobe (ou perto do topo) → mostra
      document.body.classList.toggle('topo-oculto', delta > 0 && y > 120);
      ultimoY = y;
    }
    if (y < 40) document.body.classList.remove('topo-oculto');
    vigiar();
  };

  window.addEventListener(
    'scroll',
    () => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(quadro);
    },
    { passive: true, capture: true },
  );
}
