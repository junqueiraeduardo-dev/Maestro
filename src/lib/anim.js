/*
 * GSAP centralizado: registra os plugins uma vez e expõe o
 * detector de "movimento reduzido". Quando a pessoa ativa
 * "Reduzir movimento" no celular/computador, as telas trocam
 * as animações grandes por fades simples.
 */
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Flip } from 'gsap/Flip';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(SplitText, ScrollTrigger, Flip, MorphSVGPlugin);
gsap.defaults({ ease: 'power3.out', duration: 0.5 });
// Evita "saltos" quando a aba do navegador volta do segundo plano.
gsap.ticker.lagSmoothing(500, 33);

const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');

/** true quando o sistema pede menos movimento. */
export const reduzido = () => consulta.matches;

/** Fade simples, usado como substituto de qualquer animação grande. */
export function fade(alvos, entrada = true, duracao = 0.3) {
  return gsap.fromTo(
    alvos,
    { opacity: entrada ? 0 : 1 },
    { opacity: entrada ? 1 : 0, duration: duracao, ease: 'none', overwrite: true },
  );
}

export { gsap, SplitText, ScrollTrigger, Flip, MorphSVGPlugin };
