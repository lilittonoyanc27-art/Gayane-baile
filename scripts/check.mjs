// Content validator: npm run check
import { build } from 'esbuild'
import { readFileSync, readdirSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
const dir = mkdtempSync(join(tmpdir(), 'gy-')), out = join(dir, 'c.mjs')
await build({ stdin: { contents: "export * from './src/data/talk';export * from './src/data/dialogs';export * from './src/data/grammar';export * from './src/data/games';export * from './src/data/cities';export * from './src/three/moves';export * from './src/data/items';export * from './src/data/npcs';export * from './src/lang/lexicon';", resolveDir: process.cwd(), loader: 'ts' }, bundle: true, format: 'esm', outfile: out, platform: 'node', external: [] }).catch(e => { console.error(e.message); process.exit(1) })
globalThis.document = { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) }
let d; try { d = await import(out) } catch (e) { console.error('import', e); process.exit(1) }
const errs = [], say = m => errs.push(m)
console.log('Preguntas:', d.TALK.length, '| NPC con diálogo:', Object.keys(d.DIALOGS).length, '| Gramática:', d.GRAMMAR.length, '| Movimientos:', d.MOVES.length, '| Artículos:', d.ALL_ITEMS.length)
if (d.TALK.length < 100) say('menos de 100 preguntas')
for (const t in d.TOPICS) if (d.GRAMMAR.filter(g => g.g === t).length < 3) say('poca gramática ' + t)
d.PASA.forEach((p, i) => { const L = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'; if (p.map(x => x.L).join('') !== L) say('pasapalabra ' + i); p.forEach(x => { const n = s => s.toUpperCase().normalize('NFD').replace(/Ñ/g, 'Ñ').replace(/[̀-̂̄-ͯ]/g, ''); const w = n(x.w); if (x.c ? !w.includes(x.L) : w[0] !== x.L) say('letra ' + x.L + ' ' + x.w) }) })
d.GRAMMAR.forEach(g => { if (!g.s.includes('___') || g.w.length < 2) say('gram ' + g.s) })
for (const id in d.NPCS) if (!d.DIALOGS[id]) say('sin diálogo: ' + id)
for (const [id, ts] of Object.entries(d.DIALOGS)) ts.forEach(t => { if (!t.o.some(o => o[1] === 2)) say('sin respuesta correcta ' + id); const m = t.m.split('|')[0].toLowerCase(); if (!t.k.split(' ').some(k => m.includes(k))) say('modelo no contiene clave ' + id + ': ' + t.m) })
// every "es|hy" string in the sources: Armenian side must contain Armenian letters
const es = new Map(); const strs = readdirSync('src', { recursive: true }).filter(f => /\.tsx?$/.test(f) && !f.includes('test')).map(f => readFileSync(join('src', f), 'utf8')).join('\n')
const add = (a, b, w = '') => { if (!/[Ա-և]/.test(b)) { say('sin armenio: ' + a + ' | ' + b + w); return } if (/[а-яё]/i.test(a + b)) say('ruso: ' + a); es.set(a, b) }
for (const m of strs.matchAll(/['"`>]([^'"`<>|\n{}$]*[a-záéíóúñ¿¡][^'"`<>|\n{}$]*)\|([^'"`<>|\n{}$]*[Ա-և][^'"`<>|\n]*?)['"`<]/gi)) add(m[1], m[2])
d.TALK.forEach(q => [q.q, q.s, q.l].forEach(x => { const [a, b] = x.split('|'); add(a, b ?? '', q.id) }))
d.PASA.flat().forEach(p => { const [a, b] = p.d.split('|'); add(a, b) })
d.ATRAPA.flat().forEach(r => [r[0], ...r[1].split(','), ...r[2].split(',')].forEach(x => { const [a, b] = x.split('|'); add(a, b ?? '') }))
d.DETECTIVE.flat().forEach(r => { add(r[0], r[2]); add(r[1], r[2]) })
const words = new Map(); for (const a of es.keys()) for (const w of a.toLowerCase().match(/[a-záéíóúüñ]+/g) ?? []) words.set(w, (words.get(w) ?? 0) + 1)
d.GRAMMAR.forEach(g => [g.a, ...g.w].forEach(x => (x.toLowerCase().match(/[a-záéíóúüñ]+/g) ?? []).forEach(w => words.set(w, (words.get(w) ?? 0) + 1))))
d.QUIZ.flat().forEach(q => [q[1], ...q[2]].forEach(x => (x.toLowerCase().match(/[a-záéíóúüñ]+/g) ?? []).forEach(w => words.set(w, (words.get(w) ?? 0) + 1))))
const miss = [...words.keys()].filter(w => !d.lookup(w)).sort()
console.log('Frases:', es.size, '| Palabras:', words.size, '| sin traducción individual:', miss.length)
if (process.argv.includes('--miss')) console.log(miss.join(' '))
if (errs.length) { console.log(errs.slice(0, 60).join('\n')); console.log('ERRORES', errs.length) } else console.log('OK')
