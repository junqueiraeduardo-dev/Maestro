/*
 * Service worker: deixa o app funcionando SEM internet depois que ele
 * é aberto uma vez (ex.: instalado pela "Tela de Início" do iPhone).
 *
 * - Na instalação, baixa e guarda TODOS os arquivos do site
 *   (a lista __ARQUIVOS__ é preenchida no build pelo vite.config.js).
 * - Página: tenta a rede (para pegar atualizações) e, sem internet,
 *   usa a cópia guardada.
 * - Demais arquivos (têm nome com hash): usa a cópia guardada.
 */
const ARQUIVOS = self.__ARQUIVOS__ || ['/'];
const CACHE = `dra-lara-${self.__VERSAO__ || 'dev'}`;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put('/', copia));
          return resp;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(
      (guardado) =>
        guardado ||
        fetch(req).then((resp) => {
          if (resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copia));
          }
          return resp;
        }),
    ),
  );
});
