// API del inventario semanal (Cloudflare Pages Functions + KV).
// GET  /api/inventario  -> público: devuelve el inventario vigente.
// POST /api/inventario  -> protegido con contraseña (variable ADMIN_PASSWORD): reemplaza el inventario.
const MODEL = /^HV(10|100|480|610|320)-[0-9R]{3}G[1-4](-[12])?$/;
const H = { 'content-type': 'application/json; charset=utf-8' };
const out = (o, s = 200, extra = {}) => new Response(JSON.stringify(o), { status: s, headers: { ...H, 'cache-control': 'no-store', ...extra } });
const sha = async (s) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));

async function authorized(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const a = request.headers.get('authorization') || '';
  const given = a.startsWith('Bearer ') ? a.slice(7) : '';
  const [x, y] = await Promise.all([sha(given), sha(env.ADMIN_PASSWORD)]);
  let d = 0; for (let i = 0; i < 32; i++) d |= x[i] ^ y[i];
  return d === 0;
}

function validate(b) {
  if (!b || typeof b !== 'object' || !b.inv || typeof b.inv !== 'object' || Array.isArray(b.inv)) return 'Formato inválido.';
  const keys = Object.keys(b.inv);
  if (keys.length < 1 || keys.length > 1500) return 'Cantidad de modelos fuera de rango.';
  for (const k of keys) {
    if (!MODEL.test(k)) return `Número de parte no válido: ${k.slice(0, 40)}`;
    const v = b.inv[k];
    if (!Array.isArray(v) || v.length !== 3) return `Registro inválido: ${k}`;
    for (const n of [v[0], v[1]]) if (!Number.isInteger(n) || n < 0 || n > 10000000) return `Existencias inválidas en ${k}`;
    if (typeof v[2] !== 'string' || v[2].length > 600) return `Descripción inválida en ${k}`;
  }
  const m = b.meta || {};
  if (typeof m.file !== 'string' || !m.file || m.file.length > 200) return 'Nombre de archivo inválido.';
  if (m.fileDate != null && (typeof m.fileDate !== 'string' || isNaN(Date.parse(m.fileDate)))) return 'Fecha del consolidado inválida.';
  if (!Number.isInteger(m.rows) || m.rows < 0) return 'Total de registros inválido.';
  if (m.unmatched != null && (!Array.isArray(m.unmatched) || m.unmatched.length > 500 || m.unmatched.some(u => typeof u !== 'string' || u.length > 80))) return 'Lista de no relacionados inválida.';
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.INVENTARIO) return out({ error: 'config' }, 500);
  const raw = await env.INVENTARIO.get('inventario');
  return new Response(raw || JSON.stringify({ meta: null, inv: {} }), { headers: { ...H, 'cache-control': 'public, max-age=30' } });
}

export async function onRequestPost({ request, env }) {
  if (!env.INVENTARIO || !env.ADMIN_PASSWORD) return out({ error: 'config', detail: 'Falta configurar el KV o la contraseña en Cloudflare.' }, 500);
  if (!(await authorized(request, env))) { await new Promise(r => setTimeout(r, 600)); return out({ error: 'auth' }, 401); }
  const txt = await request.text();
  if (txt.length > 2000000) return out({ error: 'size', detail: 'Archivo demasiado grande.' }, 413);
  let body; try { body = JSON.parse(txt); } catch { return out({ error: 'json', detail: 'JSON inválido.' }, 400); }
  const err = validate(body);
  if (err) return out({ error: 'validation', detail: err }, 400);
  const m = body.meta;
  const meta = { file: m.file, at: new Date().toISOString(), fileDate: m.fileDate || null, rows: m.rows, matched: Object.keys(body.inv).length, unmatched: m.unmatched || [] };
  const prev = await env.INVENTARIO.get('inventario');
  if (prev) await env.INVENTARIO.put('inventario_anterior', prev); // respaldo de la versión previa
  await env.INVENTARIO.put('inventario', JSON.stringify({ meta, inv: body.inv }));
  return out({ ok: true, meta });
}
