import React, { useEffect, useRef, useState } from 'react'
import { setU, useUI, U } from './state'
import { lookup } from '../lang/lexicon'
import { speak } from '../lang/speech'
import { S, useSave } from '../store'
import { sfx, resume } from '../audio/music'
import { MV, type Move } from '../three/moves'
export const es = (t: string) => t.split('|')[0]
export const hy = (t: string) => t.split('|')[1] ?? ''
export const shuffle = <T,>(a: T[]): T[] => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]] } return b }
export const pick = <T,>(a: T[], n: number) => shuffle(a).slice(0, n)
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/ñ/g, 'ñ').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export function popup(e: { clientX: number; clientY: number }, t: string, word?: string) {
  const a = es(t), b = hy(t) || lookup(a); resume(); setU({ pop: { es: a, hy: b, word, x: e.clientX, y: e.clientY } }); speak(word && word !== a ? word : a)
  const s = S(); if (word) { const w = lookup(word); if (w) s.learn(word.toLowerCase(), w) } if (b) s.learn(a, b); s.bump('traducir')
}
/** Spanish text: every word opens its Armenian translation together with the whole phrase */
export function E({ t, className, big, speakBtn }: { t: string; className?: string; big?: boolean; speakBtn?: boolean }) {
  const a = es(t), parts = a.split(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)/)
  return <span className={'es ' + (big ? 'big ' : '') + (className ?? '')} lang="es">{parts.map((p, i) => /[A-Za-zÁ-ú]/.test(p) ? <span key={i} className="w" role="button" tabIndex={-1} onClick={e => { e.stopPropagation(); popup(e, t, p) }}>{p}</span> : p.trim() ? <span key={i} className="pn" onClick={e => { e.stopPropagation(); popup(e, t) }}>{p}</span> : p)}{speakBtn && <Say t={a} />}</span>
}
export const Say = ({ t, male }: { t: string; male?: boolean }) => <span className="say"><button type="button" aria-label="Escuchar" onClick={e => { e.stopPropagation(); speak(t, undefined, male) }}><I n="sound" /></button><button type="button" aria-label="Escuchar despacio" onClick={e => { e.stopPropagation(); speak(t, 0.55, male) }}><I n="slow" /></button></span>
/** Button with its own translate chip; in translation mode the whole button translates */
export function B({ t, on, k = '', dis, icon, children }: { t: string; on?: () => void; k?: string; dis?: boolean; icon?: string; children?: React.ReactNode }) {
  return <button type="button" className={'btn ' + k} disabled={dis} onClick={e => { if (U().tmode) { popup(e, t); return } sfx('click'); on?.() }}>{icon && <I n={icon} />}<span lang="es">{es(t)}</span>{children}<span className="chip" role="button" aria-label="Հայերեն" title={hy(t)} onClick={e => { e.stopPropagation(); popup(e, t) }}>ա</span></button>
}
export function IconB({ n, t, on, k = '' }: { n: string; t: string; on: () => void; k?: string }) { return <button type="button" className={'ic ' + k} aria-label={es(t)} title={es(t) + ' · ' + hy(t)} onClick={e => { if (U().tmode) { popup(e, t); return } sfx('click'); on() }}><I n={n} /></button> }
const P: Record<string, string> = { sound: 'M4 9v6h4l5 4V5L8 9H4zm12.5-1.5a6 6 0 010 9M18.5 5a9.5 9.5 0 010 14', slow: 'M3 16c0-4 3-7 7-7s6 3 6 7M2 16h17a3 3 0 003-3c0-2-1-3-2.5-3S17 11 17 13M6 16v2m8-2v2', map: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15', book: 'M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4V4zm16 0h-5a2 2 0 00-2 2v14a2 2 0 012-2h5V4z', star: 'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.3L12 17.5 6.5 20.4l1-6.3L3 9.7l6.2-.9L12 3z', menu: 'M4 6h16M4 12h16M4 18h16', x: 'M5 5l14 14M19 5L5 19', coin: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 5v8m-2.5-6.5c0-2 5-2 5 0s-5 2.5-5 4.5 5 2 5 0', user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-8 9c0-5 4-7 8-7s8 2 8 7', bag: 'M5 8h14l1 12H4L5 8zm4 0V6a3 3 0 016 0v2', gear: 'M12 9a3 3 0 100 6 3 3 0 000-6zm0-6v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1m-8.6 8.6l-2.1 2.1', back: 'M15 5l-7 7 7 7', play: 'M7 4l13 8-13 8V4z', pause: 'M7 4v16M17 4v16', redo: 'M20 11a8 8 0 10-2.3 6M20 4v7h-7', full: 'M4 9V4h5M20 9V4h-5M4 15v5h5m11-5v5h-5', mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm-7 9a7 7 0 0014 0M12 19v3', home: 'M3 11l9-8 9 8v10h-6v-6H9v6H3V11z', run: 'M13 4a1.5 1.5 0 110 .1M9 21l2-6-3-3 3-5 4 3h4M8 12l-4 1m7 2l4 2v4', hand: 'M8 13V5a1.5 1.5 0 013 0v6-8a1.5 1.5 0 013 0v8-6a1.5 1.5 0 013 0v9c0 5-2 7-6 7s-6-3-8-7l-1-2c1-2 3-1 3 1z', lang: 'M3 5h10M8 3v2c0 5-2 8-5 10m2-6c1 3 4 5 7 6m1 6l4-11 4 11m-6.5-4h5', trophy: 'M7 4h10v5a5 5 0 01-10 0V4zM7 6H4c0 4 1 5 3 5m10-5h3c0 4-1 5-3 5m-5 3v4m-4 3h8', down: 'M6 9l6 6 6-6', trash: 'M5 7h14M9 7V4h6v3m-8 0l1 13h8l1-13', cam: 'M4 8h4l2-3h4l2 3h4v11H4V8zm8 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z' }
export const I = ({ n }: { n: string }) => <svg className="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={P[n] ?? P.star} /></svg>
export function Panel({ t, onClose, children, k = '', tools }: { t: string; onClose?: () => void; children: React.ReactNode; k?: string; tools?: React.ReactNode }) {
  return <section className={'panel ' + k} role="dialog" aria-label={es(t)}><header><h2><E t={t} /></h2><div className="tools">{tools}{onClose && <IconB n="x" t="Cerrar|Փակել" on={onClose} />}</div></header><div className="body">{children}</div></section>
}
export const Bar = ({ v, c = '' }: { v: number; c?: string }) => <div className={'bar ' + c}><i style={{ width: Math.max(0, Math.min(100, v * 100)) + '%' }} /></div>
export function useTimer(sec: number, run: boolean, end: () => void) {
  const [l, setL] = useState(sec), rem = useRef(sec), r = useRef(end); r.current = end
  useEffect(() => { rem.current = sec; setL(sec) }, [sec])
  useEffect(() => { if (!run) return; let last = performance.now(); const h = setInterval(() => { const n = performance.now(); if (!U().pause && !U().loading) rem.current -= (n - last) / 1000; last = n; setL(Math.max(0, rem.current)); if (rem.current <= 0) { clearInterval(h); r.current() } }, 100); return () => clearInterval(h) }, [run, sec])
  return [l, (x: number) => { rem.current = x; setL(x) }] as const
}
/** later-safe timeouts cleared on unmount */
export function useLater() { const ids = useRef<number[]>([]); useEffect(() => () => ids.current.forEach(clearTimeout), []); return (f: () => void, ms: number) => { ids.current.push(window.setTimeout(f, ms)) } }
const bt: Record<string, number> = {}
function bestT(id: string) { if (bt[id] !== undefined) return bt[id]; const m = MV[id]; let b = 0, bd = -1; for (let i = 1; i < 12; i++) { const p: any = m.f(m.len * i / 12, m.len), g = (k: string, d: number, w = 1) => Math.abs((p[k] ?? d) - d) * w, v = g('ly', -0.9) + g('ry', -0.9) + g('lx', 0.22) + g('rx', 0.22) + g('lfx', 0.12, 2.5) + g('rfx', 0.12, 2.5) + g('lfy', 0, 4) + g('rfy', 0, 4) + g('lfz', 0, 1.5) + g('rfz', 0, 1.5) + g('hrol', 0, 3) + g('sr', 0, 3) + g('hy', 0, 4) + Math.abs((p.ly ?? 0) - (p.ry ?? 0)); if (v > bd) { bd = v; b = m.len * i / 12 } } return (bt[id] = b) }
export function MoveIcon({ id, s = 64 }: { id: string; s?: number }) {
  const m = MV[id]; if (!m) return null; const p: any = { hx: 0, hy: 0, hrol: 0, sr: 0, cr: 0, lfx: 0.12, rfx: 0.12, lfy: 0, rfy: 0, lfz: 0, rfz: 0, lx: 0.22, ly: -0.9, rx: 0.22, ry: -0.9, lz: 0, rz: 0, hpit: 0, ...m.f(bestT(id), m.len) }
  const X = (x: number) => 32 - x * 34, Y = (y: number) => 60 - y * 30, hx = p.hx, hy = 0.95 + p.hy * 1.6, tilt = -(p.hrol + p.sr + p.cr), sx = hx + Math.sin(tilt) * 0.45, sy = hy + 0.42 - Math.abs(p.hpit) * 0.15
  const arm = (s1: number, x: number, y: number, z: number) => { const ax = sx + s1 * 0.16, ay = sy; const bx = ax + s1 * (x + Math.abs(z) * 0.18) * 0.5, by = ay + (y + z * 0.12) * 0.5; return `M${X(ax)} ${Y(ay)}Q${X((ax + bx) / 2 + s1 * 0.12)} ${Y((ay + by) / 2 - 0.03)} ${X(bx)} ${Y(by)}` }
  const leg = (s1: number, x: number, y: number, z: number) => { const ax = hx + s1 * 0.07, bx = s1 * (x + Math.abs(z) * 0.5); return `M${X(ax)} ${Y(hy)}Q${X((ax + bx) / 2 + s1 * (y * 0.6 + 0.03))} ${Y(hy / 2 + y * 0.4)} ${X(bx)} ${Y(y)}` }
  const tr = m.travel
  return <svg className="mv" width={s} height={s} viewBox="0 0 64 64" aria-hidden><g fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d={arm(1, p.lx, p.ly, p.lz)} /><path d={arm(-1, p.rx, p.ry, p.rz)} /><path d={leg(1, p.lfx, p.lfy, p.lfz)} /><path d={leg(-1, p.rfx, p.rfy, p.rfz)} /><path d={`M${X(hx)} ${Y(hy)}L${X(sx)} ${Y(sy)}M${X(sx + 0.16)} ${Y(sy)}L${X(sx - 0.16)} ${Y(sy)}`} /></g><circle cx={X(sx + Math.sin(tilt) * 0.2)} cy={Y(sy + 0.24)} r="5" fill="currentColor" />{tr && <g fill="none" stroke="var(--gold)" strokeWidth="2.6" strokeLinecap="round">{tr[2] ? <path d={tr[2] > 0 ? 'M12 54a22 7 0 0040 0m0 0l-1 5m1-5l-5 0' : 'M52 54a22 7 0 01-40 0m0 0l1 5m-1-5l5 0'} /> : tr[0] ? <path d={tr[0] > 0 ? 'M6 34h9m-9 0l4-4m-4 4l4 4' : 'M58 34h-9m9 0l-4-4m4 4l-4 4'} /> : <path d={tr[1] > 0 ? 'M57 46v12m0 0l-4-4m4 4l4-4' : 'M57 58V46m0 0l-4 4m4-4l4 4'} />}</g>}</svg>
}
export interface Res { score: number; max: number; errs?: { q: string; a: string; e: string }[]; title?: string; extra?: React.ReactNode }
export function Result({ r, retry, exit, next }: { r: Res; retry?: () => void; exit: () => void; next?: [string, () => void] }) {
  const p = Math.round(r.score / Math.max(1, r.max) * 100); useEffect(() => { sfx(p >= 60 ? 'win' : 'bad') }, [])
  return <div className="result"><div className="ring" style={{ '--p': p } as any}><b>{p}</b><small>/ 100</small></div><h3><E t={p >= 90 ? '¡Espectacular!|Հոյակա՛պ է' : p >= 75 ? '¡Muy bien!|Շա՛տ լավ' : p >= 60 ? '¡Bien hecho!|Լա՛վ արեցիր' : 'Sigue practicando|Շարունակիր պարապել'} /></h3>{r.extra}{!!r.errs?.length && <div className="errs"><h4><E t="Aprende de tus errores|Սովորիր սխալներիցդ" /></h4>{r.errs.map((x, i) => <div key={i} className="err"><p><E t={x.q} /></p><p className="ok">→ <E t={x.a} /></p>{x.e && <p className="why"><E t={x.e} /><span className="hy">{hy(x.e)}</span></p>}</div>)}</div>}<div className="row">{next && <B t={next[0]} on={next[1]} k="pri" />}{retry && <B t="Jugar otra vez|Նորից խաղալ" icon="redo" on={retry} k={next ? '' : 'pri'} />}<B t="Salir|Դուրս գալ" on={exit} /></div></div>
}
export const mvName = (m: Move | string) => (typeof m === 'string' ? MV[m].t : m.t)
/** free composition of a Spanish answer: word tiles + typing, with feedback */
export function Compose({ model, keys, onDone }: { model: string; keys: string; onDone: (ok: boolean) => void }) {
  const [v, setV] = useState(''), [fb, setFb] = useState<null | { ok: boolean; m: string }>(null); const tiles = useRef(shuffle(es(model).replace(/[.,;:!?¡¿]/g, '').split(' ')))
  const check = () => { const a = norm(v), n = a.split(' ').filter(Boolean), K = keys.split(' ').map(norm), hit = K.some(x => a.includes(x)), M = norm(es(model)).split(' '), over = M.filter(x => n.includes(x)).length / M.length; const bad = /\b(yo ir|yo ser|soy quince|yo tener|tengo hambre de bailar)\b/.test(a); const ok = n.length >= 3 && (hit || over > 0.5) && !bad; setFb({ ok, m: ok ? '¡Muy bien! Compara tu frase con el ejemplo.|Շատ լավ։ Համեմատիր օրինակի հետ։' : n.length < 3 ? 'Escribe al menos tres palabras.|Գրիր առնվազն երեք բառ։' : 'Casi. Mira el ejemplo e inténtalo otra vez.|Գրեթե։ Նայիր օրինակին և նորից փորձիր։' }); sfx(ok ? 'ok' : 'bad'); if (ok) { S().add({ es: 8, coins: 3 }); S().bump('frase'); speak(v) } }
  return <div className="compose"><div className="tiles">{tiles.current.map((w, i) => <button type="button" key={i} className="tile" onClick={() => setV(x => (x ? x + ' ' : '') + w)}>{w}</button>)}</div><textarea value={v} onChange={e => setV(e.target.value)} placeholder="Escribe tu propia frase…" rows={2} lang="es" /><div className="row"><B t="Comprobar|Ստուգել" on={check} k="pri" /><B t="Borrar|Ջնջել" on={() => { setV(''); setFb(null) }} />{fb && <B t="Continuar|Շարունակել" on={() => onDone(fb.ok)} />}</div>{fb && <div className={'fb ' + (fb.ok ? 'ok' : 'no')}><E t={fb.m} /><p className="model"><E t={model} speakBtn /><span className="hy">{hy(model)}</span></p></div>}</div>
}
export const useSet = () => useSave(s => s.set)
export function Opts({ o, onPick, state, good }: { o: string[]; onPick: (x: string) => void; state?: string | null; good?: string }) { return <div className="opts">{o.map((x, i) => <div key={x + i} className={'opt ' + (state ? (x === good ? 'good' : x === state ? 'bad' : 'dim') : '')} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && !state && onPick(x)} onClick={e => { if (U().tmode) { popup(e, x); return } if (!state) onPick(x) }}><em>{'ABCDEF'[i]}</em><span lang="es">{es(x)}</span><span className="chip" role="button" onClick={e => { e.stopPropagation(); popup(e, x) }}>ա</span></div>)}</div> }
export const useScene = () => useUI(s => s.scene)
