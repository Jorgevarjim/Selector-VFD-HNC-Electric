// Service worker del Selector HNC: permite usarlo sin conexión.
// - Página, base técnica e inventario: primero red (4 s) y, si falla, la última copia guardada.
// - Logo e íconos: primero copia local.
// Al publicar cambios importantes de imágenes, sube el número de versión V.
const V = 'hnc-v2';
const SHELL = ['/', '/tecnica.json', '/manifest.webmanifest', '/logo.png', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(V);
  await c.addAll(SHELL);
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
  await self.clients.claim();
})()));

async function netFirst(req) {
  const c = await caches.open(V); let t;
  try {
    const r = await Promise.race([fetch(req), new Promise((_, j) => { t = setTimeout(j, 4000); })]);
    clearTimeout(t);
    if (r.status >= 500) throw new Error('server');
    if (r.ok) c.put(req, r.clone());
    return r;
  } catch (_) {
    clearTimeout(t);
    const m = (await c.match(req)) || (req.mode === 'navigate' ? await c.match('/') : null);
    if (!m) return Response.error();
    if (new URL(req.url).pathname === '/api/inventario') {
      const h = new Headers(m.headers); h.set('x-hnc-cache', '1'); // avisa a la página que son datos guardados
      return new Response(m.body, { status: 200, headers: h });
    }
    return m;
  }
}

async function cacheFirst(req) {
  const c = await caches.open(V), m = await c.match(req);
  if (m) return m;
  try {
    const r = await fetch(req);
    if (r.ok || r.type === 'opaque') c.put(req, r.clone());
    return r;
  } catch (_) { return Response.error(); }
}

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === self.location.origin) {
    if (r.mode === 'navigate' || u.pathname === '/tecnica.json' || u.pathname === '/api/inventario') return e.respondWith(netFirst(r));
    return e.respondWith(cacheFirst(r));
  }
  // Recursos de otros dominios (librería de Excel) los gestiona el navegador directamente.
});
