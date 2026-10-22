/*
 * Avisos rápidos no topo da tela ("+10 XP", "Nova carta!").
 * Usam só classes do Animate.css — microefeitos simples.
 */
const caixa = () => document.getElementById('avisos');

export function avisar(texto, tipo = '') {
  const el = document.createElement('div');
  el.className = `aviso ${tipo ? `aviso--${tipo}` : ''} animate__animated animate__bounceIn`;
  el.textContent = texto;
  caixa().appendChild(el);
  setTimeout(() => {
    el.classList.replace('animate__bounceIn', 'animate__fadeOutUp');
    el.addEventListener('animationend', () => el.remove(), { once: true });
    // Garantia caso a animação não rode (ex.: aba em segundo plano).
    setTimeout(() => el.remove(), 1500);
  }, 1800);
}

/** Aplica um efeito do Animate.css uma vez em um elemento. */
export function efeito(el, nome) {
  if (!el) return;
  el.classList.remove('animate__animated', `animate__${nome}`);
  void el.offsetWidth; // reinicia a animação se repetir
  el.classList.add('animate__animated', `animate__${nome}`);
  el.addEventListener('animationend', () => el.classList.remove('animate__animated', `animate__${nome}`), { once: true });
}
