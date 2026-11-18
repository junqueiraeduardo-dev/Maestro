/*
 * Animações Lottie (arquivos .json em src/assets/animacoes/).
 *
 * Qualquer elemento com data-lottie="nome" vira uma animação:
 *   <div data-lottie="coracao" data-loop="true"></div>
 *   → usa src/assets/animacoes/coracao.json
 *
 * Os arquivos entram no próprio app na hora do build, então funcionam
 * sem internet (inclusive no arquivo único .html).
 *
 * Se o arquivo não existir, aparece um desenho reserva animado
 * com GSAP, então o site nunca fica com buraco.
 * As animações pausam sozinhas quando saem da tela (economiza bateria).
 */
import lottie from 'lottie-web/build/player/lottie_light';
import { gsap, reduzido } from './anim.js';
import { animal, icone } from './ilustracoes.js';

const cache = new Map();
const arquivos = import.meta.glob('../assets/animacoes/*.json', { import: 'default' });

// Desenho reserva para cada animação (ilustração que "respira").
const reservas = {
  cachorro: () => animal('cachorro', '#d9a35b'),
  gato: () => animal('gato', '#e9a35e'),
  coracao: () => icone('coracao', 'reserva-icone'),
  estetoscopio: () => icone('estetoscopio', 'reserva-icone'),
  bolo: () => icone('bolo', 'reserva-icone'),
};

function carregarJSON(nome) {
  if (!cache.has(nome)) {
    cache.set(
      nome,
      (async () => {
        const carregar = arquivos[`../assets/animacoes/${nome}.json`];
        if (!carregar) throw new Error(`Lottie ${nome} não encontrado`);
        return carregar();
      })(),
    );
  }
  return cache.get(nome);
}

const observador =
  'IntersectionObserver' in window
    ? new IntersectionObserver(
        (entradas) => {
          entradas.forEach(({ target, isIntersecting }) => {
            const anim = target._lottie;
            if (!anim || target.dataset.manual === 'true') return;
            if (reduzido()) return;
            if (isIntersecting) anim.play();
            else anim.pause();
          });
        },
        { threshold: 0.1 },
      )
    : null;

function montarReserva(el) {
  const nome = el.dataset.lottie;
  el.innerHTML = `<span class="lottie-reserva" style="display:grid;place-items:center;width:100%;height:100%;padding:18%;color:var(--marca)">${(reservas[nome] || reservas.coracao)()}</span>`;
  if (!reduzido()) {
    gsap.to(el.firstChild, { scale: 1.08, y: -4, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  }
}

/** Monta a animação de um elemento. Devolve a instância do Lottie (ou null). */
export async function montarLottie(el) {
  if (el._lottie || el._montando) return el._lottie;
  el._montando = true;
  try {
    const dados = await carregarJSON(el.dataset.lottie);
    // O Lottie altera o objeto recebido; cada uso ganha uma cópia.
    const anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: el.dataset.loop === 'true',
      autoplay: false,
      animationData: structuredClone(dados),
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true },
    });
    el._lottie = anim;
    anim.addEventListener('DOMLoaded', () => {
      // Com movimento reduzido mostramos um quadro parado.
      if (reduzido()) anim.goToAndStop(Math.floor(anim.totalFrames * 0.6), true);
    });
    observador?.observe(el);
    return anim;
  } catch {
    montarReserva(el);
    return null;
  } finally {
    el._montando = false;
  }
}

/** Monta todas as animações dentro de um elemento. */
export function montarLotties(raiz = document) {
  raiz.querySelectorAll('[data-lottie]').forEach((el) => montarLottie(el));
}

/** Toca uma animação "manual" (ex.: o bolo) do começo. */
export async function tocar(el) {
  const anim = await montarLottie(el);
  if (!anim) return;
  if (reduzido()) anim.goToAndStop(Math.floor(anim.totalFrames * 0.6), true);
  else anim.goToAndPlay(0, true);
}
