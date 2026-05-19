const CACHE_NAME = 'financas-v2'; // Nome atualizado para forçar o navegador a notar a mudança
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './favicon.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalação: Baixa os arquivos e força o novo Service Worker a assumir
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Ativação: Limpa as versões antigas do cache ('financas-v1')
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interceptação: Estratégia de Cache-Control para não “cair” no offline/versão antiga
// quando o usuário atualiza/sai (principalmente em mobile).
// - assets estáticos: Stale-While-Revalidate (mantém sessão e reduz reflow)
// - navegação (document): Network First com fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Não interferir em requisições do próprio Google/OAuth/etc.
  if (!url.origin || url.origin === 'null') return;

  // Navegação do documento (index.html)
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Para recursos do app (estáticos do cache)
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req).then(res => {
        const cache = caches.open(CACHE_NAME);
        cache.then(c => c.put(req, res.clone()));
        return res;
      });

      return cached || fetchPromise;
    })
  );
});
