// Original, fully synthesised music. No samples, no third-party recordings.
import type { Style } from '../three/moves'
export type Track = Style | 'menu' | 'cafe' | 'puzzle' | 'gala'
let ctx: AudioContext | null = null, master: GainNode, mus: GainNode, sfxG: GainNode, rev: ConvolverNode, revIn: GainNode, noise: AudioBuffer
export let vol = { music: 0.6, sfx: 0.8 }
export function ac() {
  if (ctx) return ctx
  ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  master = ctx.createGain(); const cmp = ctx.createDynamicsCompressor(); cmp.threshold.value = -14; master.connect(cmp); cmp.connect(ctx.destination)
  mus = ctx.createGain(); sfxG = ctx.createGain(); mus.gain.value = vol.music; sfxG.gain.value = vol.sfx; mus.connect(master); sfxG.connect(master)
  const len = ctx.sampleRate * 1.6, ir = ctx.createBuffer(2, len, ctx.sampleRate); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3) }
  rev = ctx.createConvolver(); rev.buffer = ir; revIn = ctx.createGain(); revIn.gain.value = 0.22; revIn.connect(rev); rev.connect(mus)
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const n = noise.getChannelData(0); for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1
  return ctx
}
export function setVol(m: number, s: number) { vol = { music: m, sfx: s }; if (ctx) { mus.gain.value = m; sfxG.gain.value = s } }
export const resume = () => { const c = ac(); if (c.state !== 'running') c.resume().catch(() => {}) }
const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
type Out = { g: GainNode }
function env(t: number, a: number, d: number, v: number, wet = 0, out: AudioNode = mus) { const g = ctx!.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); g.connect(out); if (wet) { const w = ctx!.createGain(); w.gain.value = wet; g.connect(w); w.connect(revIn) } return g }
function osc(type: OscillatorType, f: number, t: number, dur: number, to: AudioNode, det = 0) { const o = ctx!.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; o.connect(to); o.start(t); o.stop(t + dur); return o }
function nz(t: number, dur: number, type: BiquadFilterType, f: number, q: number, v: number, wet = 0, out?: AudioNode) { const s = ctx!.createBufferSource(); s.buffer = noise; const b = ctx!.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const g = env(t, 0.001, dur, v, wet, out); s.connect(b); b.connect(g); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05) }
const I: Record<string, (t: number, v: number, n: number, d: number) => void> = {
  kick: (t, v) => { const g = env(t, 0.002, 0.28, v); const o = osc('sine', 150, t, 0.35, g); o.frequency.exponentialRampToValueAtTime(44, t + 0.12) },
  snare: (t, v) => { nz(t, 0.16, 'highpass', 1500, 0.5, v * 0.5, 0.5); const g = env(t, 0.001, 0.09, v * 0.5); osc('triangle', 190, t, 0.12, g) },
  clap: (t, v) => { for (const d of [0, 0.011, 0.022]) nz(t + d, 0.09, 'bandpass', 1500, 1.4, v * 0.6, 0.6) },
  palma: (t, v) => { nz(t, 0.045, 'bandpass', 2200, 2.2, v * 1.2, 0.7); nz(t + 0.006, 0.03, 'bandpass', 1300, 2, v * 0.6, 0.4) },
  hat: (t, v) => nz(t, 0.045, 'highpass', 7500, 0.6, v * 0.3), ohat: (t, v) => nz(t, 0.2, 'highpass', 6500, 0.6, v * 0.25),
  shk: (t, v) => nz(t, 0.06, 'bandpass', 5500, 1.2, v * 0.28), guira: (t, v) => { nz(t, 0.09, 'bandpass', 6200, 3, v * 0.5) },
  clave: (t, v) => { const g = env(t, 0.001, 0.07, v * 0.4, 0.5); osc('sine', 2450, t, 0.1, g) },
  bell: (t, v) => { const g = env(t, 0.001, 0.16, v * 0.16, 0.3); osc('square', 560, t, 0.2, g); osc('square', 845, t, 0.2, g) },
  conga: (t, v, n) => { const g = env(t, 0.001, 0.2, v * 0.65, 0.2); const o = osc('sine', n ? 310 : 205, t, 0.25, g); o.frequency.exponentialRampToValueAtTime(n ? 260 : 170, t + 0.1); nz(t, 0.02, 'bandpass', 1500, 1, v * 0.2) },
  bongo: (t, v, n) => { const g = env(t, 0.001, 0.1, v * 0.5, 0.2); const o = osc('sine', n ? 560 : 400, t, 0.14, g); o.frequency.exponentialRampToValueAtTime(n ? 480 : 340, t + 0.06) },
  surdo: (t, v) => { const g = env(t, 0.002, 0.4, v); const o = osc('sine', 92, t, 0.5, g); o.frequency.exponentialRampToValueAtTime(58, t + 0.2) },
  tamb: (t, v) => { nz(t, 0.05, 'bandpass', 8200, 4, v * 0.45); nz(t, 0.03, 'bandpass', 900, 2, v * 0.25) },
  cajon: (t, v, n) => { if (n) nz(t, 0.09, 'bandpass', 900, 0.8, v * 0.9, 0.2); else { const g = env(t, 0.002, 0.16, v * 0.9); const o = osc('sine', 110, t, 0.2, g); o.frequency.exponentialRampToValueAtTime(60, t + 0.1) } },
  bass: (t, v, n, d) => { const g = env(t, 0.006, d, v * 0.5), f = ctx!.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 620; f.connect(g); osc('triangle', hz(n), t, d + 0.05, f); const g2 = ctx!.createGain(); g2.gain.value = 0.25; g2.connect(f); osc('sawtooth', hz(n), t, d + 0.05, g2) },
  sub: (t, v, n, d) => { const g = env(t, 0.005, d, v * 0.6); osc('sine', hz(n), t, d + 0.05, g); },
  gtr: (t, v, n, d) => { const f = ctx!.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(700, t + d); const g = env(t, 0.002, d, v * 0.16, 0.6); f.connect(g); osc('sawtooth', hz(n), t, d + 0.05, f, -4); osc('triangle', hz(n), t, d + 0.05, f, 5) },
  pno: (t, v, n, d) => { const g = env(t, 0.002, d, v * 0.15, 0.4); osc('triangle', hz(n), t, d + 0.05, g); const h = ctx!.createGain(); h.gain.value = 0.3; h.connect(g); osc('sine', hz(n + 12), t, d + 0.05, h); osc('square', hz(n), t, 0.05, h) },
  brass: (t, v, n, d) => { const f = ctx!.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(2600, t + 0.06); const g = env(t, 0.025, d, v * 0.1, 0.5); f.connect(g); osc('sawtooth', hz(n), t, d + 0.1, f, 6); osc('sawtooth', hz(n), t, d + 0.1, f, -6) },
  pad: (t, v, n, d) => { const f = ctx!.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1100; const g = env(t, 0.25, d, v * 0.06, 0.9); f.connect(g); osc('sawtooth', hz(n), t, d + 0.4, f, 8); osc('sawtooth', hz(n), t, d + 0.4, f, -8) },
  lead: (t, v, n, d) => { const g = env(t, 0.01, d, v * 0.08, 0.7), f = ctx!.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; f.connect(g); osc('square', hz(n), t, d + 0.05, f, 3); osc('sawtooth', hz(n), t, d + 0.05, f, -5) },
  flute: (t, v, n, d) => { const g = env(t, 0.04, d, v * 0.13, 0.8); osc('sine', hz(n), t, d + 0.1, g); osc('triangle', hz(n), t, d + 0.1, g, 7) },
}
// drum lanes are 16-step (1 bar) strings: x strong, o soft, 1/2 = variant tones
interface Song { bpm: number; swing?: number; drums: Record<string, string>; chords: number[][]; parts: (bar: number, st: number, t: number, s: number, ch: number[]) => void }
const P = (i: string, t: number, v: number, n = 0, d = 0.2) => I[i](t, v, n, d)
const am = [57, 60, 64], dm = [50, 57, 62, 65], g = [55, 59, 62], F = [53, 57, 60], E = [52, 56, 59], c = [48, 55, 60, 64]
const chordHit = (inst: string, ch: number[], t: number, v: number, d: number, strum = 0) => ch.forEach((n, i) => P(inst, t + i * strum, v, n + (inst === 'gtr' ? 0 : 12), d))
const has = (s: string, st: number) => s[st] !== '.' && s[st] !== undefined
const mel = (m: (number | 0)[], bar: number, st: number, every = 2) => { const i = ((bar % 4) * 16 + st) / every; return Number.isInteger(i) ? m[i % m.length] : 0 }
const S: Record<Track, Song> = {
  base: { bpm: 108, drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' }, chords: [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]], parts: (b, st, t, s, ch) => { if (st % 4 === 2) chordHit('pno', ch, t, 0.8, s * 2); if (st % 4 === 0) P('bass', t, 0.8, ch[0] - 12, s * 3); const n = mel([76, 0, 74, 72, 0, 72, 74, 0, 72, 0, 69, 0, 67, 0, 69, 0, 67, 0, 64, 67, 0, 72, 71, 0, 74, 0, 71, 0, 67, 0, 0, 0], b, st); if (n) P('flute', t, 0.8, n, s * 3) } },
  flamenco: { bpm: 112, drums: { cajon: '2..2..1.2..21.1.', palma: 'x...x.x.x...x.xx' }, chords: [am, g, F, E], parts: (b, st, t, s, ch) => { if (st === 0 || st === 6 || st === 8 || st === 14) chordHit('gtr', [...ch, ch[0] + 12], t, 0.9, s * 5, 0.012); if (st % 2 === 1 && b % 2) P('gtr', t, 0.7, ch[(st >> 1) % ch.length] + 12, s * 2); if (st === 0) P('bass', t, 0.7, ch[0] - 12, s * 6); const n = mel([76, 77, 76, 74, 72, 74, 72, 71, 72, 0, 0, 0, 0, 0, 0, 0, 74, 76, 74, 72, 71, 72, 71, 69, 71, 69, 68, 0, 0, 0, 0, 0], b, st); if (n && b % 8 > 3) P('gtr', t, 1.3, n, s * 3) } },
  salsa: { bpm: 184, drums: { clave: 'x..x..x...x.x...', conga: '..1...22..1...22', bell: 'x...x.x.x...x.x.', shk: 'xoxoxoxoxoxoxoxo' }, chords: [[57, 60, 64], [50, 57, 62, 65], [52, 56, 59, 62], [57, 60, 64]], parts: (b, st, t, s, ch) => { if (st === 6) P('bass', t, 1, ch[2] - 12, s * 5); if (st === 12) P('bass', t, 1, ch[0] - 12, s * 8); const m = [0, 2, 1, 2, 0, 3, 2, 1]; if ([0, 3, 4, 7, 8, 11, 14].includes(st)) { const n = ch[m[[0, 3, 4, 7, 8, 11, 14].indexOf(st)] % ch.length]; P('pno', t, 1, n + 12, s * 2); P('pno', t, 0.8, n + 24, s * 2) } if (b % 8 >= 4 && [0, 3, 6, 10].includes(st)) chordHit('brass', ch, t, 0.9, s * 2) } },
  bachata: { bpm: 126, drums: { bongo: '1.1.1.1.1.1.1.2.', guira: 'x.oox.oox.oox.oo', kick: 'o.......o.......' }, chords: [[57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67], [52, 56, 59, 64]], parts: (b, st, t, s, ch) => { if (st % 2 === 0) P('gtr', t, 1, ch[[0, 2, 3, 2, 1, 2, 3, 2][st / 2]] + 12, s * 3.5); if (st === 0 || st === 6 || st === 8) P('bass', t, 0.9, ch[0] - 12, s * 4); if (st === 12) P('conga', t, 0.9, 1); const n = mel([81, 80, 81, 83, 84, 0, 83, 81, 0, 0, 0, 0, 0, 0, 0, 0, 79, 78, 79, 81, 83, 0, 81, 79, 80, 0, 76, 0, 0, 0, 0, 0], b, st); if (n && b % 8 > 3) P('gtr', t, 1, n, s * 4) } },
  merengue: { bpm: 144, drums: { kick: 'x...x...x...x...', conga: '2.2.2.2.2.2.1111', guira: 'x.xxx.xxx.xxx.xx' }, chords: [c, [55, 59, 62], [55, 59, 62, 65], c], parts: (b, st, t, s, ch) => { if (st === 0 || st === 8) P('bass', t, 1, ch[0] - 12, s * 4); if (st === 4 || st === 12) P('bass', t, 0.9, ch[0] - 5, s * 3); const n = mel([72, 76, 79, 76, 72, 76, 79, 76, 71, 74, 79, 74, 71, 74, 79, 74, 74, 77, 79, 77, 74, 77, 79, 77, 72, 76, 79, 84, 79, 76, 72, 0], b, st); if (n) P('lead', t, 0.9, n, s * 1.6); if (b % 4 > 1 && (st === 2 || st === 6 || st === 10)) chordHit('brass', ch, t, 0.8, s * 2) } },
  chacha: { bpm: 122, drums: { conga: '1...2.1.1...2.11', bell: 'x...x...x...x...', shk: 'x.oox.oox.oox.oo', clave: '............x.xx' }, chords: [[57, 60, 64, 67], [50, 57, 60, 65], [55, 59, 62, 65], [48, 55, 60, 64]], parts: (b, st, t, s, ch) => { if ([0, 6, 8, 14].includes(st)) P('bass', t, 0.9, ch[0] - 12 + (st === 8 ? 7 : 0), s * 3); if ([2, 6, 10, 12, 14].includes(st)) chordHit('pno', ch, t, 0.7, s * 1.5); const n = mel([0, 0, 76, 77, 79, 0, 76, 0, 0, 0, 74, 76, 77, 0, 74, 0, 0, 0, 71, 72, 74, 0, 71, 0, 72, 0, 67, 0, 72, 72, 72, 0], b, st); if (n) P('flute', t, 1, n, s * 2) } },
  samba: { bpm: 104, drums: { surdo: 'o...x...o...x...', tamb: 'xoxxoxoxxoxxoxox', shk: 'xoxoxoxoxoxoxoxo', snare: '...o..o...o..oo.', bell: 'x.x..x.x.x..x.x.' }, chords: [[48, 55, 59, 64], [57, 60, 64, 67], [50, 57, 60, 65], [55, 59, 62, 65]], parts: (b, st, t, s, ch) => { if ([0, 3, 6, 8, 11, 14].includes(st)) chordHit('gtr', ch, t, 0.7, s * 2); if (st === 0 || st === 8 || st === 7) P('bass', t, 0.8, ch[0] - 12, s * 3); const n = mel([76, 0, 79, 76, 0, 74, 0, 72, 74, 0, 76, 0, 72, 0, 69, 0, 72, 0, 74, 72, 0, 69, 0, 65, 67, 0, 71, 0, 74, 0, 0, 0], b, st); if (n) P('flute', t, 1, n, s * 2) } },
  regueton: { bpm: 94, drums: { kick: 'x...x...x...x...', snare: '...x..x....x..x.', hat: 'x.x.x.x.x.x.x.xx' }, chords: [[57, 60, 64], [53, 57, 60], [48, 55, 60], [55, 59, 62]], parts: (b, st, t, s, ch) => { if ([0, 3, 6, 8, 11, 14].includes(st)) P('sub', t, 0.9, ch[0] - 24 + 12, s * 2.5); if ([2, 6, 10, 14].includes(st)) chordHit('pno', ch, t, 0.8, s * 1.5); const n = mel([76, 0, 76, 74, 0, 72, 0, 74, 72, 0, 69, 0, 69, 72, 0, 0, 67, 0, 67, 69, 0, 72, 0, 71, 71, 0, 67, 0, 0, 71, 0, 0], b, st); if (n) P('lead', t, 0.9, n, s * 2); if (st === 0) chordHit('pad', ch, t, 0.8, s * 15) } },
  hiphop: { bpm: 92, swing: 0.16, drums: { kick: 'x..x..x...x.....', snare: '....x.......x...', hat: 'xoxoxoxoxoxoxoxx', ohat: '..............x.' }, chords: [[50, 57, 60, 65], [55, 58, 62, 65], [48, 55, 58, 63], [53, 57, 60, 64]], parts: (b, st, t, s, ch) => { if (st === 0 || st === 3 || st === 10) P('sub', t, 1, ch[0] - 12, s * 3); if (st === 0 || st === 7) chordHit('pno', ch, t, 0.7, s * 5); const n = mel([74, 0, 77, 0, 0, 74, 72, 0, 0, 0, 70, 72, 0, 0, 69, 0], b, st); if (n && b % 4 > 1) P('lead', t, 0.8, n, s * 2) } },
  contemporaneo: { bpm: 96, drums: { kick: 'x.......x.......', shk: '..o...o...o...o.', clap: '............o...' }, chords: [[53, 60, 64, 69], [48, 55, 64, 67], [57, 60, 64, 72], [55, 59, 62, 71]], parts: (b, st, t, s, ch) => { if (st % 2 === 0) P('pno', t, 1, ch[[0, 1, 2, 3, 2, 3, 2, 1][st / 2]] + 12, s * 5); if (st === 0) { chordHit('pad', ch, t, 1, s * 16); P('sub', t, 0.6, ch[0] - 12, s * 8) } const n = mel([0, 0, 0, 0, 84, 0, 83, 0, 79, 0, 0, 0, 0, 0, 76, 0, 79, 0, 0, 0, 76, 0, 74, 0, 72, 0, 74, 0, 0, 0, 0, 0], b, st); if (n) P('flute', t, 0.8, n, s * 5) } },
  menu: { bpm: 88, drums: { shk: 'x.o.x.o.x.o.x.o.', palma: '....x.......x.x.', kick: 'x.....x...x.....' }, chords: [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 59, 64], [52, 56, 59, 62]], parts: (b, st, t, s, ch) => { if (st % 2 === 0) P('gtr', t, 0.8, ch[[0, 1, 2, 3, 2, 1, 3, 2][st / 2]] + 12, s * 5); if (st === 0) { chordHit('pad', ch, t, 0.8, s * 16); P('bass', t, 0.6, ch[0] - 12, s * 8) } const n = mel([76, 0, 0, 79, 0, 76, 74, 0, 72, 0, 0, 0, 74, 0, 76, 0, 71, 0, 0, 74, 0, 71, 69, 0, 68, 0, 0, 0, 0, 0, 0, 0], b, st); if (n && b % 8 > 3) P('flute', t, 0.8, n, s * 4) } },
  cafe: { bpm: 100, swing: 0.2, drums: { shk: 'x.x.x.x.x.x.x.x.', kick: 'o.......o.......' }, chords: [[48, 55, 59, 64], [57, 60, 64, 67], [50, 57, 60, 65], [55, 59, 62, 65]], parts: (b, st, t, s, ch) => { if (st % 4 === 0) P('bass', t, 0.6, ch[(st / 4) % ch.length] - 12, s * 3); if (st === 2 || st === 10 || st === 13) chordHit('gtr', ch, t, 0.5, s * 3) } },
  puzzle: { bpm: 104, drums: { hat: '..x...x...x...x.', kick: 'x.......x.......', clave: '......x.....x...' }, chords: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [55, 59, 62]], parts: (b, st, t, s, ch) => { if (st % 4 === 0) P('pno', t, 0.8, ch[(st / 4) % 3] + 24, s * 3); if (st % 8 === 0) P('bass', t, 0.6, ch[0] - 12, s * 5) } },
  gala: { bpm: 120, drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.', ohat: '..x...x...x...x.' }, chords: [[48, 55, 60, 64], [55, 59, 62, 67], [57, 60, 64, 69], [53, 57, 60, 65]], parts: (b, st, t, s, ch) => { if ([0, 3, 6, 10, 12].includes(st)) chordHit('brass', ch, t, 1, s * 2); if (st % 2 === 0) P('bass', t, 0.8, ch[0] - 12 + (st % 4 ? 12 : 0), s * 1.6); if (st === 0) chordHit('pad', ch, t, 0.9, s * 16); const n = mel([84, 0, 83, 79, 0, 76, 79, 0, 83, 0, 79, 0, 74, 0, 79, 0, 81, 0, 79, 76, 0, 72, 76, 0, 77, 0, 76, 0, 72, 0, 74, 0], b, st); if (n) P('lead', t, 1, n, s * 2) } },
}
let cur: Track | null = null, timer = 0, step = 0, nextT = 0, t0 = 0, curBpm = 100, rateMul = 1
// free-running clock keeps dances moving even when audio is unavailable
let ran = false
let offBase = performance.now() / 1000
export function play(tr: Track | null, mul = 1) {
  if (tr === cur && mul === rateMul) return
  clearInterval(timer); cur = tr; rateMul = mul; offBase = performance.now() / 1000
  if (!tr) return
  ac(); curBpm = S[tr].bpm * mul; step = 0; nextT = ctx!.currentTime + 0.12; t0 = nextT
  timer = window.setInterval(tick, 40)
}
export function restart(tr: Track, mul = 1) { cur = null; play(tr, mul) }
function tick() {
  if (!cur || !ctx || ctx.state !== 'running') { return }
  ran = true; const so = S[cur], s = 60 / curBpm / 4
  if (nextT < ctx.currentTime - 0.2) { const skip = Math.ceil((ctx.currentTime - nextT) / s); step += skip; nextT += skip * s }
  while (nextT < ctx.currentTime + 0.2) {
    const st = step % 16, bar = Math.floor(step / 16), t = nextT + (st % 2 && so.swing ? s * so.swing : 0)
    for (const k in so.drums) { const ch = so.drums[k][st]; if (ch && ch !== '.') P(k, t, ch === 'o' ? 0.4 : 0.8, ch === '1' ? 1 : 0) }
    so.parts(bar, st, t, s, so.chords[bar % so.chords.length])
    step++; nextT += s
  }
}
/** musical beat position (quarter notes) since the track started */
export function beat() {
  if (cur && ctx && (ctx.state === 'running' || ran)) return (ctx.currentTime - t0) / (60 / curBpm)
  return (performance.now() / 1000 - offBase) * curBpm / 60
}
export const danceDiv = (tr: Track) => S[tr].bpm > 140 ? 2 : 1 // fast songs: dance at half time
export const bpmOf = (tr: Track) => S[tr].bpm
export const now = () => (ctx && ctx.state === 'running' ? ctx.currentTime : performance.now() / 1000)
export function pauseMusic(p: boolean) { if (!ctx) return; p ? ctx.suspend() : ctx.resume() }
export function sfx(k: 'ok' | 'bad' | 'click' | 'coin' | 'step' | 'win' | 'door' | 'applause' | 'note' | 'fan', n = 0) {
  if (!ctx || ctx.state !== 'running') return
  const t = ctx.currentTime, T = (type: OscillatorType, f: number, at: number, d: number, v: number) => osc(type, f, t + at, d + 0.05, env(t + at, 0.004, d, v, 0, sfxG))
  if (k === 'ok') { T('sine', 660, 0, 0.12, 0.25); T('sine', 990, 0.08, 0.2, 0.25) }
  if (k === 'bad') { T('triangle', 220, 0, 0.15, 0.25); T('triangle', 175, 0.1, 0.22, 0.25) }
  if (k === 'click') T('sine', 520, 0, 0.05, 0.14)
  if (k === 'coin') { T('square', 988, 0, 0.07, 0.07); T('square', 1318, 0.07, 0.25, 0.07) }
  if (k === 'note') T('triangle', hz([60, 64, 67, 72, 69, 62][n % 6]), 0, 0.3, 0.3)
  if (k === 'step') nz(t, 0.04, 'lowpass', 500, 1, 0.16, 0, sfxG)
  if (k === 'door') { nz(t, 0.35, 'bandpass', 700, 0.8, 0.14, 0, sfxG); T('sine', 392, 0.02, 0.2, 0.1); T('sine', 587, 0.14, 0.3, 0.1) }
  if (k === 'fan') nz(t, 0.14, 'bandpass', 3000, 1, 0.3, 0, sfxG)
  if (k === 'win') [523, 659, 784, 1046, 1318].forEach((f, i) => T('triangle', f, i * 0.11, 0.35, 0.22))
  if (k === 'applause') for (let i = 0; i < 170; i++) nz(t + Math.random() * 3.2, 0.03, 'bandpass', 900 + Math.random() * 1800, 1.6, 0.09 * Math.random() * (1 - i / 260), 0, sfxG)
}
