/**
 * confetti.js — confete em canvas puro, sem dependência.
 * Uso: window.maestroConfetti({ duration: 2500, particles: 140 })
 *
 * Por que próprio (e não a lib canvas-confetti):
 *  - filosofia custo-zero: zero npm, zero CDN extra
 *  - render em window.requestAnimationFrame, GPU-friendly
 *  - paleta da identidade Maestro (âmbar + dourado + verde)
 */
(function () {
  const COLORS = ["#06b6d4", "#22d3ee", "#a5f3fc", "#22C55E", "#F1F5F9"];

  function spawn({ duration = 2500, particles = 140, origin = { x: 0.5, y: 0.45 } } = {}) {
    const canvas = document.createElement("canvas");
    canvas.style.cssText = [
      "position:fixed", "inset:0", "pointer-events:none", "z-index:10000",
    ].join(";");
    document.body.appendChild(canvas);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    }
    resize();
    window.addEventListener("resize", resize);

    const ctx = canvas.getContext("2d");
    const cx = window.innerWidth * origin.x;
    const cy = window.innerHeight * origin.y;

    const ps = [];
    for (let i = 0; i < particles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 10;
      ps.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4, // viés pra cima
        size: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        shape: Math.random() > 0.5 ? "rect" : "circle",
        life: 0,
      });
    }

    const t0 = performance.now();
    function frame(now) {
      const t = now - t0;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of ps) {
        p.vy += 0.28;          // gravidade
        p.vx *= 0.992;          // arrasto horizontal
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.spin;
        p.life++;

        const alpha = Math.max(0, 1 - t / duration);
        ctx.save();
        ctx.translate(p.x * dpr, p.y * dpr);
        ctx.rotate(p.rot);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size * dpr / 2, -p.size * dpr / 4, p.size * dpr, p.size * dpr / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, (p.size / 2) * dpr, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (t < duration) {
        requestAnimationFrame(frame);
      } else {
        window.removeEventListener("resize", resize);
        canvas.remove();
      }
    }
    requestAnimationFrame(frame);
  }

  window.maestroConfetti = spawn;
})();
