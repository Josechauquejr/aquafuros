// Service worker do Aquafuros — torna a app instalável e mostra uma página
// própria sem internet. Nunca guarda páginas nem dados: o HTML e as respostas
// do Inertia trazem dados da sessão e o token CSRF, que ficariam desactualizados.
// Só guarda os assets com hash do Vite (/build/assets), que nunca mudam.
const VERSAO = 'aquafuros-v1';
const OFFLINE = '/offline.html';
const ESTATICOS = [OFFLINE, '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ESTATICOS)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const pedido = event.request;
    if (pedido.method !== 'GET') return;

    const url = new URL(pedido.url);
    if (url.origin !== self.location.origin) return;

    // Navegação completa (abrir a app, recarregar): sempre a rede; sem rede, a página offline.
    if (pedido.mode === 'navigate') {
        event.respondWith(fetch(pedido).catch(() => caches.match(OFFLINE)));
        return;
    }

    // Assets com hash: cache primeiro, rede como recurso.
    if (url.pathname.startsWith('/build/assets/')) {
        event.respondWith(
            caches.open(VERSAO).then(async (cache) => {
                const guardado = await cache.match(pedido);
                if (guardado) return guardado;
                const resposta = await fetch(pedido);
                if (resposta.ok) cache.put(pedido, resposta.clone());
                return resposta;
            }),
        );
    }
});
