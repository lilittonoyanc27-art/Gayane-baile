import { useEffect, useRef, useState } from 'react'
import { engine } from './three/engine'
import { SCENES } from './three/scenes'
import { useUI, setU, U, openPanel, openDialog, closePanel, toast } from './ui/state'
import { S, useSave, levelEs, touchDay } from './store'
import { B, E, I, IconB, Say, es, hy, popup } from './ui/common'
import * as A from './audio/music'
import { speak, hush } from './lang/speech'
import { DanceHub, BattlePanel, Duo, Torneo } from './ui/dance'
import { Game, GamesHub } from './ui/games'
import { Choreo, CityDance, CityHud, CityInfo, Culture, Final, Lock, Prep, Register, SevillaShow, Travel, cityAct, enter } from './ui/flow'
import { Dialog, Dict, Help, Item, Look, MapPanel, Missions, Profile, Ranking, Secret, Settings, Shop, Talk, Wardrobe, fullscreen, secretFound } from './ui/panels'
import { LOCK } from './data/misc'
import type { Item as It } from './three/kit'
import type { Style } from './three/moves'

export function act(i: It) {
  const [k, v] = [i.act.split(':')[0], i.act.slice(i.act.indexOf(':') + 1)]
  if (k === 'go') { if (LOCK[v] && !S().quests['open:' + v]) openPanel('lock', v); else enter(v) }
  else if (k === 'dlg') openDialog(v); else if (k === 'panel') openPanel(v); else if (k === 'dance') openPanel('dance', v); else if (k === 'game') openPanel('game', v)
  else if (k === 'item') openPanel('item', v); else if (k === 'secret') secretFound(v); else if (k === 'city') cityAct(v); else if (k === 'show') openPanel('sevillashow')
}
function Router() {
  const p = useUI(s => s.panel), d = useUI(s => s.dialog)
  if (d) return <Dialog key={d.id} id={d.id} />
  if (!p) return null
  const a = p.arg
  switch (p.id) {
    case 'dance': return <DanceHub key={a} style={a as Style} />; case 'game': case 'walkgame': return <Game key={a} id={a} />; case 'juegos': return <GamesHub />
    case 'battle': return <BattlePanel />; case 'duo': return <Duo />; case 'torneo': return <Torneo />; case 'ranking': return <Ranking />
    case 'choreo': return <Choreo />; case 'viaje': return <Travel />; case 'cityinfo': return <CityInfo id={a} />; case 'culture': return <Culture id={a} />; case 'register': return <Register id={a} />; case 'citydance': return <CityDance key={a} id={a} />
    case 'lock': return <Lock key={a} id={a} />; case 'prep': case 'walkprep': return <Prep />; case 'final': return <Final />; case 'sevillashow': return <SevillaShow />
    case 'mapa': return <MapPanel />; case 'misiones': return <Missions />; case 'perfil': return <Profile />; case 'dic': return <Dict />; case 'talk': return <Talk />
    case 'armario': return <Wardrobe />; case 'look': return <Look />; case 'item': return <Item key={a} id={a} />; case 'tienda': return <Shop />; case 'ajustes': return <Settings />; case 'secret': return <Secret t={a} />; case 'ayuda': return <Help />
  }
  return null
}
function Pop() {
  const p = useUI(s => s.pop), sv = useSave(s => s.saved); useEffect(() => { if (!p) return; const h = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.('.pop,.w,.chip,.pn')) setU({ pop: null }) }; const t = setTimeout(() => addEventListener('pointerdown', h), 50); return () => { clearTimeout(t); removeEventListener('pointerdown', h) } }, [p])
  if (!p) return null; const wide = innerWidth > 640, style = wide ? { left: Math.max(170, Math.min(innerWidth - 170, p.x)), top: p.y > innerHeight * 0.55 ? 'auto' : p.y + 18, bottom: p.y > innerHeight * 0.55 ? innerHeight - p.y + 18 : 'auto' } : undefined
  return <div className="pop" style={style} role="status"><button type="button" className="ic" aria-label="Cerrar" onClick={() => { setU({ pop: null }); hush() }}><I n="x" /></button>{p.word && p.word.toLowerCase() !== p.es.toLowerCase() && <WordLine w={p.word} />}<p className="pes" lang="es">{p.es}</p><p className="phy" lang="hy">{p.hy}</p><div className="row"><Say t={p.es} /><button type="button" className={'ic ' + (sv[p.es] ? 'on' : '')} aria-label="Guardar" onClick={() => S().save(p.es, p.hy)}><I n="star" /></button></div></div>
}
import { lookup } from './lang/lexicon'
const WordLine = ({ w }: { w: string }) => { const t = lookup(w); return <p className="pw"><b lang="es" onClick={() => speak(w)}>{w}</b>{t && <> — <span lang="hy">{t}</span></>}</p> }
function Labels() {
  const items = useUI(s => s.items), sc = useUI(s => s.scene), near = useUI(s => s.near)
  return <div className="labels" key={sc}>{items.map(i => <div key={i.id} ref={el => { if (el) engine.labelEls.set(i.id, el); else engine.labelEls.delete(i.id) }} style={{ display: 'none' }} className={'lab k-' + i.kind + (near?.id === i.id ? ' near' : '')}><span role="button" lang="es" onClick={e => { if (U().tmode) popup(e, i.t); else engine.goTo(i) }}>{es(i.t)}</span><span className="chip" onClick={e => popup(e, i.t)}>ա</span></div>)}</div>
}
function Joy() {
  const ref = useRef<HTMLDivElement>(null), [k, setK] = useState<[number, number] | null>(null), id = useRef(-1)
  const mv = (e: React.PointerEvent) => { if (e.pointerId !== id.current) return; const r = ref.current!.getBoundingClientRect(); let x = (e.clientX - r.left - r.width / 2) / (r.width / 2), y = (e.clientY - r.top - r.height / 2) / (r.height / 2); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l } setK([x, y]); engine.input.x = x; engine.input.y = -y }
  const up = (e: React.PointerEvent) => { if (e.pointerId !== id.current) return; id.current = -1; setK(null); engine.input.x = engine.input.y = 0 }
  useEffect(() => () => { engine.input.x = engine.input.y = 0 }, [])
  return <div className="joy" ref={ref} onPointerDown={e => { id.current = e.pointerId; ref.current!.setPointerCapture(e.pointerId); A.resume(); mv(e) }} onPointerMove={mv} onPointerUp={up} onPointerCancel={up}><i style={{ transform: `translate(${(k?.[0] ?? 0) * 38}px,${(k?.[1] ?? 0) * 38}px)` }} /></div>
}
function Hud() {
  const { near, panel, dialog, tmode, scene } = useUI(), coins = useSave(s => s.coins), xp = useSave(s => s.xpEs); const [run, setRun] = useState(false)
  const free = !panel && !dialog, walking = panel?.id?.startsWith('walk')
  return <><div className={'top ' + (free ? '' : 'mini')}>{free && <div className="place"><b><E t={SCENES[scene]?.t ?? ''} /></b><span className="pill"><I n="coin" />{coins}</span><span className="pill">{levelEs(xp)}</span></div>}<div className="tools"><IconB n="lang" k={tmode ? 'on' : ''} t="Modo traducción|Թարգմանության ռեժիմ" on={() => { setU({ tmode: !tmode }); if (!tmode) toast('Toca cualquier botón o texto para traducirlo.|Սեղմիր ցանկացած կոճակ կամ տեքստ՝ թարգմանելու համար։') }} />{free && <><IconB n="map" t="Mapa|Քարտեզ" on={() => openPanel('mapa')} /><IconB n="star" t="Misiones|Առաջադրանքներ" on={() => openPanel('misiones')} /><IconB n="book" t="Diccionario|Բառարան" on={() => openPanel('dic')} /><IconB n="user" t="Perfil|Պրոֆիլ" on={() => openPanel('perfil')} /></>}<IconB n="menu" t="Menú y pausa|Մենյու և դադար" on={() => setU({ pause: true })} /></div></div>
    {free && <CityHud />}
    {(free || walking) && <><Joy /><div className="acts"><IconB n="run" k={'big ' + (run ? 'on' : '')} t="Correr|Վազել" on={() => { engine.input.run = !run; setRun(!run) }} />{free && near && <button type="button" className="go" onClick={e => { if (U().tmode) popup(e, near.t); else act(near) }}><I n={near.kind === 'npc' ? 'sound' : near.kind === 'door' ? 'home' : 'hand'} /><span lang="es">{es(near.t)}</span><kbd>E</kbd><span className="chip" onClick={e => { e.stopPropagation(); popup(e, near.t) }}>ա</span></button>}</div></>}
  </>
}
function Pause() {
  const on = useUI(s => s.pause); useEffect(() => { engine.paused = on; A.pauseMusic(on); if (on) hush() }, [on]); if (!on) return null; const res = () => setU({ pause: false }), go = (id: string) => { res(); openPanel(id) }, w = U().scene, inGame = !!U().panel
  const reload = async () => { res(); closePanel(); await engine.load(SCENES[w]?.kind === 'special' ? 'calles' : w) }
  return <div className="scrim"><section className="panel mid pause"><header><h2><E t="Pausa|Դադար" /></h2></header><div className="body"><B t="Continuar|Շարունակել" k="pri" icon="play" on={res} /><B t={inGame ? 'Salir de la actividad|Դուրս գալ առաջադրանքից' : 'Reiniciar el lugar|Վերսկսել վայրը'} icon="redo" on={reload} /><B t="Mapa|Քարտեզ" icon="map" on={() => go('mapa')} /><B t="Juegos|Խաղեր" icon="play" on={() => go('juegos')} /><B t="Mi coreografía|Իմ խորեոգրաֆիան" icon="star" on={() => go('choreo')} /><B t="Conversación|Զրույց" icon="mic" on={() => go('talk')} /><B t="Mi armario|Իմ զգեստապահարանը" icon="bag" on={() => go('armario')} /><B t="Cómo jugar|Ինչպես խաղալ" icon="book" on={() => go('ayuda')} /><B t="Ajustes|Կարգավորումներ" icon="gear" on={() => go('ajustes')} /><B t="Pantalla completa|Ամբողջ էկրան" icon="full" on={fullscreen} /><B t="Menú principal|Գլխավոր մենյու" icon="home" on={async () => { res(); closePanel(); setU({ started: false }); await menuScene() }} /></div></section></div>
}
export async function menuScene() { await engine.load('escenario', { music: 'menu' }); engine.dance({ dist: innerWidth < innerHeight ? 5.4 : 4.4, side: innerWidth > 820 ? -0.95 : 0 }); engine.player.loop = null; const list = ['braceo', 'estilosal', 'extension', 'floreo', 'onda', 'sambabrazos', 'vueltafl', 'wave']; let k = 0; const f = () => { if (U().started) { engine.onFrame.delete(f); return } if (!engine.player.cur) engine.player.do(list[k++ % list.length]) }; engine.onFrame.add(f) }
function Splash({ ready }: { ready: boolean }) {
  const xp = useSave(s => s.xpEs), met = useSave(s => s.met.length), [greet, setG] = useState(false)
  const enterG = async () => { A.resume(); touchDay(); setG(true); speak('¡Bienvenida, Gayane! El mundo es tu escenario. Baila, aprende español y demuestra de lo que eres capaz.') }
  const play = async (panel?: string) => { A.resume(); hush(); setU({ started: true }); engine.endDance(); await engine.load('calles'); if (panel) openPanel(panel); else if (!met) toast('Habla con Sofía, junto a la fuente.|Խոսիր Սոֆիայի հետ՝ շատրվանի մոտ։') }
  return <div className={'splash ' + (ready ? 'ready' : '')}><div className="logo"><span>Gayane</span><b>Dance World 3D</b></div>{!ready ? <div className="loading"><i /><E t="Preparando el escenario|Պատրաստում ենք բեմը" /></div> : !greet ? <div className="sbox"><B t="Entrar|Մտնել" k="pri xl" icon="play" on={enterG} /></div> : <div className="sbox"><h1><E t="¡Bienvenida, Gayane!|Բարի գալուստ, Գայանե" /></h1><p className="lead"><E t="El mundo es tu escenario. Baila, aprende español y demuestra de lo que eres capaz.|Աշխարհը քո բեմն է։ Պարիր, սովորիր իսպաներեն և ցույց տուր, թե ինչի ես ընդունակ։" /></p><p className="hy">Բարի գալուստ, Գայանե։ Աշխարհը քո բեմն է։ Պարիր, սովորիր իսպաներեն և ցույց տուր, թե ինչի ես ընդունակ։</p><div className="mm"><B t={met ? 'Continuar la aventura|Շարունակել արկածը' : 'Empezar la aventura|Սկսել արկածը'} k="pri xl" icon="play" on={() => play()} /><B t="Gran viaje|Մեծ ճամփորդություն" icon="map" on={() => play('viaje')} /><B t="Sala de juegos|Խաղասրահ" icon="star" on={() => play('juegos')} /><B t="Mi coreografía|Իմ խորեոգրաֆիան" icon="user" on={() => play('choreo')} /><B t="Conversación|Զրույց" icon="mic" on={() => play('talk')} /><B t="Cómo jugar|Ինչպես խաղալ" icon="book" on={() => play('ayuda')} /><B t="Ajustes|Կարգավորումներ" icon="gear" on={() => play('ajustes')} /></div><small>{levelEs(xp)} · A2 → B2</small></div>}</div>
}
export default function App() {
  const cv = useRef<HTMLCanvasElement>(null), [ready, setReady] = useState(false), [fail, setFail] = useState(false), started = useUI(s => s.started), loading = useUI(s => s.loading), toasts = useUI(s => s.toasts), init = useRef(false)
  useEffect(() => {
    if (init.current) return; init.current = true
    setTimeout(async () => { try { engine.init(cv.current!); A.setVol(S().set.music, S().set.sfx); engine.onInteract = act; await menuScene(); setReady(true) } catch (e) { console.error(e); setFail(true) } }, 60)
    const kd = (e: KeyboardEvent) => { if ((e.target as HTMLElement).matches?.('input,textarea')) return; const u = U(); if (!u.started) return; if (e.code === 'Escape') { if (u.pop) setU({ pop: null }); else if (u.pause) setU({ pause: false }); else if (u.dialog) closePanel(); else setU({ pause: true }) } if ((e.code === 'KeyE' || e.code === 'Enter') && !u.panel && !u.dialog && !u.pause && u.near && !u.loading) { e.preventDefault(); act(u.near) } if (e.code === 'KeyE' && u.panel?.id.startsWith('walk') && u.near) engine.onInteract?.(u.near); if (e.code === 'KeyM' && !u.panel && !u.dialog) openPanel('mapa') }
    addEventListener('keydown', kd); const vis = () => { if (document.hidden) { A.pauseMusic(true); hush() } else if (!U().pause) A.pauseMusic(false) }; document.addEventListener('visibilitychange', vis); addEventListener('pointerdown', () => A.resume()); return () => removeEventListener('keydown', kd)
  }, [])
  useEffect(() => { if (!started) return; let n = 0; const h = setInterval(() => { const u = U(); if (!u.panel && !u.dialog && !u.loading && !u.pause && SCENES[u.scene]?.kind === 'special') { if (++n > 3) { n = 0; engine.load('calles') } } else n = 0 }, 400); return () => clearInterval(h) }, [started])
  if (fail) return <div className="splash"><div className="logo"><b>Dance World 3D</b></div><p><E t="Tu navegador no puede mostrar gráficos 3D. Activa WebGL o usa otro navegador.|Քո դիտարկիչը չի կարող ցուցադրել 3D գրաֆիկա։ Միացրու WebGL-ը կամ օգտագործիր այլ դիտարկիչ։" /></p></div>
  return <><canvas id="gl" ref={cv} />{started && <><Labels /><Hud /><Router /><Pause /></>}{!started && <Splash ready={ready} />}<div className={'fade ' + (loading ? 'on' : '')}><i /></div><Pop /><div className="toasts">{toasts.map(t => <div key={t.id} className={'toast ' + t.k}><E t={t.t} /><span className="hy">{hy(t.t)}</span></div>)}</div></>
}
if (import.meta.env.DEV) (window as any).G = { engine, SCENES, S, U, setU, openPanel, openDialog, closePanel, act, A }
