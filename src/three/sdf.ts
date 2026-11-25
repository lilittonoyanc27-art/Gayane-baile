import * as THREE from 'three'
export type F = (x: number, y: number, z: number) => number
export const smin = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25 }
export const ell = (x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) => {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz
  const k0 = Math.sqrt(px * px + py * py + pz * pz)
  const qx = px / rx, qy = py / ry, qz = pz / rz
  const k1 = Math.sqrt(qx * qx + qy * qy + qz * qz)
  return k1 < 1e-6 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
}
/** tapered capsule */
export const cone = (x: number, y: number, z: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, ra: number, rb: number) => {
  const dx = bx - ax, dy = by - ay, dz = bz - az, px = x - ax, py = y - ay, pz = z - az
  let t = (px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz); t = t < 0 ? 0 : t > 1 ? 1 : t
  const ex = px - dx * t, ey = py - dy * t, ez = pz - dz * t
  return Math.sqrt(ex * ex + ey * ey + ez * ez) - (ra + (rb - ra) * t)
}
/** Surface nets: turns a signed-distance function into a smooth mesh */
export function polygonize(f: F, min: number[], max: number[], h: number): THREE.BufferGeometry {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1
  const v = new Float32Array(nx * ny * nz), id = (i: number, j: number, k: number) => i + nx * (j + ny * k)
  const B = 4
  for (let k = 0; k < nz; k += B) for (let j = 0; j < ny; j += B) for (let i = 0; i < nx; i += B) {
    const c = f(min[0] + (i + 1.5) * h, min[1] + (j + 1.5) * h, min[2] + (k + 1.5) * h), skip = Math.abs(c) > h * 5
    for (let c2 = k; c2 < Math.min(k + B, nz); c2++) for (let b = j; b < Math.min(j + B, ny); b++) for (let a = i; a < Math.min(i + B, nx); a++)
      v[id(a, b, c2)] = skip ? c : f(min[0] + a * h, min[1] + b * h, min[2] + c2 * h)
  }
  const pos: number[] = [], idx: number[] = [], map = new Int32Array(nx * ny * nz).fill(-1)
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let sx = 0, sy = 0, sz = 0, n = 0, mask = 0
    for (let q = 0; q < 8; q++) if (v[id(i + (q & 1), j + ((q >> 1) & 1), k + (q >> 2))] < 0) mask |= 1 << q
    if (mask === 0 || mask === 255) continue
    for (let q = 0; q < 8; q++) for (let ax = 0; ax < 3; ax++) {
      const o = q | (1 << ax); if (o === q) continue
      if (((mask >> q) & 1) === ((mask >> o) & 1)) continue
      const a = v[id(i + (q & 1), j + ((q >> 1) & 1), k + (q >> 2))], b = v[id(i + (o & 1), j + ((o >> 1) & 1), k + (o >> 2))], t = a / (a - b)
      sx += (q & 1) + (ax === 0 ? t : 0); sy += ((q >> 1) & 1) + (ax === 1 ? t : 0); sz += (q >> 2) + (ax === 2 ? t : 0); n++
    }
    map[id(i, j, k)] = pos.length / 3
    pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h)
  }
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => { if (a < 0 || b < 0 || c < 0 || d < 0) return; flip ? idx.push(a, c, b, a, d, c) : idx.push(a, b, c, a, c, d) }
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s = v[id(i, j, k)] < 0
    if (s !== v[id(i + 1, j, k)] < 0) quad(map[id(i, j - 1, k - 1)], map[id(i, j, k - 1)], map[id(i, j, k)], map[id(i, j - 1, k)], !s)
    if (s !== v[id(i, j + 1, k)] < 0) quad(map[id(i - 1, j, k - 1)], map[id(i - 1, j, k)], map[id(i, j, k)], map[id(i, j, k - 1)], !s)
    if (s !== v[id(i, j, k + 1)] < 0) quad(map[id(i - 1, j - 1, k)], map[id(i, j - 1, k)], map[id(i, j, k)], map[id(i - 1, j, k)], !s)
  }
  const nor = new Float32Array(pos.length), e = h * 0.6
  for (let q = 0; q < pos.length; q += 3) {
    const x = pos[q], y = pos[q + 1], z = pos[q + 2]
    let a = f(x + e, y, z) - f(x - e, y, z), b = f(x, y + e, z) - f(x, y - e, z), c = f(x, y, z + e) - f(x, y, z - e)
    const l = Math.hypot(a, b, c) || 1; nor[q] = a / l; nor[q + 1] = b / l; nor[q + 2] = c / l
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setIndex(idx)
  return g
}
