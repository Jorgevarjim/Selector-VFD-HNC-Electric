// Ejecutar: node tests/sw.test.mjs   (Node 18+)  Simula el service worker con un caché de mentira.
import assert from 'node:assert/strict'; import fs from 'node:fs';
const store = new Map(); const key = x => new URL(x.url || x, 'https://h/').href;
const cache = { put: async (r, res) => { store.set(key(r), res) }, match: async r => { const v = store.get(key(r)); return v ? v.clone() : undefined }, addAll: async () => {}, add: async () => {} };
const listeners = {}; let online = true, calls = 0;
globalThis.self = { location: { origin: 'https://h' }, addEventListener: (n, f) => listeners[n] = f, skipWaiting() {}, clients: { claim() {} } };
globalThis.caches = { open: async () => cache, keys: async () => [], delete: async () => {} };
globalThis.fetch = async r => { calls++; if (!online) throw new Error('offline'); const p = new URL(r.url).pathname; return new Response(p === '/api/inventario' ? '{"inv":{"A":1}}' : 'x', { status: 200 }) };
eval(fs.readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'));
const ask = async (url, mode = 'cors') => { let out; listeners.fetch({ request: { url: 'https://h' + url, method: 'GET', mode }, respondWith: p => out = p }); return out };
// 1) con red: responde la red y guarda copia
let r = await ask('/api/inventario'); assert.equal(await r.text(), '{"inv":{"A":1}}'); assert.equal(r.headers.get('x-hnc-cache'), null); console.log('con red → datos frescos, sin marca OK');
await ask('/tecnica.json'); await ask('/', 'navigate');
// 2) sin red: usa copia y marca el inventario como guardado
online = false;
r = await ask('/api/inventario'); assert.equal(await r.text(), '{"inv":{"A":1}}'); assert.equal(r.headers.get('x-hnc-cache'), '1'); console.log('sin red → inventario guardado con marca x-hnc-cache OK');
r = await ask('/tecnica.json'); assert.equal(await r.text(), 'x'); console.log('sin red → base técnica guardada OK');
r = await ask('/?utm=1', 'navigate'); assert.equal(await r.text(), 'x'); console.log('sin red → la página abre desde la copia local OK');
// 3) POST no se intercepta (la carga de inventario siempre va al servidor)
let hit = false; listeners.fetch({ request: { url: 'https://h/api/inventario', method: 'POST', mode: 'cors' }, respondWith: () => hit = true }); assert.equal(hit, false); console.log('POST de carga no interceptado OK');
// 4) sin copia previa y sin red: falla limpia
r = await ask('/api/otra'); assert.equal(r.type, 'error'); console.log('sin copia y sin red → error controlado OK');
