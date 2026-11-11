// Ejecutar: node tests/api.test.mjs   (Node 18+)
import { onRequestGet, onRequestPost } from '../functions/api/inventario.js';
import assert from 'node:assert/strict';
const kv = new Map();
const env = { ADMIN_PASSWORD: 'secreta-123', INVENTARIO: { get: async k => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v) } } };
const post = (body, pw = 'secreta-123') => onRequestPost({ env, request: new Request('https://x/api/inventario', { method: 'POST', headers: pw ? { authorization: 'Bearer ' + pw } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) }) });
const ok = { inv: { 'HV100-030G2': [3, 0, 'VARIADOR'], 'HV10-R40G1-1': [0, 5, ''] }, meta: { file: 'a.xlsx', fileDate: '2026-11-09T00:00:00.000Z', rows: 625, unmatched: ['HV100-090G2'] } };
let r = await onRequestGet({ env }); assert.deepEqual(await r.json(), { meta: null, inv: {} }); console.log('GET vacío OK');
r = await post(ok, 'mala'); assert.equal(r.status, 401); r = await post(ok, null); assert.equal(r.status, 401); console.log('contraseña incorrecta/ausente → 401 OK');
r = await post(ok); assert.equal(r.status, 200); const g = await (await onRequestGet({ env })).json();
assert.equal(g.meta.matched, 2); assert.equal(g.inv['HV100-030G2'][0], 3); assert.equal(g.meta.file, 'a.xlsx'); console.log('POST válido + GET OK');
const bad = [[{ ...ok, inv: { 'HV100-030G2': [-1, 0, ''] } }, 'negativo'], [{ ...ok, inv: { 'XX-1': [1, 1, ''] } }, 'modelo inválido'], [{ ...ok, inv: { 'HV100-030G2': [1.5, 0, ''] } }, 'decimal'], [{ ...ok, inv: {} }, 'vacío'], [{ ...ok, meta: { ...ok.meta, file: '' } }, 'sin nombre'], ['no-json', 'json roto']];
for (const [b, n] of bad) { r = await post(b); assert.equal(r.status, 400, n); }
const g2 = await (await onRequestGet({ env })).json(); assert.deepEqual(g2, g); console.log('6 payloads inválidos → 400 y el inventario previo se conserva OK');
const ok2 = { ...ok, inv: { 'HV480-004G1': [9, 9, 'x'] }, meta: { ...ok.meta, file: 'b.xlsx' } };
r = await post(ok2); assert.equal(r.status, 200); const g3 = await (await onRequestGet({ env })).json();
assert.deepEqual(Object.keys(g3.inv), ['HV480-004G1']); assert.ok(JSON.parse(kv.get('inventario_anterior')).inv['HV100-030G2']); console.log('reemplaza (no acumula) y respalda el anterior OK');
r = await onRequestPost({ env: { INVENTARIO: env.INVENTARIO }, request: new Request('https://x', { method: 'POST', body: '{}' }) }); assert.equal(r.status, 500); console.log('sin contraseña configurada → 500 OK');
