/*
 * Ilustrações próprias em SVG (substituem os emojis).
 *
 * - animal(tipo, pelo): rosto do paciente. Tipos disponíveis:
 *   'cachorro', 'gato', 'coelho', 'cavalo', 'ave', 'porquinho', 'vaca'.
 *   `pelo` é a cor principal (ex.: '#d9a35b').
 * - icone(nome): ícones de traço único (cargos, selos, botões).
 *
 * Para um animal novo, copie um bloco de `rostos`, mude o nome e
 * desenhe dentro de um quadro de 64 × 64.
 */

const OLHO = '#1c2a26';
const NARIZ = '#2b1d1a';

const olhos = (y = 30, dx = 9, cx = 32) =>
  `<circle cx="${cx - dx}" cy="${y}" r="2.6" fill="${OLHO}"/><circle cx="${cx + dx}" cy="${y}" r="2.6" fill="${OLHO}"/>
   <circle cx="${cx - dx + 0.9}" cy="${y - 0.9}" r="0.8" fill="#fff"/><circle cx="${cx + dx + 0.9}" cy="${y - 0.9}" r="0.8" fill="#fff"/>`;

const rostos = {
  cachorro: (p) => `
    <path d="M14 18c-6 2-8 14-5 22 2 4 7 3 8-1l3-17z" fill="${escurecer(p)}"/>
    <path d="M50 18c6 2 8 14 5 22-2 4-7 3-8-1l-3-17z" fill="${escurecer(p)}"/>
    <ellipse cx="32" cy="32" rx="18" ry="19" fill="${p}"/>
    <ellipse cx="32" cy="42" rx="10" ry="8" fill="#f6e3c6"/>
    ${olhos(29)}
    <ellipse cx="32" cy="38" rx="4" ry="3" fill="${NARIZ}"/>
    <path d="M32 41v3m-4 1c2 2 6 2 8 0" stroke="${NARIZ}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  gato: (p) => `
    <path d="M12 26 14 8l14 10z" fill="${p}"/><path d="M52 26 50 8 36 18z" fill="${p}"/>
    <path d="M15.5 21 16.5 13l6 4.5z" fill="#f2a7b4"/><path d="M48.5 21 47.5 13l-6 4.5z" fill="#f2a7b4"/>
    <ellipse cx="32" cy="34" rx="20" ry="17" fill="${p}"/>
    <path d="M23 31c0-3 6-3 6 0s-6 3-6 0zm12 0c0-3 6-3 6 0s-6 3-6 0z" fill="#c9e35b"/>
    <ellipse cx="26" cy="31" rx="1" ry="2.6" fill="${OLHO}"/><ellipse cx="38" cy="31" rx="1" ry="2.6" fill="${OLHO}"/>
    <path d="M30 38h4l-2 2.4z" fill="#e88a9b"/>
    <path d="M29 42c1.5 1.4 3 1.4 3-1 0 2.4 1.5 2.4 3 1" stroke="${NARIZ}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M14 37l-8-1m8 4-8 2m44-5 8-1m-8 4 8 2" stroke="${OLHO}" stroke-width="1" stroke-linecap="round" opacity=".5"/>`,
  coelho: (p) => `
    <ellipse cx="22" cy="14" rx="5.5" ry="13" fill="${p}" transform="rotate(-12 22 14)"/>
    <ellipse cx="42" cy="14" rx="5.5" ry="13" fill="${p}" transform="rotate(12 42 14)"/>
    <ellipse cx="22" cy="14" rx="2.5" ry="9" fill="#f2b4c0" transform="rotate(-12 22 14)"/>
    <ellipse cx="42" cy="14" rx="2.5" ry="9" fill="#f2b4c0" transform="rotate(12 42 14)"/>
    <ellipse cx="32" cy="38" rx="17" ry="16" fill="${p}"/>
    ${olhos(35, 8)}
    <path d="M30 42h4l-2 2z" fill="#e88a9b"/>
    <path d="M32 44v2m-3 1c1.5 1 4.5 1 6 0" stroke="${NARIZ}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <circle cx="23" cy="42" r="2.5" fill="#f2b4c0" opacity=".7"/><circle cx="41" cy="42" r="2.5" fill="#f2b4c0" opacity=".7"/>`,
  cavalo: (p) => `
    <path d="M20 14 22 4l6 8z" fill="${p}"/><path d="M44 14 42 4l-6 8z" fill="${p}"/>
    <path d="M22 16c0-6 20-6 20 0l2 22c1 10-5 20-12 20s-13-10-12-20z" fill="${p}"/>
    <path d="M28 6c4 6 6 10 4 16-2-5-6-8-8-10z" fill="${escurecer(p, 0.55)}"/>
    <path d="M30 18l2 8 2-8z" fill="#fff" opacity=".85"/>
    ${olhos(26, 9)}
    <ellipse cx="32" cy="50" rx="10" ry="8" fill="${escurecer(p, 0.8)}"/>
    <ellipse cx="28" cy="50" rx="1.6" ry="2.4" fill="${NARIZ}"/><ellipse cx="36" cy="50" rx="1.6" ry="2.4" fill="${NARIZ}"/>`,
  ave: (p) => `
    <path d="M30 14c-2-8 2-12 6-12-2 4-1 8 0 12zm4 0c2-7 6-9 9-8-3 3-5 6-6 10z" fill="${p}"/>
    <circle cx="32" cy="34" r="19" fill="${p}"/>
    <path d="M14 40c4 10 10 14 18 14s14-4 18-14c-6 4-30 4-36 0z" fill="#d8d3c4"/>
    <circle cx="22" cy="38" r="5" fill="#f08a3e"/><circle cx="42" cy="38" r="5" fill="#f08a3e"/>
    ${olhos(30, 8)}
    <path d="M28 34c0-2 8-2 8 0l-4 8z" fill="#8a8f96"/>`,
  porquinho: (p) => `
    <ellipse cx="18" cy="20" rx="7" ry="6" fill="${escurecer(p)}"/><ellipse cx="46" cy="20" rx="7" ry="6" fill="${escurecer(p)}"/>
    <ellipse cx="32" cy="35" rx="21" ry="18" fill="${p}"/>
    <path d="M32 18c-8 0-10 10-10 16 4-2 6-8 10-8s6 6 10 8c0-6-2-16-10-16z" fill="#fffaf2"/>
    ${olhos(32, 10)}
    <ellipse cx="32" cy="41" rx="5" ry="3.4" fill="#e7a3a3"/>
    <path d="M32 44.5v2m-3 1c1.5 1 4.5 1 6 0" stroke="${NARIZ}" stroke-width="1.3" fill="none" stroke-linecap="round"/>`,
  vaca: (p) => `
    <path d="M16 16c-6-2-8-6-6-10 3 3 6 4 10 5zm32 0c6-2 8-6 6-10-3 3-6 4-10 5z" fill="#efe1c4"/>
    <ellipse cx="11" cy="24" rx="7" ry="4" fill="${p}" transform="rotate(-20 11 24)"/>
    <ellipse cx="53" cy="24" rx="7" ry="4" fill="${p}" transform="rotate(20 53 24)"/>
    <path d="M17 18c0-8 30-8 30 0l1 18H16z" fill="${p}"/>
    <path d="M18 18c4-4 10-3 11 2s-6 8-11 6z" fill="#23201f"/><path d="M44 30c-4-1-6 3-4 6h8v-6z" fill="#23201f"/>
    ${olhos(26, 9)}
    <rect x="16" y="34" width="32" height="20" rx="10" fill="#f2b0b0"/>
    <ellipse cx="25" cy="44" rx="2" ry="3" fill="#9c5a5a"/><ellipse cx="39" cy="44" rx="2" ry="3" fill="#9c5a5a"/>`,
};

/** Escurece uma cor hex (fator < 1). */
function escurecer(hex, fator = 0.78) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * fator));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function animal(tipo, pelo = '#c99a6b') {
  const desenho = rostos[tipo] || rostos.cachorro;
  return `<svg viewBox="0 0 64 64" aria-hidden="true" class="ilustra">${desenho(pelo)}</svg>`;
}

// Ícones de traço (24 × 24, traço 2, pontas arredondadas)
const icones = {
  estetoscopio: '<path d="M6 3v6a5 5 0 0 0 10 0V3"/><path d="M11 14v2a5 5 0 0 0 10 0v-3"/><circle cx="21" cy="11" r="2"/>',
  tubo: '<path d="M9 3h6M10 3v13a2 2 0 0 0 4 0V3"/><path d="M10 11h4"/>',
  pata: '<ellipse cx="12" cy="16" rx="4.5" ry="3.8" fill="currentColor" stroke="none"/><circle cx="6" cy="10.5" r="2" fill="currentColor" stroke="none"/><circle cx="10" cy="6.5" r="2" fill="currentColor" stroke="none"/><circle cx="14" cy="6.5" r="2" fill="currentColor" stroke="none"/><circle cx="18" cy="10.5" r="2" fill="currentColor" stroke="none"/>',
  coroa: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  coracao: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor"/>',
  cadeado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  bolo: '<path d="M4 20h16v-7H4z"/><path d="M4 16c2.7 1.5 5.3 1.5 8 0s5.3-1.5 8 0"/><path d="M12 13V9"/><path d="M12 6.5c-1-1-1-2 0-3.5 1 1.5 1 2.5 0 3.5z" fill="currentColor"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  carta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
};

export function icone(nome, classe = 'icone') {
  return `<svg viewBox="0 0 24 24" class="${classe}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icones[nome] || ''}</svg>`;
}
