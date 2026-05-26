// anim.jsx — Utilitários de animação (vanilla, zero lib)
//
// Expostos como globais via window pra qualquer .jsx usar:
//   <AnimatedNumber value={42} />            → conta de 0 até 42 em 800ms
//   <AnimatedNumber value={3.5} decimals={1}/> → 0.0 → 3.5
//   <ProgressBar pct={75} color="#10B981"/>  → preenche 0%→75% em 700ms
//
// Reagem a mudança de prop (re-anima do valor antigo até o novo).

/* global React */
const { useState: useAn, useEffect: useAnE, useRef: useAnR } = React;

// =========================================================================
// AnimatedNumber — conta com easeOutQuad pra desacelerar no final
// =========================================================================
function AnimatedNumber({ value, decimals = 0, duration = 800, prefix = '', suffix = '' }) {
  const [shown, setShown] = useAn(0);
  const fromRef = useAnR(0);
  const startRef = useAnR(0);
  const rafRef = useAnR(0);

  useAnE(() => {
    const target = Number(value) || 0;
    const from = fromRef.current;
    const dur = duration;
    if (target === from) {
      setShown(target);
      return;
    }
    cancelAnimationFrame(rafRef.current);
    startRef.current = performance.now();

    const tick = (now) => {
      const t = Math.min(1, (now - startRef.current) / dur);
      // easeOutQuad: começa rápido, desacelera no final (sensação de "pousar")
      const eased = 1 - (1 - t) * (1 - t);
      const cur = from + (target - from) * eased;
      setShown(cur);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  const fmt = decimals > 0
    ? shown.toFixed(decimals).replace('.', ',')
    : Math.round(shown).toLocaleString('pt-BR');
  return React.createElement('span', { className: 'num' }, prefix + fmt + suffix);
}

// =========================================================================
// ProgressBar — preenche de 0 ao valor alvo ao montar (e a cada mudança)
// =========================================================================
function ProgressBar({ pct, color, height = 6, bg, duration = 700 }) {
  const [w, setW] = useAn(0);
  const safe = Math.min(100, Math.max(0, Number(pct) || 0));

  useAnE(() => {
    // Pequeno tick pra forçar a transição CSS (de 0 → safe)
    setW(0);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setW(safe));
    });
    return () => cancelAnimationFrame(id);
  }, [safe]);

  const cor = color || (typeof M !== 'undefined' ? M.amber : '#06b6d4');
  const fundo = bg || 'rgba(255,255,255,0.08)';
  return React.createElement('div', {
    style: {
      width: '100%', height, borderRadius: height,
      background: fundo, overflow: 'hidden', position: 'relative',
    },
  },
    React.createElement('div', {
      style: {
        width: w + '%', height: '100%',
        background: cor, borderRadius: height,
        transition: `width ${duration}ms cubic-bezier(.22,.9,.3,1.05)`,
        boxShadow: `0 0 12px ${cor}66`,
      },
    })
  );
}

window.AnimatedNumber = AnimatedNumber;
window.ProgressBar = ProgressBar;
