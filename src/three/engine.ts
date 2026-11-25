import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { Character, setVoxel, type Outfit, type Pose } from './character'
import { MV, idle, talk, walk, cheer, clap, poseAt } from './moves'
import { SCENES, SHOPSPOTS } from './scenes'
import { Ctx, type Item } from './kit'
import { NPCS } from '../data/npcs'
import { ITEMS, applyItem } from '../data/items'
import { S } from '../store'
import { setU, U } from '../ui/state'
import * as A from '../audio/music'

export class Actor {
  home = new THREE.Vector3(); homeYaw = 0; yaw = 0; loop: string | null = null; act: 'idle' | 'talk' | 'cheer' | 'clap' | 'still' = 'idle'
  cur: { id: string; b0: number; len: number; x: number; z: number; yaw: number } | null = null
  queue: { id: string; b0: number }[] = []; phase = Math.random() * 9; speed = 0; frozen = 0; held: Pose | null = null
  constructor(public ch: Character, public id = '') {}
  place(x: number, z: number, yaw: number, y = 0) { this.ch.root.position.set(x, y, z); this.home.set(x, y, z); this.yaw = this.homeYaw = yaw; this.ch.root.rotation.y = yaw; this.cur = null; this.queue = [] }
  /** perform a move starting at dance-beat b0 (defaults to now) */
  do(id: string, b0 = engine.dbeat()) { const m = MV[id]; if (!m) return 0; const p = this.ch.root.position; this.finish(); if (m.fan) this.ch.setFan(true); this.cur = { id, b0, len: m.len, x: p.x, z: p.z, yaw: this.yaw }; return m.len }
  finish() { if (!this.cur) return; const m = MV[this.cur.id]; this.applyTravel(m, 1); if (m.fan && !this.ch.outfit.acc.includes('fan')) this.ch.setFan(false); this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw)); this.cur = null }
  private applyTravel(m: (typeof MV)[string], u: number) { const c = this.cur!, t = m.travel; if (!t) return; const s = Math.sin(c.yaw), k = Math.cos(c.yaw); this.ch.root.position.x = c.x + (t[0] * k + t[1] * s) * u; this.ch.root.position.z = c.z + (-t[0] * s + t[1] * k) * u; this.yaw = c.yaw + t[2] * u }
  update(dt: number, t: number) {
    if (this.frozen > 4) return; if (this.act === 'still') this.frozen++
    const b = engine.dbeat(); let pose: Pose
    while (!this.cur && this.queue.length && this.queue[0].b0 <= b) { const q = this.queue.shift()!; this.do(q.id, q.b0) }
    if (this.cur) { const m = MV[this.cur.id], x = b - this.cur.b0; if (x >= this.cur.len) { this.finish(); pose = this.held ?? idle(t) } else { const u = Math.max(0, x / this.cur.len); pose = m.f(Math.max(0, x), m.len); this.applyTravel(m, u * u * (3 - 2 * u)) } }
    else if (this.speed > 0.05) { this.phase += dt * (4.2 + this.speed * 1.75); pose = walk(this.phase, THREE.MathUtils.clamp((this.speed - 2.4) / 2.4, 0, 1)) }
    else if (this.loop) pose = poseAt(this.loop, b)
    else pose = this.act === 'talk' ? talk(t) : this.act === 'cheer' ? cheer(t, this.phase) : this.act === 'clap' ? clap(t) : this.held ?? idle(t + this.phase)
    this.ch.setPose(pose); this.ch.rate = this.cur || this.loop ? 20 : this.speed > 0.05 ? 18 : 8
    this.ch.root.rotation.y = this.yaw; this.ch.update(dt, t)
  }
}
class Engine {
  r!: THREE.WebGLRenderer; scene = new THREE.Scene(); cam = new THREE.PerspectiveCamera(50, 1, 0.1, 220); comp: EffectComposer | null = null; envTex!: THREE.Texture
  player!: Actor; npcs: Record<string, Actor> = {}; extras: Actor[] = []; ctx!: Ctx; world: THREE.Object3D | null = null; sceneId = ''
  mode: 'walk' | 'dance' | 'view' | 'puzzle' | 'menu' = 'menu'; input = { x: 0, y: 0, run: false }; keys = new Set<string>()
  yaw = 0; pitch = 0.22; dist = 4.2; tYaw = 0; tPitch = 0.22; tDist = 4.2; shift = 0; private tgt = new THREE.Vector3(0, 1.3, 0); paused = false; t = 0; goal: { x: number; z: number; item?: Item } | null = null
  sun = new THREE.DirectionalLight(); hemi = new THREE.HemisphereLight(); key = new THREE.SpotLight('#fff', 0, 14, 0.6, 0.6, 1.2); confetti: THREE.InstancedMesh | null = null; cdata: number[][] = []; onTap: ((x: number, y: number) => void) | null = null
  onFrame = new Set<(dt: number) => void>(); trackNow: A.Track = 'menu'; hype = 0.25; fps = 60; private dpr = 1; private slow = 0; speedK = 1; private last = 0; private el!: HTMLCanvasElement
  dbeat() { return A.beat() / A.danceDiv(this.trackNow) }
  spb() { return 60 / A.bpmOf(this.trackNow) * A.danceDiv(this.trackNow) / this.speedK }
  music(t: A.Track, k = 1) { this.trackNow = t; this.speedK = k; A.play(t, k) }
  init(el: HTMLCanvasElement) {
    this.el = el; const q = S().set.gfx; setVoxel(q === 0 ? 0.0155 : q === 1 ? 0.013 : 0.0115)
    this.r = new THREE.WebGLRenderer({ canvas: el, antialias: q > 0, powerPreference: 'high-performance' }); this.r.toneMapping = THREE.ACESFilmicToneMapping; this.r.toneMappingExposure = 0.92
    this.r.shadowMap.type = THREE.PCFShadowMap
    const pm = new THREE.PMREMGenerator(this.r); this.envTex = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environment = this.envTex
    this.sun.shadow.mapSize.set(q === 2 ? 2048 : 1024, q === 2 ? 2048 : 1024); const s = this.sun.shadow.camera; s.left = s.bottom = -9; s.right = s.top = 9; s.near = 0.5; s.far = 50; this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03
    this.key.position.set(0, 5, 5); this.scene.add(this.sun, this.sun.target, this.hemi, this.key, this.key.target)
    this.player = new Actor(new Character(S().outfit), 'gayane'); this.scene.add(this.player.ch.root)
    this.gfx(q); this.bind(); addEventListener('resize', () => this.size()); this.size(); requestAnimationFrame(n => this.loop(n))
  }
  gfx(q: 0 | 1 | 2) {
    this.r.shadowMap.enabled = q > 0; this.sun.castShadow = q > 0; this.dpr = Math.min(devicePixelRatio, q === 2 ? 2 : q === 1 ? 1.4 : 0.9); this.comp?.dispose(); this.comp = null
    if (q === 2) { const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }); this.comp = new EffectComposer(this.r, rt); this.comp.addPass(new RenderPass(this.scene, this.cam)); this.comp.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.14, 0.45, 1.0)); this.comp.addPass(new OutputPass()) }
    this.scene.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material; if (m && 'needsUpdate' in m) m.needsUpdate = true }); this.size()
  }
  size() { const w = innerWidth, h = innerHeight; this.r.setPixelRatio(this.dpr); this.r.setSize(w, h, false); this.comp?.setPixelRatio(this.dpr); this.comp?.setSize(w, h); this.cam.aspect = w / h; this.cam.fov = w < h ? 62 : 48; this.cam.updateProjectionMatrix() }
  setOutfit(o: Outfit) { this.player.ch.dress(o) }
  async load(id: string, o: { quiet?: boolean; music?: A.Track | null } = {}) {
    setU({ loading: 1, near: null }); A.sfx('door'); await new Promise(r => setTimeout(r, 260)); this.clearExtras(); this.player.loop = null; this.player.held = null; this.player.act = 'idle'
    for (const k in this.npcs) this.npcs[k].ch.dispose(); this.npcs = {}
    if (this.world) { this.scene.remove(this.world); this.world.traverse(x => { const m = x as THREE.Mesh; if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); if ((m as any).isReflector) (m as any).dispose() }) }
    const q = S().set.gfx, c = new Ctx(q), d = SCENES[id]; d.build(c); this.ctx = c; this.sceneId = id; this.world = c.finish(); this.scene.add(this.world)
    this.scene.background = c.bg; this.scene.fog = c.fog ? new THREE.Fog(c.fog[0], c.fog[1], c.fog[2]) : null; this.scene.environmentIntensity = c.env; this.sun.color.set(c.sun[0]); this.sun.intensity = c.sun[1]; this.hemi.color.set(c.hemi[0]); this.hemi.groundColor.set(c.hemi[1]); this.hemi.intensity = c.hemi[2]
    const fy = (c as any).floorY ?? 0
    for (const n of c.npcs) { const def = NPCS[n.id]; if (!def) continue; const a = new Actor(new Character(def.o, def.s ?? 1), n.id); a.place(n.x, n.z, n.ry, fy); a.loop = n.dance ?? null; this.npcs[n.id] = a; this.scene.add(a.ch.root); c.circ(n.x, n.z, 0.35); c.items.push({ id: 'npc:' + n.id, t: def.name + (def.name.includes('|') ? '' : '|' + def.role), x: n.x, z: n.z, y: fy + 1.95, r: 1.7, kind: 'npc', act: 'dlg:' + n.id }) ; await new Promise(r => setTimeout(r, 0)) }
    if (id === 'tienda') for (const s of SHOPSPOTS) { const it = ITEMS[s.item]; if (!it) continue; const a = new Actor(new Character(applyItem({ ...NPCS.lucia.o, skin: '#e6cfc8', hair: 'bun', hairC: '#d8bcb6', eyes: '#b59a94', acc: [], bottom: 'bare', top: 'tank', topC: '#e6cfc8', skirt: 'none', shoes: 'flats', shoeC: '#e6cfc8' }, it)), s.item); a.place(s.x, s.z, s.ry, 0.14); a.held = { lx: 0.3, ly: -0.8, lz: 0.2, rx: 0.35, ry: -0.6, rz: 0.15, rpx: 1 }; a.act = 'still'; this.scene.add(a.ch.root); this.extras.push(a); a.update(1, 0); await new Promise(r => setTimeout(r, 0)) }
    c.items = c.items.filter(i => i.kind !== 'secret' || !S().secrets.includes(i.act.slice(7)) || (i.obj!.visible = false))
    for (const i of c.items) if (i.y !== undefined && fy && i.kind !== 'npc') i.y += fy
    const [sx, sz, sy] = c.spawn; this.player.place(sx, sz, sy, fy); this.yaw = this.tYaw = sy + Math.PI; this.pitch = this.tPitch = d.kind === 'city' ? 0.07 : 0.2; this.dist = this.tDist = c.cam.indoor ? 3.8 : 4.6; this.shift = 0; this.mode = 'walk'; this.goal = null; this.key.intensity = 0; this.hype = 0.25
    this.tgt.set(sx, fy + 1.25, sz); if (!o.quiet) this.music((o.music ?? c.music) as A.Track)
    setU({ scene: id, items: c.items, loading: 0 }); await new Promise(r => setTimeout(r, 30))
  }
  clearExtras() { this.extras.forEach(a => a.ch.dispose()); this.extras = []; if (this.confetti) { this.scene.remove(this.confetti); this.confetti = null } }
  addExtra(npcId: string, x: number, z: number, yaw: number) { const d = NPCS[npcId], a = new Actor(new Character(d.o, d.s ?? 1), npcId); const fy = (this.ctx as any).floorY ?? 0; a.place(x, z, yaw, fy); this.scene.add(a.ch.root); this.extras.push(a); return a }
  removeExtra(a: Actor) { a.ch.dispose(); this.extras = this.extras.filter(x => x !== a) }
  /** stand on the dance spot facing the camera */
  dance(o: { partner?: string; gap?: number; hide?: boolean; dist?: number; side?: number } = {}) {
    const [x, z, ry] = this.ctx.spot, fy = (this.ctx as any).floorY ?? 0; this.mode = 'dance'; this.goal = null; this.player.speed = 0; const g = o.partner ? (o.gap ?? 0.85) : 0; const cs = Math.cos(ry), sn = Math.sin(ry)
    this.player.place(x - cs * g, z + sn * g, ry, fy); this.player.loop = null; this.player.held = null
    this.tYaw = ry; this.yaw = this.nearYaw(this.yaw, ry); this.tPitch = 0.1; this.tDist = o.dist ?? (innerWidth < innerHeight ? 5.2 : 4.3); this.shift = o.side ?? 0
    for (const k in this.npcs) { const a = this.npcs[k]; const dx = a.home.x - x, dz = a.home.z - z; a.ch.root.visible = k !== o.partner && !(Math.hypot(dx, dz) < 2.3) && !(dz * cs + dx * sn > 0.6 && Math.hypot(dx, dz) < 5) }
    this.key.position.set(x + sn * 4.5, fy + 5, z + cs * 4.5); this.key.target.position.set(x, fy + 1, z); this.key.intensity = 9; this.key.color.set('#ffe9dc')
    if (o.partner) { const a = this.addExtra(o.partner, x + cs * g, z - sn * g, ry); return a } return null
  }
  endDance() { this.mode = 'walk'; this.player.cur = null; this.player.queue = []; this.player.loop = null; this.player.held = null; this.clearExtrasKeepShop(); this.shift = 0; this.key.intensity = 0; this.tPitch = 0.2; this.tDist = this.ctx.cam.indoor ? 3.8 : 4.6; for (const k in this.npcs) this.npcs[k].ch.root.visible = true; if (this.confetti) { this.scene.remove(this.confetti); this.confetti = null } this.hype = 0.25; const p = this.player.ch.root.position; p.x = THREE.MathUtils.clamp(p.x, this.ctx.bounds.x0, this.ctx.bounds.x1); p.z = THREE.MathUtils.clamp(p.z, this.ctx.bounds.z0, this.ctx.bounds.z1); this.tYaw = this.yaw; this.music(this.ctx.music as A.Track) }
  private clearExtrasKeepShop() { this.extras = this.extras.filter(a => { if (a.act === 'still') return true; a.ch.dispose(); return false }) }
  /** close-up of Gayane for wardrobe / menu, shifted to leave room for a panel */
  view(on: boolean, dist = 3.1, shift = 0.75) { if (on) { this.mode = 'view'; this.talkA = null; this.player.speed = 0; this.player.act = 'idle'; this.yaw = this.nearYaw(this.yaw, this.player.yaw); this.tPitch = 0.06; this.tDist = dist; this.shift = innerWidth > 820 ? shift : 0; this.key.intensity = 7; const p = this.player.ch.root.position, y = this.player.yaw; this.key.position.set(p.x + Math.sin(y) * 4, p.y + 4, p.z + Math.cos(y) * 4); this.key.target.position.set(p.x, p.y + 1, p.z) } else { this.mode = 'walk'; this.shift = 0; this.key.intensity = 0; this.tDist = this.ctx.cam.indoor ? 3.8 : 4.6; this.tPitch = 0.2 } }
  talkA: Actor | null = null
  faceNpc(id: string | null) { this.talkA = null; for (const k in this.npcs) this.npcs[k].act = 'idle'; if (!id) { if (this.mode === 'view') this.view(false); return } const a = this.npcs[id]; if (!a) return; const p = this.player.ch.root.position, n = a.ch.root.position; const D = Math.hypot(p.x - n.x, p.z - n.z); if (D > 2.4) { p.x = n.x + Math.sin(a.yaw) * 1.35; p.z = n.z + Math.cos(a.yaw) * 1.35 } this.talkA = a; a.yaw = Math.atan2(p.x - n.x, p.z - n.z); this.player.yaw = Math.atan2(n.x - p.x, n.z - p.z); a.act = 'talk'; this.player.speed = 0; this.mode = 'view'; this.yaw = this.nearYaw(this.yaw, a.yaw - 1.0); this.tPitch = 0.1; this.tDist = innerWidth < innerHeight ? 3.6 : 2.9; this.shift = 0; this.goal = null }
  private nearYaw(from: number, to: number) { let d = (to - from) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; this.tYaw = to; return to - d }
  burst() { if (this.confetti) this.scene.remove(this.confetti); const n = 260, g = new THREE.PlaneGeometry(0.07, 0.1), im = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), n), cs = ['#ff5f9a', '#e2b25a', '#b59be8', '#ffd5e2', '#c8283f']; const p = this.player.ch.root.position; this.cdata = []; for (let i = 0; i < n; i++) { im.setColorAt(i, new THREE.Color(cs[i % 5])); this.cdata.push([p.x + (Math.random() - 0.5) * 7, p.y + 3 + Math.random() * 5, p.z + (Math.random() - 0.5) * 5, Math.random() * 6, 0.6 + Math.random() * 0.8]) } im.frustumCulled = false; this.confetti = im; this.scene.add(im); A.sfx('applause') }
  snapshot(w = 768) { const c = document.createElement('canvas'); c.width = c.height = w; const asp = this.cam.aspect; this.r.setRenderTarget(null); this.cam.aspect = 1; this.cam.updateProjectionMatrix(); const pr = this.r.getPixelRatio(), sz = this.r.getSize(new THREE.Vector2()); this.r.setPixelRatio(1); this.r.setSize(w, w, false); this.r.render(this.scene, this.cam); c.getContext('2d')!.drawImage(this.el, 0, 0, w, w); this.cam.aspect = asp; this.cam.updateProjectionMatrix(); this.r.setPixelRatio(pr); this.r.setSize(sz.x, sz.y, false); return c }
  ray(x: number, y: number, objs: THREE.Object3D[]) { const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2), this.cam); return rc.intersectObjects(objs, true)[0] }
  private bind() {
    addEventListener('keydown', e => { if ((e.target as HTMLElement).matches?.('input,textarea')) return; this.keys.add(e.code); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && U().started) e.preventDefault() })
    addEventListener('keyup', e => this.keys.delete(e.code)); addEventListener('blur', () => this.keys.clear())
    const P = new Map<number, { x: number; y: number; m: number }>(); let pd = 0
    this.el.addEventListener('pointerdown', e => { P.set(e.pointerId, { x: e.clientX, y: e.clientY, m: 0 }); this.el.setPointerCapture(e.pointerId); A.resume() })
    this.el.addEventListener('pointermove', e => { const p = P.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.m += Math.abs(dx) + Math.abs(dy); p.x = e.clientX; p.y = e.clientY; if (P.size === 2) { const [a, b] = [...P.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pd) this.zoom((pd - d) * 0.012); pd = d; return } if (this.mode === 'puzzle') return; const k = 0.0055 * S().set.sens; this.tYaw -= dx * k; this.tPitch = THREE.MathUtils.clamp(this.tPitch + dy * k * 0.8, -0.12, 1.1) })
    const up = (e: PointerEvent) => { const p = P.get(e.pointerId); P.delete(e.pointerId); pd = 0; if (p && p.m < 8) { if (this.onTap) this.onTap(e.clientX, e.clientY); else if (this.mode === 'walk') this.tapGround(e.clientX, e.clientY) } }
    this.el.addEventListener('pointerup', up); this.el.addEventListener('pointercancel', e => { P.delete(e.pointerId); pd = 0 })
    this.el.addEventListener('wheel', e => { e.preventDefault(); this.zoom(e.deltaY * 0.004) }, { passive: false })
  }
  zoom(d: number) { this.tDist = THREE.MathUtils.clamp(this.tDist + d, 1.5, 9) }
  private tapGround(x: number, y: number) { const rc = new THREE.Raycaster(); rc.setFromCamera(new THREE.Vector2(x / innerWidth * 2 - 1, 1 - y / innerHeight * 2), this.cam); const v = new THREE.Vector3(), fy = (this.ctx as any).floorY ?? 0; if (rc.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -fy), v)) { const b = this.ctx.bounds; if (v.x > b.x0 - 1 && v.x < b.x1 + 1 && v.z > b.z0 - 1 && v.z < b.z1 + 1) this.goal = { x: v.x, z: v.z } } }
  goTo(i: Item) { if (U().near?.id === i.id) { this.onInteract?.(i); return } this.goal = { x: i.x, z: i.z, item: i } }
  onInteract: ((i: Item) => void) | null = null
  private moveP(dt: number) {
    const k = this.keys; let ix = this.input.x + (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0), iy = this.input.y + (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
    const p = this.player.ch.root.position, a = this.player; let mag = Math.min(1, Math.hypot(ix, iy)), run = k.has('ShiftLeft') || k.has('ShiftRight') || this.input.run, dir = 0
    if (mag > 0.12) { this.goal = null; const f = this.yaw + Math.PI; dir = Math.atan2(Math.sin(f) * iy - Math.cos(f) * ix, Math.cos(f) * iy + Math.sin(f) * ix); if (this.input.x || this.input.y) run = run || mag > 0.92 }
    else if (this.goal) { const dx = this.goal.x - p.x, dz = this.goal.z - p.z, d = Math.hypot(dx, dz), gi = this.goal.item; if (d < 0.25 || (gi && d < Math.max(0.8, (gi.r ?? 1.5) * 0.8))) { this.goal = null; mag = 0; if (gi) { const n = gi; setTimeout(() => this.mode === 'walk' && this.onInteract?.(n), 60) } } else { mag = 1; run = d > 4; dir = Math.atan2(dx, dz) } }
    const want = mag > 0.12 ? (run ? 4.9 : 2.5 * Math.max(0.5, mag)) : 0; a.speed += (want - a.speed) * (1 - Math.exp(-dt * 9)); if (want === 0 && a.speed < 0.1) a.speed = 0
    if (mag > 0.12) { let d = dir - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * (1 - Math.exp(-dt * 11)) }
    if (a.speed > 0.05) {
      const ph0 = Math.floor(a.phase / Math.PI), ox = p.x, oz = p.z
      p.x += Math.sin(a.yaw) * a.speed * dt; p.z += Math.cos(a.yaw) * a.speed * dt; const b = this.ctx.bounds; p.x = THREE.MathUtils.clamp(p.x, b.x0, b.x1); p.z = THREE.MathUtils.clamp(p.z, b.z0, b.z1); const R = 0.27
      for (const c of this.ctx.col) { if (c.r !== undefined) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + R; if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m } } else { const dx = p.x - c.x, dz = p.z - c.z, ox2 = c.w! + R - Math.abs(dx), oz2 = c.d! + R - Math.abs(dz); if (ox2 > 0 && oz2 > 0) { if (ox2 < oz2) p.x += ox2 * Math.sign(dx || 1); else p.z += oz2 * Math.sign(dz || 1) } } }
      if (this.goal) { const mv = Math.hypot(p.x - ox, p.z - oz); if (mv < a.speed * dt * 0.25) { this.stuck += dt; if (this.stuck > 0.5) { this.stuck = 0; const gi = this.goal.item; if (gi && Math.hypot(gi.x - p.x, gi.z - p.z) < (gi.r ?? 1.5) * 1.4) { this.goal = null; this.onInteract?.(gi) } else if (!this.detour()) this.goal = null } } else this.stuck = 0 }
      if (Math.floor(a.phase / Math.PI) !== ph0) A.sfx('step')
    }
    // slow auto-follow of the camera while walking by keys
    if (a.speed > 0.6 && mag > 0.12 && !this.goal && Math.abs(ix) > 0.2 && iy > -0.5) { let d = a.yaw + Math.PI - this.tYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.tYaw += d * dt * 0.7 }
    if (this.goal) { let d = a.yaw + Math.PI - this.tYaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.tYaw += d * dt * 0.9 }
    let best: Item | null = null, bd = 99; for (const i of this.ctx.items) { const d = Math.hypot(i.x - p.x, i.z - p.z); if (d < (i.r ?? 1.5) && d < bd) { bd = d; best = i } } if (U().near?.id !== best?.id) setU({ near: best })
  }
  private stuck = 0; private side = 1
  private detour() { const p = this.player.ch.root.position, g = this.goal!; const n = (g as any).n ?? 0; if (n > 5) return false; const a = Math.atan2(g.x - p.x, g.z - p.z) + this.side * 1.35; this.side *= -1; const final = (g as any).final ?? { x: g.x, z: g.z, item: g.item }; const step: any = { x: p.x + Math.sin(a) * 1.5, z: p.z + Math.cos(a) * 1.5, n: n + 1, final }; this.goal = step; setTimeout(() => { if (this.goal === step) this.goal = Object.assign({ ...final }, { n: n + 1, final }) as any }, 750); return true }
  private loop(n: number) {
    requestAnimationFrame(x => this.loop(x)); const raw = Math.min(0.1, (n - this.last) / 1000 || 0.016); this.last = n; if (this.paused || document.hidden) return
    const dt = Math.min(0.05, raw); this.t += dt; this.fps += (1 / Math.max(raw, 0.001) - this.fps) * 0.05
    if (S().set.auto && this.ctx && n > 8000) { if (this.fps < 32) { this.slow += raw; if (this.slow > 3 && this.dpr > 0.65) { this.dpr *= 0.82; this.slow = 0; this.size() } } else this.slow = Math.max(0, this.slow - raw) }
    if (this.ctx) {
      if (this.mode === 'walk' && (!U().panel || U().panel!.id.startsWith('walk')) && !U().dialog && !U().loading) this.moveP(dt); else if (this.mode === 'walk') this.player.speed = 0
      const st = (this.ctx as any).crowd; if (st) st.hype += (this.hype - st.hype) * dt * 2
      for (const u of this.ctx.upd) u(this.t, dt)
      this.player.update(dt, this.t); for (const k in this.npcs) { const a = this.npcs[k]; if (a.ch.root.visible) a.update(dt, this.t) } for (const a of this.extras) a.update(dt, this.t)
      for (const f of this.onFrame) f(dt)
      if (this.confetti) { const o = new THREE.Object3D(); this.cdata.forEach((c, i) => { c[1] -= dt * c[4]; c[3] += dt * 3; if (c[1] < -0.2) c[1] += 6.5; o.position.set(c[0] + Math.sin(c[3]) * 0.15, c[1], c[2]); o.rotation.set(c[3], c[3] * 0.7, 0); o.updateMatrix(); this.confetti!.setMatrixAt(i, o.matrix) }); this.confetti.instanceMatrix.needsUpdate = true }
      this.camera(dt); this.labels()
    }
    this.comp ? this.comp.render(dt) : this.r.render(this.scene, this.cam)
  }
  private camera(dt: number) {
    const k = 1 - Math.exp(-dt * (this.mode === 'walk' ? 9 : 4)), p = this.player.ch.root.position
    if (this.mode === 'puzzle') { this.cam.position.set(0, 1.6, innerWidth < innerHeight ? 8.5 : 6); this.cam.lookAt(0, 1.6, 0); return }
    if (this.mode === 'menu') this.tYaw += dt * 0.0
    this.yaw += (this.tYaw - this.yaw) * k; this.pitch += (this.tPitch - this.pitch) * k; this.dist += (this.tDist - this.dist) * k
    const dancing = this.mode === 'dance', fy = (this.ctx as any).floorY ?? 0
    const tk = this.mode === 'view' && this.talkA ? this.talkA.ch.root.position : null; const tx = tk ? (p.x + tk.x) / 2 : dancing ? this.ctx.spot[0] * 0.5 + p.x * 0.5 : p.x, tz = tk ? (p.z + tk.z) / 2 : dancing ? this.ctx.spot[1] * 0.5 + p.z * 0.5 : p.z, ty = fy + (tk ? 0.95 : dancing ? 0.82 : this.mode === 'view' && this.tDist < 2.4 ? 1.45 : this.mode === 'view' ? 1.0 : 1.32)
    const dn = dancing && this.extras.length ? 0 : 1
    this.tgt.x += ((dancing && !dn ? this.ctx.spot[0] : tx) - this.tgt.x) * k; this.tgt.z += ((dancing && !dn ? this.ctx.spot[1] : tz) - this.tgt.z) * k; this.tgt.y += (ty - this.tgt.y) * k
    const y = this.yaw + (dancing ? Math.sin(this.t * 0.28) * 0.16 : 0), pi = this.pitch, dir = new THREE.Vector3(Math.sin(y) * Math.cos(pi), Math.sin(pi), Math.cos(y) * Math.cos(pi)); let d = this.dist
    const c = this.ctx.cam, B: [number, number, number, number][] = [[this.tgt.x, dir.x, c.x0, c.x1], [this.tgt.z, dir.z, c.z0, c.z1], [this.tgt.y, dir.y, fy + 0.15, fy + c.y1]]; for (const [o, v, lo, hi] of B) { if (v > 1e-3) d = Math.min(d, Math.max(0.7, (hi - o) / v)); else if (v < -1e-3) d = Math.min(d, Math.max(0.7, (lo - o) / v)) }
    const rx = Math.cos(y), rz = -Math.sin(y); this.cam.position.copy(this.tgt).addScaledVector(dir, d); const s = this.shift * d / 3.2; this.cam.position.x += rx * s; this.cam.position.z += rz * s; this.cam.lookAt(this.tgt.x + rx * s, this.tgt.y, this.tgt.z + rz * s)
    this.sun.target.position.set(p.x, fy, p.z); this.sun.position.set(p.x + this.ctx.sunPos[0], fy + this.ctx.sunPos[1], p.z + this.ctx.sunPos[2])
  }
  labelEls = new Map<string, HTMLElement>(); private lv = new THREE.Vector3()
  private labels() { const on = this.mode === 'walk' && (!U().panel || U().panel!.id.startsWith('walk')) && !U().dialog, p = this.player.ch.root.position; for (const i of this.ctx.items) { const e = this.labelEls.get(i.id); if (!e) continue; const d = Math.hypot(i.x - p.x, i.z - p.z); this.lv.set(i.x, (i.y ?? 1.8) + 0.12, i.z).project(this.cam); const vis = on && this.lv.z < 1 && Math.abs(this.lv.x) < 1.05 && Math.abs(this.lv.y) < 1.05 && d < (i.kind === 'secret' ? 6 : i.kind === 'door' ? 24 : 11); if (!vis) { if (e.style.display !== 'none') e.style.display = 'none'; continue } e.style.display = ''; e.style.transform = `translate(-50%,-100%) translate(${((this.lv.x + 1) / 2 * innerWidth).toFixed(1)}px,${((1 - this.lv.y) / 2 * innerHeight).toFixed(1)}px) scale(${d < 4 ? 1 : Math.max(0.66, 1.12 - d * 0.035).toFixed(2)})`; e.style.opacity = String(d < 6 ? 1 : 0.8); e.style.zIndex = String(100 - Math.round(d)) } }
}
export const engine = new Engine()
