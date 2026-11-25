import * as THREE from 'three'
import { ell, cone, smin, polygonize, type F } from './sdf'

// ---------- Outfit model ----------
export type Top = 'tank' | 'crop' | 'tee' | 'long' | 'hoodie' | 'bodice' | 'dress'
export type Bottom = 'leggings' | 'joggers' | 'shorts' | 'bare'
export type Skirt = 'none' | 'mini' | 'midi' | 'flamenco' | 'fringe' | 'samba' | 'flow'
export type Shoe = 'heels' | 'sneakers' | 'flats' | 'boots'
export type Hair = 'bun' | 'pony' | 'long' | 'curly' | 'short' | 'braids'
export type Acc = 'flower' | 'hoops' | 'cap' | 'fan' | 'headband' | 'crown' | 'necklace'
export interface Outfit { top: Top; topC: string; bottom: Bottom; botC: string; skirt: Skirt; skirtC: string; trimC: string; shoes: Shoe; shoeC: string; hair: Hair; hairC: string; skin: string; eyes: string; acc: Acc[]; dots?: boolean; sparkle?: boolean; build?: 0 | 1 }
export const GAYANE: Outfit = { top: 'crop', topC: '#b3265c', bottom: 'leggings', botC: '#3a1730', skirt: 'none', skirtC: '#b3265c', trimC: '#e9b95c', shoes: 'sneakers', shoeC: '#efd9d2', hair: 'pony', hairC: '#2b1712', skin: '#dfa07a', eyes: '#5b3a1e', acc: ['hoops'] }

// ---------- Rest skeleton (metres, facing +z) ----------
const S = Math.SQRT1_2, UA = 0.262, FA = 0.232, TH = 0.41, SH = 0.415
const SHX = 0.142, SHY = 1.362, HPX = 0.085, HPY = 0.91
type V3 = [number, number, number]
const REST: Record<string, { p: V3; parent: string | null }> = {
  hips: { p: [0, 0.95, 0], parent: null }, spine: { p: [0, 1.06, 0], parent: 'hips' }, chest: { p: [0, 1.2, 0], parent: 'spine' },
  neck: { p: [0, 1.41, -0.01], parent: 'chest' }, head: { p: [0, 1.485, 0], parent: 'neck' },
}
for (const [s, n] of [[1, 'L'], [-1, 'R']] as [number, string][]) {
  REST['arm' + n] = { p: [s * SHX, SHY, -0.01], parent: 'chest' }
  REST['fore' + n] = { p: [s * (SHX + UA * S), SHY - UA * S, -0.01], parent: 'arm' + n }
  REST['hand' + n] = { p: [s * (SHX + (UA + FA) * S), SHY - (UA + FA) * S, -0.01], parent: 'fore' + n }
  REST['thigh' + n] = { p: [s * HPX, HPY, 0], parent: 'hips' }
  REST['shin' + n] = { p: [s * HPX, HPY - TH, 0], parent: 'thigh' + n }
  REST['foot' + n] = { p: [s * HPX, HPY - TH - SH, 0], parent: 'shin' + n }
}
export const BONES = Object.keys(REST)

// ---------- Body SDF, split in parts so we can skin from it ----------
const partsFor = (b: number): Record<string, F> => {
  const o: Record<string, F> = {
    hips: (x, y, z) => smin(ell(x, y, z, 0, 0.945, 0, 0.142 - b * 0.012, 0.105, 0.102), ell(Math.abs(x), y, z, 0.062, 0.925, -0.035, 0.075, 0.085, 0.082), 0.03),
    spine: (x, y, z) => ell(x, y, z, 0, 1.08, 0.002, 0.107 + b * 0.022, 0.13, 0.082),
    chest: (x, y, z) => smin(smin(ell(x, y, z, 0, 1.255, 0, 0.126 + b * 0.022, 0.15, 0.09), ell(Math.abs(x), y, z, 0.052, 1.262, 0.048 - b * 0.02, 0.058, 0.06, 0.05), 0.05), cone(Math.abs(x), y, z, 0, 1.39, -0.014, SHX - 0.03 + b * 0.022, 1.362, -0.012, 0.05, 0.037 + b * 0.008), 0.06),
    neck: (x, y, z) => cone(x, y, z, 0, 1.38, -0.015, 0, 1.52, 0.002, 0.042 + b * 0.01, 0.037 + b * 0.01),
  }
  const g = 1 + b * 0.16
  for (const [s, n] of [[1, 'L'], [-1, 'R']] as [number, string][]) {
    const A = REST['arm' + n].p, E = REST['fore' + n].p, H = REST['hand' + n].p
    o['arm' + n] = (x, y, z) => smin(cone(x, y, z, ...A, ...E, 0.041 * g, 0.033 * g), ell(x, y, z, A[0] + s * 0.012, A[1] - 0.005, A[2], 0.043 * g, 0.043 * g, 0.041 * g), 0.03)
    o['fore' + n] = (x, y, z) => smin(cone(x, y, z, ...E, E[0] + (H[0] - E[0]) * 0.35, E[1] + (H[1] - E[1]) * 0.35, E[2], 0.029 * g, 0.032 * g), cone(x, y, z, E[0] + (H[0] - E[0]) * 0.35, E[1] + (H[1] - E[1]) * 0.35, E[2], ...H, 0.034 * g, 0.0215 * g), 0.02)
    const T = REST['thigh' + n].p, K = REST['shin' + n].p, Fo = REST['foot' + n].p
    o['thigh' + n] = (x, y, z) => cone(x, y, z, T[0], T[1] - 0.02, T[2], ...K, 0.081, 0.05)
    o['shin' + n] = (x, y, z) => smin(cone(x, y, z, K[0], K[1], K[2], K[0], K[1] - 0.13, K[2] - 0.016, 0.048, 0.05), cone(x, y, z, K[0], K[1] - 0.13, K[2] - 0.016, ...Fo, 0.05, 0.033), 0.03)
  }
  return o
}
const bodyCache: Record<number, { parts: Record<string, F>; f: F }> = {}
function body(b: number) {
  if (bodyCache[b]) return bodyCache[b]
  const parts = partsFor(b)
  const f: F = (x, y, z) => {
    const L = x >= 0 ? 'L' : 'R'
    let d = smin(smin(parts.hips(x, y, z), parts.spine(x, y, z), 0.09), parts.chest(x, y, z), 0.09)
    d = smin(d, parts.neck(x, y, z), 0.035)
    d = smin(d, smin(parts['arm' + L](x, y, z), parts['fore' + L](x, y, z), 0.02), 0.03)
    const leg = smin(parts['thigh' + L](x, y, z), parts['shin' + L](x, y, z), 0.025)
    return smin(d, leg, 0.035)
  }
  return (bodyCache[b] = { parts, f })
}
const SKINB = ['hips', 'spine', 'chest', 'neck', 'armL', 'foreL', 'armR', 'foreR', 'thighL', 'shinL', 'thighR', 'shinR']
function addSkin(g: THREE.BufferGeometry, b: number) {
  const { parts } = body(b), p = g.attributes.position as THREE.BufferAttribute, n = p.count
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4)
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), w: [number, number][] = []
    let m = 1e9; const ds = SKINB.map(k => { const d = parts[k](x, y, z); if (d < m) m = d; return d })
    SKINB.forEach((k, j) => {
      let v = Math.exp(-(ds[j] - m) / 0.016)
      const last = k[k.length - 1]
      if (k.length > 4 && k !== 'spine' && k !== 'chest') { if (last === 'L') v *= THREE.MathUtils.smoothstep(x, -0.015, 0.015); if (last === 'R') v *= THREE.MathUtils.smoothstep(-x, -0.015, 0.015) }
      w.push([BONES.indexOf(k), v])
    })
    w.sort((a, c) => c[1] - a[1]); const t = w[0][1] + w[1][1] + w[2][1] + w[3][1]
    for (let q = 0; q < 4; q++) { si[i * 4 + q] = w[q][0]; sw[i * 4 + q] = w[q][1] / t }
  }
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4))
  return g
}
let VOX = 0.0115
export const setVoxel = (v: number) => { VOX = v }
const geoCache = new Map<string, THREE.BufferGeometry>()
const geo = (k: string, f: () => THREE.BufferGeometry) => { let g = geoCache.get(k); if (!g) { g = f(); g.userData.shared = true; geoCache.set(k, g) } return g }

const armS = (x: number, y: number) => { const px = Math.abs(x) - SHX, py = y - SHY; return (px + py) * S > -0.075 && Math.abs(x) > 0.11 ? (px - py) * S : -1 }
function skinned(kind: string, b: number): THREE.BufferGeometry {
  const { f } = body(b)
  const lo = [-0.62, 0.03, -0.17], hi = [0.62, 1.56, 0.17]
  const mk = (fn: F, a = lo, c = hi, h = VOX) => addSkin(polygonize(fn, a, c, h), b)
  const top = (off: number, y0: number, sl: number, scoop: number, strap = false): F => (x, y, z) => {
    let d = Math.max(f(x, y, z) - off, y0 - y, y - 1.425, armS(x, y) - sl)
    d = Math.max(d, scoop - ell(x, y, z, 0, 1.43, 0.06, 1, 1, 1) - 1)
    if (strap) d = Math.max(d, -(Math.hypot(Math.abs(x) - 0.155, y - 1.36) - 0.06))
    return d
  }
  const scoopF = (fn: F, r: number, cz = 0.05, ry = r * 1.1): F => (x, y, z) => Math.max(fn(x, y, z), -ell(x, y, z, 0, 1.425, cz, r, ry, 0.13))
  const T = [-0.62, 0.8, -0.18], TH2 = [0.62, 1.5, 0.18], L0 = [-0.24, 0.03, -0.18], L1 = [0.24, 1.14, 0.18]
  const tt = (off: number, y0: number, sl: number): F => (x, y, z) => Math.max(f(x, y, z) - off, y0 - y, y - 1.43, armS(x, y) - sl)
  switch (kind) {
    case 'body': return mk(f)
    case 'tank': return mk(scoopF((x, y, z) => Math.max(tt(0.008, 0.99, 0.02)(x, y, z), -(Math.hypot(Math.abs(x) - 0.165, y - 1.335) - 0.078)), 0.08), T, TH2)
    case 'crop': return mk(scoopF((x, y, z) => Math.max(tt(0.008, 1.12, 0.02)(x, y, z), -(Math.hypot(Math.abs(x) - 0.165, y - 1.335) - 0.078)), 0.08), T, TH2)
    case 'bodice': return mk(scoopF(tt(0.008, 0.98, 0.05), 0.095, 0.06), T, TH2)
    case 'dress': return mk(scoopF(tt(0.008, 0.98, 0.14), 0.1, 0.06, 0.09), T, TH2)
    case 'tee': return mk(scoopF((x, y, z) => { const s = armS(x, y); return Math.max(f(x, y, z) - (s > 0 ? 0.015 + s * 0.07 : 0.014 + Math.max(0, 1.2 - y) * 0.06), 0.96 - y, y - 1.43, s - 0.17) }, 0.07), T, TH2)
    case 'long': return mk(scoopF(tt(0.008, 0.99, 0.47), 0.075), T, TH2)
    case 'hoodie': return mk(scoopF((x, y, z) => { const s = armS(x, y); let d = Math.max(f(x, y, z) - (s > 0.4 ? 0.016 : 0.028), 0.93 - y, y - 1.44, s - 0.465); const hood = Math.hypot(Math.hypot(x, (z + 0.035) * 1.1) - 0.088, y - 1.415 - z * 0.25) - 0.028; return smin(d, hood, 0.02) }, 0.06, 0.07), T, TH2)
    case 'leggings': return mk((x, y, z) => Math.max(f(x, y, z) - 0.006, y - 1.07, 0.115 - y), L0, L1)
    case 'joggers': return mk((x, y, z) => Math.max(f(x, y, z) - (0.016 + (y < 0.85 ? 0.017 : 0.017 * Math.max(0, (1.05 - y) / 0.2)) - (y < 0.16 ? 0.02 : 0)), y - 1.06, 0.115 - y, y < 0.86 ? 0.007 - Math.abs(x) : -1), L0, L1)
    case 'shorts': return mk((x, y, z) => Math.max(f(x, y, z) - 0.014, y - 1.0, 0.69 - y, y < 0.84 ? 0.005 - Math.abs(x) : -1), L0, L1)
  }
  return mk(f)
}

// ---------- Head, hair, hands, shoes ----------
const headF = (b: number): F => (x, y, z) => {
  const ax = Math.abs(x)
  let d = ell(x, y, z, 0, 0.135, -0.004, 0.084, 0.1, 0.098)
  d = smin(d, ell(x, y, z, 0, 0.062, 0.022, 0.056 + b * 0.006, 0.062, 0.062), 0.055)
  d = smin(d, ell(ax, y, z, 0.034, 0.072, 0.05, 0.028, 0.026, 0.026), 0.03)
  d = smin(d, ell(x, y, z, 0, 0.018, 0.048, 0.022 + b * 0.005, 0.018, 0.02), 0.03)
  d = smin(d, cone(x, y, z, 0, 0.115, 0.086, 0, 0.082, 0.103, 0.0055, 0.0095), 0.016)
  d = smin(d, ell(ax, y, z, 0.01, 0.079, 0.094, 0.007, 0.006, 0.008), 0.008)
  d = -smin(-d, ell(ax, y, z, 0.035, 0.113, 0.102, 0.023, 0.017, 0.016), 0.014)
  d = smin(d, ell(ax, y, z, 0.083, 0.1, -0.008, 0.009, 0.024, 0.015), 0.008)
  d = smin(d, cone(x, y, z, 0, -0.07, -0.006, 0, 0.04, -0.006, 0.037 + b * 0.01, 0.039 + b * 0.01), 0.03)
  return d
}
const hairF = (kind: Hair): F => {
  const shell: F = (x, y, z) => {
    let d = ell(x, y, z, 0, 0.142, -0.012, 0.096, 0.108, 0.104)
    // hairline: carve the face away
    d = Math.max(d, -ell(x, y, z, kind === 'short' ? 0 : 0.008, 0.09, 0.12, 0.082, 0.124 - Math.abs(x - 0.012) * 0.25, 0.105))
    const cut = kind === 'short' ? 0.06 : 0.03
    d = Math.max(d, cut - y - (z + 0.03) * -0.4)
    return d - 0.004 + 0.0018 * Math.sin(x * 190 + Math.sin(y * 34) * 1.2)
  }
  if (kind === 'curly') return (x, y, z) => {
    let d = ell(x, y, z, 0, 0.12, -0.035, 0.135, 0.15, 0.11)
    d = smin(d, ell(Math.abs(x), y, z, 0.095, 0.02, -0.02, 0.05, 0.1, 0.06), 0.04)
    d = Math.max(d, -ell(x, y, z, 0, 0.07, 0.13, 0.074, 0.115, 0.14))
    return d - 0.008 * Math.sin(x * 95) * Math.sin(y * 95) * Math.sin(z * 95)
  }
  if (kind === 'long') return (x, y, z) => {
    let d = shell(x, y, z)
    let l = ell(x, y, z, 0, 0.02, -0.062, 0.1, 0.2, 0.05)
    l = smin(l, ell(Math.abs(x), y, z, 0.082, 0.03, -0.015, 0.024, 0.15, 0.036), 0.03)
    l = Math.max(l, y - 0.17)
    return smin(d, l - 0.003 * Math.sin(x * 150 + Math.sin(y * 40) * 1.5), 0.025)
  }
  if (kind === 'bun') return (x, y, z) => smin(shell(x, y, z), Math.hypot(Math.hypot(x, y - 0.1) - 0.026, z + 0.125) - 0.03 + 0.002 * Math.sin(Math.atan2(y - 0.1, x) * 9), 0.012)
  if (kind === 'pony') return (x, y, z) => smin(shell(x, y, z), ell(x, y, z, 0, 0.205, -0.085, 0.026, 0.024, 0.026), 0.02)
  if (kind === 'short') return (x, y, z) => smin(shell(x, y, z), ell(x, y, z, 0.01, 0.222, 0.045, 0.06, 0.028, 0.05) + 0.002 * Math.sin(x * 120), 0.03)
  return shell
}
const ponyF: F = (x, y, z) => { // root at 0, hangs down
  const t = THREE.MathUtils.clamp(-y / 0.36, 0, 1), r = 0.016 + 0.03 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.75) * (1 - t * 0.45), bz = -0.05 * Math.sin(t * 2.4)
  return (cone(x, y, z - bz, 0, 0, 0, 0, -0.36, 0, 1e-4, 1e-4) - r) * 0.8 + 0.0025 * Math.sin(Math.atan2(x, z - bz) * 8 + y * 30)
}
const braidF: F = (x, y, z) => { const t = THREE.MathUtils.clamp(-y / 0.34, 0, 1); return (Math.hypot(x, z) < 1 ? Math.max(Math.hypot(x - 0.006 * Math.sin(y * 75), z) - (0.021 - 0.008 * t + 0.005 * Math.abs(Math.sin(y * 75))), y - 0.01, -0.34 - y) : 1) * 0.8 }
// hand modelled along its rest axis, local +x outward for left; fingers gently curved
const handF = (s: number): F => (x, y, z) => {
  const X = x * s, u = (X - y) * S, v = (X + y) * S // u along the arm, v up from it
  let d = ell(u, v, z, 0.042, 0, 0.002, 0.04, 0.0135, 0.029)
  d = smin(d, cone(u, v, z, -0.01, 0, 0, 0.02, 0, 0, 0.02, 0.018), 0.02)
  const fz = [0.0235, 0.008, -0.0075, -0.022], fl = [0.064, 0.072, 0.066, 0.052]
  for (let i = 0; i < 4; i++) { const l = fl[i], c = -0.004 - i * 0.002; d = smin(d, cone(u, v, z, 0.07, 0, fz[i], 0.07 + l * 0.5, c, fz[i] * 1.08, 0.0088, 0.008), 0.008); d = smin(d, cone(u, v, z, 0.07 + l * 0.5, c, fz[i] * 1.08, 0.07 + l, c * 3.4, fz[i] * 1.1, 0.008, 0.0062), 0.006) }
  d = smin(d, cone(u, v, z, 0.018, -0.003, 0.022, 0.052, -0.012, 0.047, 0.0105, 0.009), 0.012)
  return smin(d, cone(u, v, z, 0.052, -0.012, 0.047, 0.08, -0.016, 0.052, 0.0088, 0.0068), 0.006)
}
const shoeF = (k: Shoe): F => (x, y, z) => { // local to ankle joint (ankle 0.085 over ground)
  if (k === 'heels') {
    const ySole = -0.085 + THREE.MathUtils.smoothstep(-z, -0.06, 0.03) * 0.0
    let d = ell(x, y, z, 0, -0.056, 0.07, 0.04, 0.03, 0.082)
    d = smin(d, ell(x, y, z, 0, -0.045, -0.01, 0.034, 0.04, 0.046), 0.03)
    d = Math.max(d, ySole - y); d = Math.max(d, -ell(x, y, z, 0, 0.0, 0.03, 0.032, 0.045, 0.062))
    return Math.min(d, smin(cone(x, y, z, 0, -0.06, -0.025, 0, -0.118, -0.03, 0.026, 0.018), Math.max(ell(x, y, z, 0, -0.1, 0.085, 0.037, 0.02, 0.062)), 0.008), Math.hypot(Math.hypot(x, (z + 0.0) * 0.9) - 0.037, y + 0.002) - 0.006)
  }
  if (k === 'flats') return Math.max(smin(ell(x, y, z, 0, -0.064, 0.06, 0.038, 0.026, 0.092), ell(x, y, z, 0, -0.06, -0.012, 0.034, 0.034, 0.042), 0.03), -0.086 - y, -ell(x, y, z, 0, -0.015, 0.03, 0.03, 0.042, 0.065))
  let d = smin(ell(x, y, z, 0, -0.055, 0.07, 0.047, 0.04, 0.088), ell(x, y, z, 0, -0.035, -0.012, 0.043, 0.058, 0.052), 0.04)
  if (k === 'boots') d = smin(d, cone(x, y, z, 0, -0.03, -0.004, 0, 0.12, -0.008, 0.045, 0.054), 0.03)
  d = Math.max(d, -0.088 - y)
  return k === 'boots' ? Math.max(d, y - 0.13) : Math.max(d, y - 0.03)
}
const soleF: F = (x, y, z) => Math.max(smin(ell(x, y, z, 0, -0.08, 0.07, 0.052, 0.05, 0.094), ell(x, y, z, 0, -0.08, -0.01, 0.047, 0.05, 0.056), 0.04), y + 0.068, -0.092 - y)

const mats = new Map<string, THREE.Material>()
export function mat(c: string, o: THREE.MeshPhysicalMaterialParameters & { dots?: boolean } = {}): THREE.MeshPhysicalMaterial {
  const { dots, ...p } = o, k = c + JSON.stringify(o); let m = mats.get(k) as THREE.MeshPhysicalMaterial
  if (!m) { m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.72, ...p }); if (dots) m.map = dotTex(c), m.color.set('#fff'); m.userData.shared = true; mats.set(k, m) }
  return m
}
function dotTex(c: string) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d')!
  x.fillStyle = c; x.fillRect(0, 0, 64, 64); x.fillStyle = '#fff4ee'; for (const [a, b] of [[16, 16], [48, 48]]) { x.beginPath(); x.arc(a, b, 8, 0, 7); x.fill() }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(22, 9); t.colorSpace = THREE.SRGBColorSpace; return t
}
const eyeTex = new Map<string, THREE.Texture>()
function irisTex(c: string) {
  let t = eyeTex.get(c); if (t) return t
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const x = cv.getContext('2d')!
  x.fillStyle = '#fbf4f1'; x.fillRect(0, 0, 512, 256)
  const cx = 128, cy = 128, R = 52, g = x.createRadialGradient(cx, cy, 8, cx, cy, R), col = new THREE.Color(c)
  g.addColorStop(0, '#120808'); g.addColorStop(0.42, '#1a0d0a'); g.addColorStop(0.46, '#' + col.clone().multiplyScalar(0.9).getHexString()); g.addColorStop(0.8, '#' + col.clone().lerp(new THREE.Color('#d99a5a'), 0.35).getHexString()); g.addColorStop(1, '#1b0c08')
  x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, 7); x.fill()
  x.fillStyle = '#fff'; x.beginPath(); x.arc(cx + 17, cy - 19, 11, 0, 7); x.fill(); x.globalAlpha = 0.6; x.beginPath(); x.arc(cx - 16, cy + 20, 6, 0, 7); x.fill()
  t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; eyeTex.set(c, t); return t
}

// ---------- Pose ----------
export type Pose = Partial<typeof DEF>
export const DEF = {
  hx: 0, hy: -0.012, hz: 0, hyaw: 0, hpit: 0, hrol: 0, sp: 0, sy: 0, sr: 0, cp: 0, cy: 0, cr: 0, np: 0, ny: 0, nr: 0,
  lfx: 0.095, lfz: 0, lfy: 0, lfr: 0.18, lft: 0, rfx: 0.095, rfz: 0, rfy: 0, rfr: 0.18, rft: 0,
  lx: 0.22, ly: -0.9, lz: 0.1, rx: 0.22, ry: -0.9, rz: 0.1, lpx: 0.5, lpy: -0.35, lpz: -0.9, rpx: 0.5, rpy: -0.35, rpz: -0.9,
  lw: 0, rw: 0, lh: 0, rh: 0, smile: 0.35,
}
const KEYS = Object.keys(DEF) as (keyof typeof DEF)[]
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion(), m1 = new THREE.Matrix4(), m2 = new THREE.Matrix4(), e1 = new THREE.Euler()
const basisQ = (d: THREE.Vector3, pole: THREE.Vector3, out: THREE.Matrix4) => { const y = d.clone().normalize(), x = pole.clone().addScaledVector(y, -pole.dot(y)).normalize(), z = new THREE.Vector3().crossVectors(x, y); return out.makeBasis(x, y, z) }

export class Character {
  root = new THREE.Group()
  bones: Record<string, THREE.Bone> = {}
  pose = { ...DEF }; target = { ...DEF }
  rate = 15
  travel = new THREE.Vector3()
  heel = 0
  private skel: THREE.Skeleton
  private skirt?: Skirt3D
  private tail?: THREE.Object3D; private tails: THREE.Object3D[] = []
  private lids: THREE.Object3D[] = []; private mouth?: THREE.Object3D
  private fanObj?: THREE.Group
  private blink = 2 + Math.random() * 3
  private tailV = new THREE.Vector2(); private tailA = new THREE.Vector2(); private lastHead = new THREE.Vector3(); private lastYaw = 0; private restBasis: Record<string, THREE.Matrix4> = {}
  outfit!: Outfit
  private parts: THREE.Object3D[] = []
  blob: THREE.Mesh
  constructor(o: Outfit, public scale = 1) {
    for (const k of BONES) { const b = new THREE.Bone(); b.name = k; const r = REST[k], p = r.parent ? REST[r.parent].p : [0, 0, 0]; b.position.set(r.p[0] - p[0], r.p[1] - p[1], r.p[2] - p[2]); this.bones[k] = b; if (r.parent) this.bones[r.parent].add(b); else this.root.add(b) }
    this.root.updateMatrixWorld(true)
    this.skel = new THREE.Skeleton(BONES.map(k => this.bones[k]))
    for (const [s, n] of [[1, 'L'], [-1, 'R']] as [number, string][]) {
      this.restBasis['a' + n] = basisQ(v1.set(s * S, -S, 0).clone(), v2.set(0, 0, -1).clone(), new THREE.Matrix4()).clone().transpose()
      this.restBasis['l' + n] = basisQ(v1.set(0, -1, 0).clone(), v2.set(0, 0, 1).clone(), new THREE.Matrix4()).clone().transpose()
    }
    this.blob = new THREE.Mesh(blobGeo, blobMat); this.blob.rotation.x = -Math.PI / 2; this.blob.position.y = 0.012; this.blob.renderOrder = 1; this.root.add(this.blob)
    this.root.scale.setScalar(scale)
    this.dress(o)
  }
  private put(m: THREE.Object3D, bone?: string) { m.traverse(q => { if ((q as THREE.Mesh).isMesh) { q.castShadow = true; q.frustumCulled = false } }); (bone ? this.bones[bone] : this.root).add(m); this.parts.push(m); return m }
  private sk(kind: string, m: THREE.Material) { const b = this.outfit.build ?? 0; const g = geo(kind + b + VOX, () => skinned(kind, b)); const s = new THREE.SkinnedMesh(g, m); s.bind(this.skel, new THREE.Matrix4()); this.put(s) }
  dress(o: Outfit) {
    this.parts.forEach(p => p.removeFromParent()); this.parts = []; this.lids = []; this.tails = []; this.tail = undefined; this.skirt = undefined; this.fanObj = undefined
    const pose = { ...this.pose }; Object.assign(this.pose, pose)
    // bind at rest
    this.outfit = o; const b = o.build ?? 0
    const skin = mat(o.skin, { roughness: 0.58, sheen: 0.35, sheenColor: new THREE.Color('#ff9d80'), sheenRoughness: 0.5 } as any)
    const cloth = (c: string) => mat(c, { roughness: o.sparkle ? 0.32 : 0.78, metalness: o.sparkle ? 0.35 : 0, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color(c).lerp(new THREE.Color('#fff'), 0.4) } as any)
    const inv = new THREE.Matrix4()
    const saved: Record<string, [THREE.Vector3, THREE.Quaternion]> = {}
    void inv; void saved
    this.sk('body', skin)
    if (o.bottom !== 'bare') this.sk(o.bottom, cloth(o.botC))
    this.sk(o.top, cloth(o.topC))
    // head
    const H = new THREE.Group(); H.scale.setScalar(1.04)
    H.add(new THREE.Mesh(geo('head' + b, () => polygonize(headF(b), [-0.11, -0.08, -0.13], [0.11, 0.26, 0.13], 0.0056)), skin))
    const hairM = mat(o.hairC, { roughness: 0.42, sheen: 0.7, sheenRoughness: 0.35, sheenColor: new THREE.Color(o.hairC).lerp(new THREE.Color('#ffb98a'), 0.35) } as any)
    H.add(new THREE.Mesh(geo('hair' + o.hair, () => polygonize(hairF(o.hair), [-0.2, -0.22, -0.2], [0.2, 0.31, 0.14], 0.0068)), hairM))
    if (o.hair === 'pony') { const t = new THREE.Group(); t.position.set(0, 0.205, -0.1); t.add(new THREE.Mesh(geo('ponytail', () => polygonize(ponyF, [-0.07, -0.42, -0.13], [0.07, 0.04, 0.07], 0.007)), hairM)); const tie = new THREE.Mesh(geo('tie', () => new THREE.TorusGeometry(0.02, 0.008, 8, 20)), cloth(o.trimC)); tie.rotation.x = 1.3; t.add(tie); H.add(t); this.tails.push(t) }
    if (o.hair === 'braids') for (const s of [1, -1]) { const t = new THREE.Group(); t.position.set(s * 0.062, 0.05, -0.06); t.add(new THREE.Mesh(geo('braid', () => polygonize(braidF, [-0.04, -0.36, -0.04], [0.04, 0.02, 0.04], 0.0055)), hairM)); H.add(t); this.tails.push(t) }
    const brow = mat(o.hairC, { roughness: 0.9 }), dark = mat('#1c0d0b', { roughness: 0.6 }), lip = mat(b ? '#b9776a' : '#c44a5e', { roughness: 0.38 })
    for (const s of [1, -1]) {
      const eg = new THREE.Group(); eg.position.set(s * 0.0345, 0.109, 0.0655); eg.rotation.y = s * 0.12; eg.scale.set(1.3, 1.36, 1.12)
      const e = new THREE.Mesh(geo('eye', () => new THREE.SphereGeometry(0.0205, 24, 18)), new THREE.MeshPhysicalMaterial({ map: irisTex(o.eyes), roughness: 0.12, clearcoat: 1 })); e.rotation.y = -s * 0.1; eg.add(e)
      const lid = new THREE.Group(); lid.add(new THREE.Mesh(geo('lid', () => new THREE.SphereGeometry(0.0216, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5)), skin))
      const lash = new THREE.Mesh(geo('lash' + b, () => { const c = new THREE.CatmullRomCurve3([-1.25, -0.8, -0.3, 0.2, 0.7, 1.15, 1.42].map((a, i) => new THREE.Vector3(Math.sin(a) * 0.0222, 0.0006 + (i === 6 ? 0.003 : 0), Math.cos(a) * 0.0222))); return new THREE.TubeGeometry(c, 20, b ? 0.0009 : 0.0016, 6) }), dark); lash.scale.x = s; lid.add(lash)
      lid.rotation.x = -0.42; eg.add(lid); this.lids.push(lid)
      const low = new THREE.Mesh(geo('lidlow', () => new THREE.SphereGeometry(0.0213, 22, 10, 0, Math.PI * 2, Math.PI * 0.66, Math.PI * 0.34)), skin); low.rotation.x = -0.12; eg.add(low)
      H.add(eg)
      const br = new THREE.Mesh(geo('brow' + b, () => { const c = new THREE.CatmullRomCurve3([[0.016, 0.1495, 0.0945], [0.029, 0.1545, 0.0905], [0.046, 0.1545, 0.0795], [0.06, 0.1465, 0.066]].map(p => new THREE.Vector3(...(p as V3)))); const g = new THREE.TubeGeometry(c, 14, b ? 0.0036 : 0.0026, 6); return g }), brow); br.scale.x = s; H.add(br)
      if (o.acc.includes('hoops')) { const h = new THREE.Mesh(geo('hoop', () => new THREE.TorusGeometry(0.02, 0.0021, 8, 28)), mat('#f0c266', { metalness: 1, roughness: 0.22 })); h.position.set(s * 0.092, 0.057, -0.002); h.rotation.y = 1.3; H.add(h) }
    }
    const m = new THREE.Group(); m.position.set(0, 0.0435, 0.0835)
    const lipG = (up: boolean) => geo('lip' + up, () => { const g = new THREE.SphereGeometry(1, 24, 12); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = 1 - x * x; p.setXYZ(i, x * 0.025, (y * 0.0055 * (0.25 + t * 0.75)) + (up ? 0.003 - 0.0016 * Math.exp(-x * x * 22) : -0.0036) + x * x * 0.0085, z * 0.006 * (0.4 + t * 0.6) - x * x * 0.008) } g.computeVertexNormals(); return g })
    m.add(new THREE.Mesh(lipG(true), lip), new THREE.Mesh(lipG(false), lip)); H.add(m); this.mouth = m
    // accessories
    const gold = mat('#f0c266', { metalness: 1, roughness: 0.25 })
    if (o.acc.includes('flower')) { const f = new THREE.Group(); for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(geo('petal', () => { const g = new THREE.SphereGeometry(0.018, 10, 8); g.scale(1, 0.75, 0.22); return g }), cloth('#d81f45')); const a = i / 6 * 6.283 + r * 0.5, R = 0.024 - r * 0.009; p.position.set(Math.cos(a) * R, Math.sin(a) * R, r * 0.008); p.rotation.set(0.5 + r * 0.25, 0, a, 'ZXY'); f.add(p) } f.position.set(0.087, 0.16, -0.045); f.rotation.y = 1.2; H.add(f) }
    if (o.acc.includes('cap')) { const c = new THREE.Group(); const dome = new THREE.Mesh(geo('cap', () => { const g = new THREE.SphereGeometry(0.111, 32, 16, 0, 6.2832, 0, 1.5); g.scale(0.96, 0.9, 1.04); return g }), cloth(o.trimC)); dome.position.set(0, 0.158, -0.012); const br = new THREE.Mesh(geo('visor', () => { const g = new THREE.CylinderGeometry(0.105, 0.108, 0.008, 32, 1, false, -1.2, 2.4); g.scale(0.95, 1, 1); return g }), cloth(o.trimC)); br.position.set(0, 0.17, 0.062); br.rotation.x = 0.2; c.add(dome, br); H.add(c) }
    if (o.acc.includes('headband')) { const h = new THREE.Mesh(geo('band', () => { const g = new THREE.TorusGeometry(0.098, 0.009, 10, 40); g.scale(1, 1.07, 1.6); return g }), cloth(o.trimC)); h.position.set(0, 0.148, 0.0); h.rotation.x = 1.25; H.add(h) }
    if (o.acc.includes('crown')) { const g = new THREE.Group(); for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 2.6, c = new THREE.Mesh(geo('spike', () => new THREE.ConeGeometry(0.009, 0.05, 8)), gold); c.position.set(Math.sin(a) * 0.092, 0.225 + Math.cos(a) * 0.02, Math.cos(a) * 0.05 + 0.005); g.add(c) } const r = new THREE.Mesh(geo('tiara', () => new THREE.TorusGeometry(0.094, 0.005, 8, 40)), gold); r.position.set(0, 0.2, 0.0); r.rotation.x = 1.45; g.add(r); H.add(g) }
    this.put(H, 'head')
    if (o.acc.includes('necklace')) { const n = new THREE.Mesh(geo('neck', () => { const g = new THREE.TorusGeometry(0.066, 0.0035, 8, 40); g.scale(1, 0.95, 1); return g }), gold); n.position.set(0, 0.195, 0.012); n.rotation.x = 1.15; this.put(n, 'chest') }
    for (const [s, n] of [[1, 'L'], [-1, 'R']] as [number, string][]) {
      this.put(new THREE.Mesh(geo('hand' + s, () => polygonize(handF(s), s > 0 ? [-0.03, -0.13, -0.05] : [-0.13, -0.13, -0.05], s > 0 ? [0.13, 0.03, 0.075] : [0.03, 0.03, 0.075], 0.0042)), skin), 'hand' + n)
      const bare = o.shoes === 'heels' || o.shoes === 'flats'
      if (bare) this.put(new THREE.Mesh(geo('foot', () => polygonize((x, y, z) => smin(smin(ell(x, y, z, 0, -0.06, 0.055, 0.034, 0.024, 0.085), ell(x, y, z, 0, -0.05, -0.012, 0.029, 0.035, 0.038), 0.04), cone(x, y, z, 0, -0.03, 0, 0, 0.06, 0, 0.032, 0.034), 0.03), [-0.06, -0.1, -0.07], [0.06, 0.06, 0.16], 0.006)), o.bottom === 'leggings' ? skin : skin), 'foot' + n)
      this.put(new THREE.Mesh(geo('shoe' + o.shoes, () => polygonize(shoeF(o.shoes), [-0.07, -0.13, -0.09], [0.07, 0.15, 0.18], 0.0055)), mat(o.shoeC, { roughness: o.shoes === 'heels' ? 0.28 : 0.6, clearcoat: o.shoes === 'heels' ? 0.6 : 0 })), 'foot' + n)
      if (!bare) this.put(new THREE.Mesh(geo('sole', () => polygonize(soleF, [-0.07, -0.1, -0.09], [0.07, -0.05, 0.18], 0.0055)), mat(o.shoes === 'sneakers' ? o.trimC : '#2a1a18')), 'foot' + n)
    }
    this.heel = o.shoes === 'heels' ? 0.032 : 0.004
    if (o.skirt !== 'none') { this.skirt = new Skirt3D(o); this.put(this.skirt.mesh, 'hips'); }
    if (o.acc.includes('fan')) this.setFan(true, o.trimC)
  }
  setFan(on: boolean, c = '#d81f45') {
    if (!on) { this.fanObj?.removeFromParent(); this.fanObj = undefined; return }
    if (this.fanObj) return
    const g = new THREE.Group(), n = 16
    const pos: number[] = [], idx: number[] = []
    for (let i = 0; i <= n; i++) { const a = (i / n - 0.5) * 2.7, z = (i % 2) * 0.006; pos.push(Math.sin(a) * 0.05, Math.cos(a) * 0.05, z, Math.sin(a) * 0.2, Math.cos(a) * 0.2, z); if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k, k - 1, k + 1) } }
    const b = new THREE.BufferGeometry(); b.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); b.setIndex(idx); b.computeVertexNormals()
    g.add(new THREE.Mesh(b, mat(c, { side: THREE.DoubleSide, roughness: 0.6 })))
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.004, 6, 30, 2.7), mat('#f0c266', { metalness: 1, roughness: 0.3 })); rim.rotation.z = Math.PI / 2 - 1.35; g.add(rim)
    for (let i = 0; i <= 8; i++) { const a = (i / 8 - 0.5) * 2.7, r = new THREE.Mesh(geo('rib', () => { const q = new THREE.CylinderGeometry(0.0022, 0.0022, 0.2, 5); q.translate(0, 0.1, 0); return q }), mat('#6b3a22')); r.rotation.z = -a; r.position.z = 0.006; g.add(r) }
    g.position.set(-0.06, -0.06, 0.02); g.rotation.set(0, 0.3, 2.2); this.put(g, 'handR'); this.fanObj = g
  }
  setPose(p: Pose) { for (const k of KEYS) this.target[k] = (p as any)[k] ?? DEF[k] }
  update(dt: number, time: number) {
    const a = 1 - Math.exp(-dt * this.rate), P = this.pose
    for (const k of KEYS) P[k] += (this.target[k] - P[k]) * a
    const B = this.bones
    B.hips.position.set(P.hx, 0.95 + P.hy + this.heel + Math.sin(time * 1.9 + this.scale * 9) * 0.0016, P.hz)
    B.hips.rotation.set(P.hpit, P.hyaw, P.hrol, 'YXZ')
    B.spine.rotation.set(P.sp, P.sy, P.sr, 'YXZ'); B.chest.rotation.set(P.cp - Math.sin(time * 1.9) * 0.012, P.cy, P.cr, 'YXZ')
    B.neck.rotation.set(P.np * 0.4, P.ny * 0.4, P.nr * 0.4, 'YXZ'); B.head.rotation.set(P.np * 0.6, P.ny * 0.6, P.nr * 0.6, 'YXZ')
    this.arm('L', 1, P.lx, P.ly, P.lz, P.lpx, P.lpy, P.lpz, P.lw, P.lh); this.arm('R', -1, P.rx, P.ry, P.rz, P.rpx, P.rpy, P.rpz, P.rw, P.rh)
    this.leg('L', 1, P.lfx, P.lfy, P.lfz, P.lfr, P.lft); this.leg('R', -1, P.rfx, P.rfy, P.rfz, P.rfr, P.rft)
    this.blink -= dt; const bl = this.blink < 0.14 ? Math.sin(Math.max(0, this.blink) / 0.14 * Math.PI) : 0; if (this.blink < 0) this.blink = 2 + Math.random() * 4
    for (const l of this.lids) l.rotation.x = -0.6 + bl * 1.1 + P.smile * 0.05
    if (this.mouth) this.mouth.scale.set(1 + P.smile * 0.28, 1 + P.smile * 0.12, 1)
    // secondary motion
    this.bones.head.getWorldPosition(v1); const d = v1.sub(this.lastHead); this.lastHead.add(d); const yaw = this.root.rotation.y + P.hyaw; let dy = yaw - this.lastYaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.lastYaw = yaw
    if (dt > 0.0005 && d.length() < 0.5) {
      if (!isFinite(this.tailA.x + this.tailA.y + this.tailV.x + this.tailV.y)) { this.tailA.set(0, 0); this.tailV.set(0, 0) }
      const inv = q1.copy(this.root.quaternion).invert(); d.applyQuaternion(inv).divideScalar(dt)
      const tx = THREE.MathUtils.clamp(d.z * 0.3 + Math.abs(dy / dt) * 0.09, -0.2, 1.1), tz = THREE.MathUtils.clamp(-d.x * 0.35 - dy / dt * 0.05, -0.9, 0.9)
      this.tailV.x += ((tx - this.tailA.x) * 90 - this.tailV.x * 8) * dt; this.tailV.y += ((tz - this.tailA.y) * 90 - this.tailV.y * 8) * dt
      this.tailA.addScaledVector(this.tailV, Math.min(dt, 0.033))
      for (const t of this.tails) t.rotation.set(this.tailA.x + 0.12 - P.np, 0, this.tailA.y - P.nr)
      this.skirt?.update(dt, this, d, dy / dt, time)
    }
  }
  private arm(n: string, s: number, x: number, y: number, z: number, px: number, py: number, pz: number, tw: number, bend: number) {
    const R = UA + FA - 0.004, t = v1.set(x * s, y, z).multiplyScalar(R); let d = t.length(); if (d > R) { t.multiplyScalar(R / d); d = R } if (d < 0.1) { t.multiplyScalar(0.1 / Math.max(d, 1e-4)); d = 0.1 }
    const dir = t.clone().normalize(), pole = v2.set(px * s, py, pz); pole.addScaledVector(dir, -pole.dot(dir)).normalize()
    const ca = THREE.MathUtils.clamp((UA * UA + d * d - FA * FA) / (2 * UA * d), -1, 1), sa = Math.sqrt(1 - ca * ca)
    const u = dir.clone().multiplyScalar(ca).addScaledVector(pole, sa), f = t.clone().addScaledVector(u, -UA).normalize()
    const Q = q1.setFromRotationMatrix(m2.multiplyMatrices(basisQ(u, pole, m1), this.restBasis['a' + n]))
    this.bones['arm' + n].quaternion.copy(Q)
    const Q2 = q2.setFromRotationMatrix(m2.multiplyMatrices(basisQ(f, pole, m1), this.restBasis['a' + n]))
    if (tw) { const ax = v3.set(s * S, -S, 0); Q2.multiply(new THREE.Quaternion().setFromAxisAngle(ax, tw * 0.5 * s)) }
    this.bones['fore' + n].quaternion.copy(Q.clone().invert().multiply(Q2))
    this.bones['hand' + n].quaternion.setFromAxisAngle(v3.set(s * S, -S, 0), tw * 0.5 * s).multiply(new THREE.Quaternion().setFromAxisAngle(v3.set(S, s * S, 0), bend))
  }
  private leg(n: string, s: number, x: number, lift: number, z: number, yaw: number, toe: number) {
    const hip = this.bones.hips
    const t = v1.set(x * s, 0.085 + this.heel + lift, z).sub(hip.position)
    const inv = q1.setFromEuler(e1.copy(hip.rotation)).invert()
    t.applyQuaternion(inv).sub(v2.set(s * HPX, HPY - 0.95, 0))
    const R = TH + SH - 0.003; let d = t.length(); if (d > R) { t.multiplyScalar(R / d); d = R } if (d < 0.2) { t.multiplyScalar(0.2 / d); d = 0.2 }
    const dir = t.clone().normalize(), pole = v2.set(Math.sin(yaw * s) * 1, 0, Math.cos(yaw * s)); pole.addScaledVector(dir, -pole.dot(dir)).normalize()
    const ca = THREE.MathUtils.clamp((TH * TH + d * d - SH * SH) / (2 * TH * d), -1, 1), sa = Math.sqrt(1 - ca * ca)
    const u = dir.clone().multiplyScalar(ca).addScaledVector(pole, sa), f = t.clone().addScaledVector(u, -TH).normalize()
    const Q = new THREE.Quaternion().setFromRotationMatrix(m2.multiplyMatrices(basisQ(u, pole, m1), this.restBasis['l' + n]))
    this.bones['thigh' + n].quaternion.copy(Q)
    const Q2 = new THREE.Quaternion().setFromRotationMatrix(m2.multiplyMatrices(basisQ(f, pole, m1), this.restBasis['l' + n]))
    this.bones['shin' + n].quaternion.copy(Q.clone().invert().multiply(Q2))
    // keep the foot world-flat
    const want = new THREE.Quaternion().setFromEuler(e1.set(toe, yaw * s, 0, 'YXZ'))
    this.bones['foot' + n].quaternion.copy(q1.setFromEuler(hip.rotation).multiply(Q2).invert().multiply(want))
  }
  snap() { Object.assign(this.pose, this.target) }
  dispose() { this.root.removeFromParent(); this.skirt?.mesh.geometry.dispose() }
}
const blobGeo = new THREE.CircleGeometry(0.36, 24)
const blobMat = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d')!, g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(20,5,15,.55)'); g.addColorStop(1, 'rgba(20,5,15,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }) })()

// ---------- Procedural cloth skirt ----------
class Skirt3D {
  mesh: THREE.Mesh
  private SEG = 56; private ROW = 16; private fl = 0; private fv = 0; private sw = new THREE.Vector2(); private sv = new THREE.Vector2(); private tw = 0
  private len: number; private flare: number; private ruf: number; private kind: Skirt
  private lL = new THREE.Vector3(); private a = new THREE.Vector3()
  constructor(o: Outfit) {
    this.kind = o.skirt
    const D: Record<string, [number, number, number]> = { mini: [0.3, 0.1, 0], midi: [0.55, 0.16, 0], flamenco: [0.88, 0.2, 3], fringe: [0.3, 0.08, 0.5], samba: [0.36, 0.2, 2], flow: [0.72, 0.18, 0], none: [0.1, 0, 0] }
    ;[this.len, this.flare, this.ruf] = D[o.skirt]
    const { SEG, ROW } = this, g = new THREE.BufferGeometry(), idx: number[] = [], uv: number[] = [], col: number[] = []
    const c0 = new THREE.Color(o.dots ? '#ffffff' : o.skirtC), c1 = new THREE.Color(o.trimC)
    for (let r = 0; r <= ROW; r++) for (let s = 0; s <= SEG; s++) { uv.push(s / SEG, r / ROW); const trim = r >= ROW - 1 || (this.ruf === 3 && (r === 9 || r === 12)); const c = trim ? c1 : c0; col.push(c.r, c.g, c.b) }
    for (let r = 0; r < ROW; r++) for (let s = 0; s < SEG; s++) { const a = r * (SEG + 1) + s, b = a + SEG + 1; idx.push(a, b, a + 1, b, b + 1, a + 1) }
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((ROW + 1) * (SEG + 1) * 3), 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx)
    this.mesh = new THREE.Mesh(g, mat(o.dots ? o.skirtC : '#ffffff', { side: THREE.DoubleSide, vertexColors: true, roughness: o.sparkle ? 0.35 : 0.75, metalness: o.sparkle ? 0.3 : 0, dots: o.dots, sheen: 0.5, sheenRoughness: 0.4 } as any))
    this.mesh.frustumCulled = false
  }
  update(dt: number, c: Character, vel: THREE.Vector3, yawV: number, time: number) {
    if (!isFinite(this.fl + this.fv + this.tw + this.sw.x + this.sw.y + this.sv.x + this.sv.y)) { this.fl = this.fv = this.tw = 0; this.sw.set(0, 0); this.sv.set(0, 0) }
    const d = Math.min(dt, 0.033), tgt = Math.min(Math.abs(yawV) * 0.045, 0.42)
    this.fv += ((tgt - this.fl) * 40 - this.fv * 7) * d; this.fl += this.fv * d
    this.sv.x += ((THREE.MathUtils.clamp(-vel.x * 0.1, -0.14, 0.14) - this.sw.x) * 60 - this.sv.x * 7) * d; this.sv.y += ((THREE.MathUtils.clamp(-vel.z * 0.1, -0.14, 0.14) - this.sw.y) * 60 - this.sv.y * 7) * d
    this.sw.addScaledVector(this.sv, d); this.tw += (THREE.MathUtils.clamp(-yawV * 0.09, -0.7, 0.7) - this.tw) * (1 - Math.exp(-d * 6))
    const hipInv = new THREE.Matrix4().copy(c.bones.hips.matrix).invert()
    const pts: THREE.Vector3[] = []
    for (const n of ['L', 'R']) { const T = c.bones['thigh' + n], Sn = c.bones['shin' + n]; T.updateMatrix(); Sn.updateMatrix(); const k = Sn.position.clone().applyMatrix4(T.matrix), f = c.bones['foot' + n].position.clone().applyMatrix4(Sn.matrix).applyMatrix4(T.matrix); pts.push(T.position.clone(), k, f) }
    void hipInv
    const { SEG, ROW } = this, p = this.mesh.geometry.attributes.position as THREE.BufferAttribute
    for (let r = 0; r <= ROW; r++) {
      const u = r / ROW, y0 = 0.09 - u * this.len, wa = Math.min(1, u * this.len / 0.16)
      const rx = 0.124 + (0.168 - 0.124) * Math.sin(wa * 1.57), rz = 0.103 + (0.134 - 0.103) * Math.sin(wa * 1.57)
      const fl = this.flare * Math.pow(u, 1.3) + this.fl * Math.pow(u, 1.2)
      const pleat = this.kind === 'mini' ? 0.012 : this.kind === 'fringe' ? 0.016 : 0.022
      let ruff = 0, rf = 0
      if (this.ruf === 3 && u > 0.5) { const q = ((u - 0.5) / 0.5 * 2.6) % 1; ruff = q * 0.07; rf = q * 0.028 } else if (this.ruf === 2 && u > 0.3) { const q = ((u - 0.3) / 0.7 * 2.99) % 1; ruff = q * 0.06; rf = q * 0.03 }
      const y = y0 + this.fl * u * u * 0.5
      // leg positions at that height
      const at: [number, number, number][] = []
      for (let l = 0; l < 2; l++) { const [a, k, f] = [pts[l * 3], pts[l * 3 + 1], pts[l * 3 + 2]]; for (const [A, B2, ra, rb] of [[a, k, 0.1, 0.07], [k, f, 0.07, 0.055]] as [THREE.Vector3, THREE.Vector3, number, number][]) { if ((A.y - y) * (B2.y - y) <= 0 || Math.abs(A.y - B2.y) < 0.02) { const t = THREE.MathUtils.clamp((A.y - y) / (A.y - B2.y || 1e-3), 0, 1); at.push([A.x + (B2.x - A.x) * t, A.z + (B2.z - A.z) * t, ra + (rb - ra) * t]) } else if (A === k && y > A.y && y - A.y < 0.06) at.push([A.x, A.z, ra * 0.9]) } }
      for (let s = 0; s <= SEG; s++) {
        const th = s / SEG * Math.PI * 2 + this.tw * u, cs = Math.cos(th), sn = Math.sin(th)
        let R = 1 / Math.sqrt((cs / rx) ** 2 + (sn / rz) ** 2) + fl + pleat * u * Math.sin(th * 14 + time * 0.6) + ruff + rf * Math.sin(th * 26)
        for (const [lx, lz, lr] of at) { const pr = lx * cs + lz * sn, pe = Math.abs(-lx * sn + lz * cs); if (pr > 0 && pe < lr) { const need = pr + Math.sqrt(lr * lr - pe * pe) + 0.012; if (need > R) R = need } }
        let yy = y
        if (this.kind === 'fringe' && u > 0.35) yy -= (s % 2) * 0.045 * u
        p.setXYZ(r * (SEG + 1) + s, cs * R + this.sw.x * u * u, yy, sn * R + this.sw.y * u * u)
      }
    }
    p.needsUpdate = true; this.mesh.geometry.computeVertexNormals()
  }
}
/** low-poly spectators: [clothes, skin/hair/legs] so instances can have tinted clothes */
let crowdG: [THREE.BufferGeometry, THREE.BufferGeometry] | null = null
export function crowdGeometry(): [THREE.BufferGeometry, THREE.BufferGeometry] {
  if (crowdG) return crowdG
  const { f } = body(0), hd = headF(0)
  const fn: F = (x, y, z) => smin(Math.min(f(x, y, z) - (y > 0.86 && y < 1.42 ? 0.018 : 0.006), Math.max(hd(x, y - 1.485, z), 1.44 - y)), Math.max(ell(x, y, z, 0, 1.6, -0.045, 0.112, 0.15, 0.095), -ell(x, y, z, 0, 1.56, 0.1, 0.07, 0.11, 0.09)), 0.015)
  const g = polygonize(fn, [-0.62, 0, -0.2], [0.62, 1.82, 0.2], 0.029), p = g.attributes.position, idx = g.index!.array, A: number[] = [], B: number[] = [], col: number[] = []
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), c = y < 0.86 && Math.abs(x) < 0.25 ? (y < 0.09 ? '#f0e6e2' : '#2c2034') : y > 1.44 && (z < 0.02 || y > 1.665) ? '#2b1a16' : '#dfa07a'; const k = new THREE.Color(c); col.push(k.r, k.g, k.b) }
  for (let i = 0; i < idx.length; i += 3) { const y = (p.getY(idx[i]) + p.getY(idx[i + 1]) + p.getY(idx[i + 2])) / 3, x = Math.abs(p.getX(idx[i])); (y > 0.86 && y < 1.43 && armS(x, y) < 0.2 ? A : B).push(idx[i], idx[i + 1], idx[i + 2]) }
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), s = armS(x, y); if (s <= 0) continue; const sg = Math.sign(x), a = 0.62 * Math.min(1, s / 0.12), dx = Math.abs(x) - SHX, dy = y - SHY, c = Math.cos(a), n = Math.sin(a); p.setXY(i, sg * (SHX + dx * c + dy * n), SHY - dx * n + dy * c) }
  const ga = new THREE.BufferGeometry(); ga.setAttribute('position', p); ga.setAttribute('normal', g.attributes.normal); const gb = ga.clone(); ga.setIndex(A); gb.setIndex(B); gb.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ga.userData.shared = gb.userData.shared = true
  return (crowdG = [ga, gb])
}
