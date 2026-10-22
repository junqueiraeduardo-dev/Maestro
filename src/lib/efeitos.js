/*
 * Confetes, corações e fogos (canvas-confetti).
 * Com "reduzir movimento" ativo, a biblioteca não dispara nada.
 */
import confetti from 'canvas-confetti';

const base = { disableForReducedMotion: true, zIndex: 95 };
const cores = ['#2f7d6d', '#4fb39b', '#e8798a', '#f2b84b', '#fbe3e6', '#ffffff'];
const rosas = ['#e8798a', '#f4a3b0', '#d94f6a', '#ffc2cd'];

let formaCoracao;
function coracao() {
  formaCoracao ??= confetti.shapeFromPath({
    path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
  });
  return formaCoracao;
}

/** Explosão dos dois lados — usada nas promoções. */
export function confetePromocao() {
  confetti({ ...base, particleCount: 90, spread: 70, startVelocity: 48, origin: { x: 0.15, y: 0.75 }, angle: 60, colors: cores });
  confetti({ ...base, particleCount: 90, spread: 70, startVelocity: 48, origin: { x: 0.85, y: 0.75 }, angle: 120, colors: cores });
}

/** Chuva de corações caindo do topo por alguns segundos. */
export function chuvaDeCoracoes(duracao = 4500) {
  const fim = Date.now() + duracao;
  const forma = coracao();
  (function quadro() {
    confetti({
      ...base,
      particleCount: 2,
      startVelocity: 0,
      ticks: 320,
      gravity: 0.45,
      drift: Math.random() - 0.5,
      origin: { x: Math.random(), y: -0.05 },
      shapes: [forma],
      colors: rosas,
      scalar: 1.6 + Math.random(),
    });
    if (Date.now() < fim) requestAnimationFrame(quadro);
  })();
}

/** Fogos de artifício — ao virar Veterinária-chefe. */
export function fogos(duracao = 5000) {
  const fim = Date.now() + duracao;
  const id = setInterval(() => {
    if (Date.now() > fim) return clearInterval(id);
    confetti({
      ...base,
      particleCount: 60,
      startVelocity: 32,
      spread: 360,
      ticks: 70,
      gravity: 0.9,
      origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35 },
      colors: cores,
    });
  }, 320);
}

/** Pequeno estouro em um ponto da tela (ex.: no fim de um caso). */
export function estouro(x = 0.5, y = 0.5) {
  confetti({ ...base, particleCount: 40, spread: 60, startVelocity: 26, origin: { x, y }, colors: cores, scalar: 0.8 });
}
