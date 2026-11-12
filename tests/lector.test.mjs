// Ejecutar: node tests/lector.test.mjs  — prueba los mensajes de error del lector de Excel con piezas simuladas.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const h = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const code = h.slice(h.indexOf('const fail='), h.indexOf('async function parse(f)')) + h.slice(h.indexOf('async function parse(f)'), h.indexOf("$('#upbtn')"));
const run = (env) => new Function('window', 'document', 'XLSX', 'theo', 'FileReader', code + ';return {parse,lib}')(env.window, env.document, env.XLSX, () => new Set(), env.FileReader);
const msg = async (p) => { try { await p; return null } catch (e) { return e } };
// 1) lector no disponible (ni cdnjs ni jsdelivr cargan)
let doc = { head: { appendChild: s => setTimeout(() => s.onerror(), 0) }, createElement: () => ({}) };
let e = await msg(run({ window: {}, document: doc, XLSX: undefined }).parse({})); assert.match(e.message, /lector de Excel/); console.log('lector no disponible → mensaje claro OK');
// 2) archivo ilegible (p. ej. abierto en Excel / en la nube)
const XL = { read: () => { throw new Error('bad zip') }, utils: {} };
class FR { readAsArrayBuffer() { setTimeout(() => this.onerror(), 0) } }
e = await msg(run({ window: { XLSX: XL }, document: doc, XLSX: XL, FileReader: FR }).parse({ arrayBuffer: async () => { throw Object.assign(new Error('x'), { name: 'NotReadableError' }) } })); assert.match(e.message, /No se pudo abrir el archivo/); assert.equal(e.detail, 'undefined' === e.detail ? '' : e.detail); console.log('archivo ilegible → mensaje con instrucciones OK (' + e.detail + ')');
// 3) lectura alterna con FileReader cuando arrayBuffer falla
class FR2 { readAsArrayBuffer() { setTimeout(() => { this.result = new ArrayBuffer(4); this.onload() }, 0) } }
e = await msg(run({ window: { XLSX: XL }, document: doc, XLSX: XL, FileReader: FR2 }).parse({ arrayBuffer: async () => { throw new Error('x') } })); assert.match(e.message, /no parece un Excel válido/); console.log('arrayBuffer falla → usa FileReader y continúa OK');
// 4) archivo que no es Excel
e = await msg(run({ window: { XLSX: XL }, document: doc, XLSX: XL }).parse({ arrayBuffer: async () => new ArrayBuffer(4) })); assert.match(e.message, /no parece un Excel válido/); console.log('archivo no Excel → mensaje claro OK');
