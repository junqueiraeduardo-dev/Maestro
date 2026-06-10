/* Maestro Service Worker — app-shell cache + network-first p/ API.
   Estratégia:
   - precache do shell estático (HTML/JS/CSS/ícones) na instalação
   - shell: cache-first c/ atualização em background (stale-while-revalidate)
   - /api/*: network-first c/ fallback "modo offline" minimalista
   - sem cache de fontes externas (mantém leve)
*/
// IMPORTANTE: bumpa este valor a cada deploy que mexer em arquivos do shell
// (app.jsx, screens.jsx, ui.jsx, index.html). Sem bump, browser serve
// versão cacheada e usuário não vê a mudança.
const VERSION = "v33-2026-06-10-no-intro-gold-cards";
const SHELL = "maestro-shell-" + VERSION;
const RUNTIME = "maestro-runtime-" + VERSION;

const SHELL_FILES = [
  "/",
  "/index.html",
  "/ui.jsx",
  "/scanner.jsx",
  "/screens.jsx",
  "/app.jsx",
  "/api.js",
  "/data.js",
  "/confetti.js",
  "/anim.jsx",
  "/favicon.svg",
  "/icon-maskable.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== SHELL && k !== RUNTIME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return; // POSTs (voz, OS) sempre vão à rede

  const url = new URL(req.url);

  // API: network-first; se cair, responde JSON "offline" pra UI não travar
  if (url.pathname.startsWith("/api/")) {
    ev.respondWith(
      fetch(req).catch(() =>
        new Response(
          JSON.stringify({
            fala: "Você está offline. A ação será tentada quando voltar a rede.",
            intencao: "offline",
            offline: true,
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // Recursos do shell (mesma origem): stale-while-revalidate
  if (url.origin === self.location.origin) {
    ev.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(RUNTIME).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // CDNs externos (React/Babel/fontes): só passa pela rede (browser cacheia)
});

// Mensagem do app pra forçar atualização imediata após deploy
self.addEventListener("message", (ev) => {
  if (ev.data === "SKIP_WAITING") self.skipWaiting();
});
