import type { Pose } from './character'
export type Style = 'base' | 'flamenco' | 'salsa' | 'bachata' | 'merengue' | 'chacha' | 'samba' | 'regueton' | 'hiphop' | 'contemporaneo'
export interface Move { id: string; t: string; style: Style; len: number; travel?: [number, number, number]; f: (b: number, len: number) => Pose; fan?: boolean }
const PI = Math.PI, sin = Math.sin, cos = Math.cos, abs = Math.abs, max = Math.max
const sw = (b: number, p = 2) => sin(b / p * PI * 2) // wave with period p beats
/** cyclic smooth keyframes spread evenly over len */
const k = (b: number, len: number, v: number[], loop = true) => { const n = v.length, x = (((b % len) + len) % len) / len * n, i = Math.floor(x), t = x - i, e = t * t * (3 - 2 * t), a = v[i], c = loop ? v[(i + 1) % n] : v[Math.min(i + 1, n - 1)]; return a + (c - a) * e }
const pop = (b: number) => Math.pow(abs(sin(b * PI)), 3)
const env = (b: number, len: number) => Math.min(1, b * 1.6, (len - b) * 1.6)
const bounce = (b: number, d = 0.03) => -0.025 - d * (0.5 + 0.5 * cos(b * PI * 2))
const lift = (b: number, len: number, v: number[]) => k(b, len, v)
/** arms carried at waist while partner dancing */
const frame: Pose = { lx: 0.42, ly: -0.38, lz: 0.45, rx: 0.42, ry: -0.38, rz: 0.45, lpx: 0.8, lpy: -0.6, lpz: -0.5, rpx: 0.8, rpy: -0.6, rpz: -0.5 }
const up = (w = 0.25, h = 0.92, z = 0.05): Pose => ({ lx: w, ly: h, lz: z, rx: w, ry: h, rz: z, lpx: 1, lpy: 0.1, lpz: -0.2, rpx: 1, rpy: 0.1, rpz: -0.2 })
const akimbo: Pose = { lx: 0.18, ly: -0.62, lz: 0.16, rx: 0.18, ry: -0.62, rz: 0.16, lpx: 1, lpy: -0.1, lpz: -0.35, rpx: 1, rpy: -0.1, rpz: -0.35 }
const proud: Pose = { cp: -0.1, np: -0.1, sp: -0.04 }
const hipWalk = (b: number, a = 0.1): Pose => ({ hrol: a * sin(b * PI), hx: -0.035 * sin(b * PI), sr: -a * 0.8 * sin(b * PI), hyaw: 0.1 * sin(b * PI) })
const marchFeet = (b: number, h = 0.07): Pose => ({ lfy: max(0, sin(b * PI)) * h, rfy: max(0, -sin(b * PI)) * h, lft: max(0, sin(b * PI)) * 0.5, rft: max(0, -sin(b * PI)) * 0.5, hy: -0.03 })
const pass = (b: number, n: number): Pose => ({ lfy: 0.05 * max(0, sin(b * PI * n)), rfy: 0.05 * max(0, -sin(b * PI * n)), lft: 0.3 * max(0, sin(b * PI * n)), rft: 0.3 * max(0, -sin(b * PI * n)), lfx: 0.05, rfx: 0.05 })
const M: Move[] = []
const add = (style: Style, id: string, t: string, len: number, f: Move['f'], travel?: Move['travel'], fan?: boolean) => M.push({ id, t, style, len, f, travel, fan })
// --- base commands
const step2 = (fw: number) => (b: number): Pose => ({ ...hipWalk(b, 0.05), lfz: 0.16 * fw * sin(b * PI), rfz: -0.16 * fw * sin(b * PI), lfy: 0.06 * max(0, cos(b * PI)), rfy: 0.06 * max(0, -cos(b * PI)), lz: 0.1 - 0.25 * sin(b * PI), rz: 0.1 + 0.25 * sin(b * PI), hy: -0.03 })
add('base', 'adelante', 'Da dos pasos hacia delante|Երկու քայլ արա դեպի առաջ', 2, step2(1), [0, 0.7, 0])
add('base', 'atras', 'Da dos pasos hacia atrás|Երկու քայլ արա դեպի հետ', 2, step2(-1), [0, -0.7, 0])
const side = (s: number) => (b: number): Pose => ({ lfx: 0.1 + 0.12 * max(0, sin(b * PI)) , rfx: 0.1 + 0.12 * max(0, sin(b * PI)), lfy: s > 0 ? 0.05 * max(0, sin(b * PI)) : 0.05 * max(0, -sin(b * PI)), rfy: s < 0 ? 0.05 * max(0, sin(b * PI)) : 0.05 * max(0, -sin(b * PI)), hrol: 0.06 * s * sin(b * PI), hy: -0.04, lx: 0.5, ly: -0.6, rx: 0.5, ry: -0.6 })
add('base', 'izquierda', 'Da un paso a la izquierda|Մեկ քայլ արա դեպի ձախ', 2, side(1), [0.55, 0, 0])
add('base', 'derecha', 'Da un paso a la derecha|Մեկ քայլ արա դեպի աջ', 2, side(-1), [-0.55, 0, 0])
const spin = (b: number): Pose => ({ ...pass(b, 2), lx: 0.35, ly: -0.15, lz: 0.55, rx: 0.35, ry: -0.15, rz: 0.55, lpx: 1, lpy: -0.3, lpz: 0, rpx: 1, rpy: -0.3, rpz: 0, hy: 0, cp: -0.05 })
add('base', 'giraizq', 'Gira hacia la izquierda|Պտտվիր դեպի ձախ', 2, spin, [0, 0, PI * 2])
add('base', 'girader', 'Gira hacia la derecha|Պտտվիր դեպի աջ', 2, spin, [0, 0, -PI * 2])
add('base', 'brazos', 'Levanta los brazos|Բարձրացրու ձեռքերդ', 2, (b) => ({ ...up(0.3, 0.92), np: -0.15, lw: sin(b * PI), rw: sin(b * PI) }))
add('base', 'manos', 'Mueve las manos lentamente|Դանդաղ շարժիր ձեռքերդ', 4, (b) => ({ lx: 0.6, ly: 0.1 + 0.4 * sw(b, 4), lz: 0.5, rx: 0.6, ry: 0.1 - 0.4 * sw(b, 4), rz: 0.5, lw: 1.2 * sw(b, 2), rw: 1.2 * sw(b + 1, 2), cr: 0.08 * sw(b, 4) }))
add('base', 'espalda', 'Mantén la espalda recta|Մեջքդ ուղիղ պահիր', 2, () => ({ ...akimbo, cp: -0.12, np: -0.05, hy: 0, lfx: 0.05, rfx: 0.05, lfr: 0.5, rfr: 0.5 }))
add('base', 'palmas', 'Da palmas|Ծափ տուր', 2, (b) => { const c = abs(sin(b * PI)) * 0.2; return { lx: -0.28 + c, ly: 0.05, lz: 0.62, rx: -0.28 + c, ry: 0.05, rz: 0.62, lpx: 1, lpy: -0.6, lpz: 0, rpx: 1, rpy: -0.6, rpz: 0, lw: 1, rw: 1, hy: bounce(b, 0.02) } })
add('base', 'tacon', 'Golpea el suelo con los pies|Ոտքերով հարվածիր հատակին', 2, (b) => ({ ...akimbo, ...marchFeet(b * 2, 0.12), hy: -0.05 }))
add('base', 'salta', 'Salta|Ցատկիր', 2, (b) => { const j = max(0, sin(b * PI)) * 0.3; return { hy: -0.06 + j, lfy: j, rfy: j, lft: j * 2, rft: j * 2, ...up(0.4, 0.4 + j) } })
add('base', 'saluda', 'Saluda al público|Ողջունիր հանդիսատեսին', 4, (b, l) => { const e = Math.sin(b / l * PI); return { hpit: 0.35 * e, sp: 0.35 * e, np: 0.2 * e, hz: -0.1 * e, hy: -0.06 * e, rfz: -0.2 * e, lx: 0.75, ly: -0.2 + 0.2 * e, lz: 0.4, rx: 0.2, ry: -0.2, rz: 0.4, smile: 1 } })
add('base', 'rodillas', 'Dobla las rodillas|Ծալիր ծնկներդ', 2, (b) => ({ hy: -0.06 - 0.16 * abs(sin(b * PI / 2)), lfx: 0.16, rfx: 0.16, lfr: 0.6, rfr: 0.6, ...akimbo }))
add('base', 'cabeza', 'Mueve la cabeza en círculo|Գլուխդ շրջանաձև պտտիր', 4, (b) => ({ nr: 0.4 * sw(b, 4), np: 0.35 * sw(b + 1, 4), ...akimbo }))
add('base', 'estira', 'Estira el cuerpo hacia un lado|Ձգվիր դեպի կողք', 4, (b) => { const s = sw(b, 4); return { sr: -0.3 * s, cr: -0.25 * s, hx: 0.06 * s, lx: 0.1, ly: s < 0 ? -0.5 : 0.95, lz: 0.1, rx: 0.1, ry: s < 0 ? 0.95 : -0.5, rz: 0.1, lfx: 0.2, rfx: 0.2 } })
add('base', 'hombros', 'Mueve los hombros|Շարժիր ուսերդ', 2, (b) => ({ cy: 0.28 * sw(b, 1), cr: 0.1 * sw(b, 1), ...frame, hy: bounce(b, 0.02) }))
// --- flamenco
const fl = (b: number, s: number) => ({ a: 0.5 + 0.5 * sin(b / 4 * PI * 2 + s) })
add('flamenco', 'braceo', 'El braceo|Բրասեո՝ ձեռքերի շարժում', 8, (b) => { const l = fl(b, 0).a, r = fl(b, PI).a; return { ...proud, lx: 0.35 + 0.45 * sin(l * PI), ly: -0.45 + 1.35 * l, lz: 0.3, rx: 0.35 + 0.45 * sin(r * PI), ry: -0.45 + 1.35 * r, rz: 0.3, lpx: 1, lpy: 0.3, lpz: 0, rpx: 1, rpy: 0.3, rpz: 0, lw: 1.5 * sw(b, 2), rw: 1.5 * sw(b, 2), lh: 0.4 * sw(b, 2), rh: 0.4 * sw(b, 2), cr: 0.1 * (l - r), ny: 0.4 * (l - r), hrol: 0.05 * sw(b, 4), lfz: 0.08, rfz: -0.06 } })
add('flamenco', 'floreo', 'El floreo de manos|Ֆլորեո՝ ձեռքերի ծաղկեցում', 4, (b) => ({ ...proud, ...up(0.28, 0.9, 0.1), lw: 2.2 * sw(b, 2), rw: 2.2 * sw(b, 2), lh: 0.6 * sw(b + 0.5, 2), rh: 0.6 * sw(b + 0.5, 2), ny: 0.5, cy: 0.2, lfz: 0.12, rfr: 0.5 }))
add('flamenco', 'zapateado', 'El zapateado|Սապատեադո՝ ոտքերի հարվածներ', 4, (b) => ({ ...proud, ...akimbo, ...marchFeet(b * 4, 0.085), hy: -0.065, hyaw: 0.15 * sw(b, 4), np: 0.05 }))
add('flamenco', 'palmasfl', 'Las palmas flamencas|Ֆլամենկոյի ծափեր', 4, (b) => { const c = abs(sin(b * PI)) * 0.17; return { ...proud, lx: -0.1 + c, ly: 0.28, lz: 0.6, rx: -0.5 + c, ry: 0.28, rz: 0.55, lpx: 1, lpy: -0.5, lpz: 0, rpx: 1, rpy: -0.5, rpz: 0, lw: 1.2, rw: 1.2, cy: 0.25, ny: 0.3, lfy: 0.05 * pop(b), hy: -0.03 } })
add('flamenco', 'vueltafl', 'La vuelta flamenca|Ֆլամենկոյի պտույտ', 4, (b) => ({ ...proud, ...pass(b, 1), lx: 0.3, ly: 0.9, lz: 0, rx: 0.3 , ry: 0.9, rz: 0, lpx: 1, rpx: 1, lw: sw(b), rw: sw(b), cr: 0.12 }), [0, 0, PI * 2])
add('flamenco', 'marcaje', 'El marcaje|Մարկախե՝ ռիթմի նշում', 4, (b) => ({ ...proud, ...hipWalk(b / 2, 0.14), lfx: 0.12, lfz: 0.12 * k(b, 4, [1, 1, 0, 0]), rfz: 0.12 * k(b, 4, [0, 0, 1, 1]), lx: 0.7, ly: 0.35 + 0.2 * sw(b, 4), lz: 0.35, rx: 0.2, ry: -0.55, rz: 0.3, rpx: 1, lw: sw(b) }))
add('flamenco', 'llamada', 'La llamada|Լամադա՝ կանչ', 4, (b) => ({ ...proud, ...marchFeet(b, 0.2), lx: 0.6, ly: k(b, 4, [0, 0.6, 0.9, 0.3]), lz: 0.3, rx: 0.6, ry: k(b, 4, [-0.4, 0, 0.6, 0.2]), rz: 0.3, hy: -0.05 }))
add('flamenco', 'desplante', 'El desplante|Դեսպլանտե՝ վճռական դիրք', 2, () => ({ cp: -0.2, np: -0.2, ny: 0.6, lx: 0.15, ly: 0.95, lz: -0.05, rx: 0.2, ry: -0.5, rz: 0.1, rpx: 1, lpx: 1, lfz: 0.22, lfr: 0.2, rfr: 0.7, hyaw: -0.3, cy: 0.3 }))
add('flamenco', 'abanico', 'El baile con abanico|Պար հովհարով', 4, (b) => ({ ...proud, lx: 0.25, ly: 0.85, lz: 0.2, rx: 0.1 + 0.5 * abs(sw(b, 4)), ry: 0.1 + 0.25 * sw(b, 1) * 0.3, rz: 0.6, rw: 1.4 + 0.7 * sw(b, 1), rpx: 1, rpy: -0.4, lpx: 1, ny: -0.3, cr: -0.1, ...hipWalk(b / 2, 0.08) }), undefined, true)
// --- salsa
const sal = (b: number, h = 0.12): Pose => ({ hrol: h * k(b, 8, [0, 1, 0, -1, -1, 0, 1, 1]), hx: -0.03 * k(b, 8, [0, 1, 0, -1, -1, 0, 1, 1]), sr: -h * 0.8 * k(b, 8, [0, 1, 0, -1, -1, 0, 1, 1]), hy: -0.04, smile: 0.8 })
add('salsa', 'salsabasico', 'El paso básico de salsa|Սալսայի հիմնական քայլ', 8, (b) => ({ ...sal(b), ...frame, lfz: k(b, 8, [0, 0.28, 0.28, 0, 0, 0, 0, 0]), rfz: k(b, 8, [0, 0, 0, 0, 0, -0.28, -0.28, 0]), lfy: lift(b, 8, [0.06, 0, 0, 0.05, 0, 0, 0, 0]), rfy: lift(b, 8, [0, 0, 0, 0, 0.06, 0, 0, 0.05]), lz: 0.45 + 0.14 * sw(b, 2), rz: 0.45 - 0.14 * sw(b, 2), hz: k(b, 8, [0, 0.07, 0.07, 0, 0, -0.07, -0.07, 0]) }))
add('salsa', 'cucaracha', 'El paso lateral|Կողային քայլ', 8, (b) => ({ ...sal(b, 0.17), ...frame, lfx: 0.09 + 0.26 * k(b, 8, [0, 1, 1, 0, 0, 0, 0, 0]), rfx: 0.09 + 0.26 * k(b, 8, [0, 0, 0, 0, 0, 1, 1, 0]), lfy: lift(b, 8, [0.05, 0, 0, 0.05, 0, 0, 0, 0]), rfy: lift(b, 8, [0, 0, 0, 0, 0.05, 0, 0, 0.05]), lx: 0.5 + 0.3 * k(b, 8, [0, 1, 1, 0, 0, 0, 0, 0]), rx: 0.5 + 0.3 * k(b, 8, [0, 0, 0, 0, 0, 1, 1, 0]) }))
add('salsa', 'vueltasalsa', 'La vuelta de salsa|Սալսայի պտույտ', 4, (b) => ({ ...spin(b), ry: 0.75, rx: 0.1, rz: 0.2, rpx: 1, smile: 1 }), [0, 0, -PI * 2])
add('salsa', 'suzy', 'El Susie Q|Սյուզի Ք քայլ', 4, (b) => { const s = sw(b, 4); return { ...frame, hyaw: 0.35 * s, cy: -0.4 * s, lfz: 0.16 * max(0, s), lfx: 0.09 - 0.14 * max(0, s), rfz: 0.16 * max(0, -s), rfx: 0.09 - 0.14 * max(0, -s), lfy: 0.05 * pop(b), hy: -0.05, lx: 0.4 + 0.3 * s, rx: 0.4 - 0.3 * s, smile: 0.9 } })
add('salsa', 'hombrosal', 'El movimiento de hombros|Ուսերի շարժում', 4, (b) => ({ ...sal(b * 2, 0.08), cy: 0.35 * sw(b, 1), cp: 0.1 + 0.1 * sw(b, 4), lx: 0.75, ly: -0.35, lz: 0.2, rx: 0.75, ry: -0.35, rz: 0.2, hy: -0.07 }))
add('salsa', 'estilosal', 'El estilo de brazos|Ձեռքերի ոճ', 4, (b) => ({ ...sal(b * 2), lx: 0.3 + 0.5 * abs(sw(b, 4)), ly: 0.9 * k(b, 4, [0, 1, 0.4, -0.5]), lz: 0.15, rx: 0.2, ry: -0.5, rz: 0.2, lpx: 1, rpx: 1, lw: sw(b), ny: 0.3 }))
// --- bachata
add('bachata', 'bachatabas', 'El básico de bachata|Բաչատայի հիմնական քայլ', 8, (b) => { const p = k(b, 8, [0, 1, 2, 3, 3, 2, 1, 0]) / 3 - 0.5; return { ...frame, hx: 0.22 * p, lfx: 0.09 + 0.25 * p + 0.06 * max(0, sin(b * PI)), rfx: 0.09 - 0.25 * p + 0.06 * max(0, sin(b * PI)), lfy: 0.05 * max(0, sin(b * PI)), rfy: 0.05 * max(0, -sin(b * PI)), hrol: 0.16 * k(b, 4, [0, 0.4, 0, 1]) * (b % 8 < 4 ? 1 : -1), sr: -0.12 * k(b, 4, [0, 0.4, 0, 1]) * (b % 8 < 4 ? 1 : -1), hy: -0.05 } })
add('bachata', 'toquecadera', 'El toque de cadera|Ազդրի շեշտադրում', 4, (b) => ({ ...frame, hrol: 0.2 * k(b, 4, [0, 0.2, 0, 1]), hx: -0.05 * k(b, 4, [0, 0.2, 0, 1]), sr: -0.18 * k(b, 4, [0, 0.2, 0, 1]), lfy: 0.06 * k(b, 4, [0, 0, 0, 1]), lft: 0.5 * k(b, 4, [0, 0, 0, 1]), hy: -0.05, ...{ lx: 0.45, ry: 0.5, rx: 0.2 } }))
add('bachata', 'onda', 'La onda del cuerpo|Մարմնի ալիք', 4, (b) => ({ lfz: 0.1, rfz: -0.1, cp: -0.22 * sw(b, 4), sp: 0.2 * sw(b - 0.7, 4), hpit: 0.1 * sw(b - 1.5, 4), np: 0.2 * sw(b + 0.5, 4), hy: -0.06 - 0.03 * sw(b - 1, 4), lx: 0.5, ly: 0.2 + 0.3 * sw(b, 4), lz: 0.4, rx: 0.5, ry: 0.2 + 0.3 * sw(b, 4), rz: 0.4 }))
add('bachata', 'cajabach', 'La caja|Քառակուսի քայլ', 8, (b) => ({ ...frame, ...hipWalk(b, 0.12), hx: 0.1 * k(b, 8, [0, 1, 1, 1, 1, 0, 0, 0]), hz: 0.12 * k(b, 8, [0, 0, 1, 1, 0, 0, -0.3, 0]), lfz: 0.2 * k(b, 8, [0, 0, 1, 1, 0, 0, 0, 0]), rfz: 0.2 * k(b, 8, [0, 0, 0, 1, 1, 0, 0, 0]), lfy: 0.05 * max(0, sin(b * PI)), rfy: 0.05 * max(0, -sin(b * PI)), hy: -0.05 }))
add('bachata', 'girobach', 'El giro de bachata|Բաչատայի պտույտ', 4, (b) => ({ ...spin(b / 2), ly: 0.7, lx: 0.15, lz: 0.2, lpx: 1, hrol: 0.1 * sw(b) }), [0, 0, PI * 2])
// --- merengue
add('merengue', 'marcha', 'La marcha|Քայլերթ', 4, (b) => ({ ...frame, ...marchFeet(b, 0.06), ...hipWalk(b, 0.15), lz: 0.45 + 0.1 * sw(b), rz: 0.45 - 0.1 * sw(b), smile: 0.9 }))
add('merengue', 'caderas', 'El movimiento de caderas|Ազդրերի շարժում', 4, (b) => ({ ...up(0.45, 0.5, 0.3), hrol: 0.2 * sin(b * PI * 2), hx: -0.05 * sin(b * PI * 2), sr: -0.18 * sin(b * PI * 2), hy: -0.07, lfx: 0.13, rfx: 0.13 }))
add('merengue', 'paseo', 'El paseo|Զբոսաքայլ', 4, (b) => ({ ...hipWalk(b, 0.13), ...side(1)(b), hrol: 0.14 * sin(b * PI), ...frame }), [0.5, 0, 0])
add('merengue', 'vueltamer', 'La vuelta doble|Կրկնակի պտույտ', 4, (b) => ({ ...spin(b), ...pass(b, 2), ry: 0.8, rx: 0.1, rz: 0.15, rpx: 1 }), [0, 0, -PI * 4])
// --- cha-cha-cha
const cha = [0, 0.26, 0, 0, 0, -0.02, 0, 0]
add('chacha', 'chabasico', 'El básico de cha-cha-chá|Չա-չա-չայի հիմնական քայլ', 8, (b) => ({ ...frame, ...sal(b, 0.15), lfz: k(b, 8, cha), rfz: -k(b + 4, 8, cha), lfy: 0.05 * k(b, 8, [1, 0, 1, 0, 0, 0, 0, 0]) + (b % 4 > 3 ? 0.03 * abs(sin(b * PI * 2)) : 0), rfy: 0.05 * k(b, 8, [0, 0, 0, 0, 1, 0, 1, 0]) + (b % 4 > 3 ? 0.03 * abs(sin(b * PI * 2 + 1.5)) : 0), smile: 0.8 }))
add('chacha', 'newyork', 'El New York|Նյու Յորք քայլ', 4, (b) => { const s = k(b, 4, [0, 1, 1, 0]); return { hyaw: 0.9 * s, cy: -0.1 * s, rfz: 0.28 * s, rfx: 0.09 - 0.25 * s, lx: 0.8, ly: 0.1 * s, lz: 0.2, rx: 0.8 - 0.3 * s, ry: 0.3 * s, rz: 0.4, hy: -0.05, rfy: 0.06 * pop(b / 2), lpx: 0.3, smile: 1 } })
add('chacha', 'triple', 'El paso triple|Եռակի քայլ', 4, (b) => ({ ...side(sin(b * PI / 2) > 0 ? 1 : -1)(b * 2), hx: 0.16 * sw(b, 4), lfx: 0.12 + 0.14 * sw(b, 4), rfx: 0.12 - 0.14 * sw(b, 4), hrol: 0.14 * sin(b * PI * 2), ...frame }))
add('chacha', 'spot', 'La vuelta en el sitio|Պտույտ տեղում', 4, (b) => ({ ...spin(b), lx: 0.7, ly: 0.05, rx: 0.2 }), [0, 0, PI * 2])
// --- samba
add('samba', 'sambanope', 'Samba no pé|Սամբա նո պե', 4, (b) => ({ ...marchFeet(b * 1.5, 0.07), lfz: 0.12 * sin(b * 1.5 * PI), rfz: -0.12 * sin(b * 1.5 * PI), hrol: 0.17 * sin(b * 3 * PI), sr: -0.16 * sin(b * 3 * PI), hyaw: 0.16 * sin(b * 1.5 * PI), hy: -0.06, lx: 0.65, ly: 0.2 + 0.3 * sin(b * PI / 2), lz: 0.3, rx: 0.65, ry: 0.2 - 0.3 * sin(b * PI / 2), rz: 0.3, lpx: 0.6, lpy: -0.6, smile: 1 }))
add('samba', 'botafogo', 'El botafogo|Բոտաֆոգո քայլ', 4, (b) => { const s = sw(b, 4); return { hyaw: 0.5 * s, lfx: 0.1 - 0.2 * max(0, -s), lfz: 0.2 * max(0, -s), rfx: 0.1 - 0.2 * max(0, s), rfz: 0.2 * max(0, s), lfy: 0.05 * pop(b), hy: bounce(b, 0.05) - 0.02, lx: 0.75, ly: 0.15 + 0.25 * s, lz: 0.1, rx: 0.75, ry: 0.15 - 0.25 * s, rz: 0.1, smile: 1 } })
add('samba', 'volta', 'La volta|Վոլտա՝ սամբայի պտույտ', 4, (b) => ({ ...pass(b, 4), hy: bounce(b, 0.05), ...up(0.6, 0.55, 0.1), hrol: 0.1 * sin(b * PI * 2) }), [0, 0, PI * 2])
add('samba', 'sambabrazos', 'Los brazos de carnaval|Կառնավալի ձեռքեր', 4, (b) => ({ ...marchFeet(b * 2, 0.05), hrol: 0.15 * sin(b * 2 * PI), sr: -0.15 * sin(b * 2 * PI), lx: 0.55 + 0.2 * sw(b), ly: 0.75, lz: 0.1, rx: 0.55 - 0.2 * sw(b), ry: 0.75, rz: 0.1, lw: sw(b, 1), rw: sw(b, 1), smile: 1, np: -0.1 }))
// --- regueton
add('regueton', 'dembow', 'El paso dembow|Դեմբոու քայլ', 4, (b) => ({ hy: bounce(b * 2, 0.04) - 0.04, hx: 0.08 * sw(b), lfx: 0.17, rfx: 0.17, cr: 0.12 * sw(b), lx: 0.4, ly: -0.2 + 0.25 * sw(b, 1), lz: 0.55, rx: 0.4, ry: -0.2 - 0.25 * sw(b, 1), rz: 0.55, lpx: 1, rpx: 1 }))
add('regueton', 'balanceo', 'El balanceo|Ճոճք', 4, (b) => ({ hx: 0.12 * sw(b, 2), hrol: 0.1 * sw(b, 2), sr: -0.15 * sw(b, 2), lfx: 0.18, rfx: 0.18, lfy: 0.04 * max(0, -sw(b)), rfy: 0.04 * max(0, sw(b)), hy: bounce(b, 0.03) - 0.04, lx: 0.5, ly: -0.5, lz: 0.4, rx: 0.5, ry: 0.65, rz: 0.2, rpx: 1 }))
add('regueton', 'golpehombro', 'El golpe de hombros|Ուսերի հարված', 4, (b) => ({ cy: 0.4 * sw(b, 2), cr: 0.15 * sw(b, 1), hy: bounce(b, 0.05), lfx: 0.16, rfx: 0.16, lx: 0.35, ly: -0.65, lz: 0.3, rx: 0.35, ry: -0.65, rz: 0.3, np: 0.12 * pop(b) }))
add('regueton', 'caminata', 'La caminata|Քայլվածք', 4, (b) => ({ ...step2(1)(b), hy: bounce(b, 0.05), cy: 0.2 * sw(b), ...{ lx: 0.4, ly: -0.5, rx: 0.4, ry: -0.5 } }))
// --- hip hop
add('hiphop', 'bounce', 'El rebote|Ցատկոտում ռիթմով', 4, (b) => ({ hy: bounce(b, 0.08), cp: 0.1 * pop(b), np: 0.2 * pop(b), lfx: 0.17, rfx: 0.17, lx: 0.4, ly: -0.35, lz: 0.45 + 0.15 * sw(b), rx: 0.4, ry: -0.35, rz: 0.45 - 0.15 * sw(b), lpx: 1, rpx: 1 }))
add('hiphop', 'running', 'El running man|Վազող մարդ', 4, (b) => { const s = sin(b * PI); return { lfz: 0.22 * s, rfz: -0.22 * s, lfy: 0.22 * max(0, cos(b * PI)), rfy: 0.22 * max(0, -cos(b * PI)), hy: bounce(b, 0.06), lx: 0.3, ly: -0.2, lz: 0.4 - 0.5 * s, rx: 0.3, ry: -0.2, rz: 0.4 + 0.5 * s, lpy: -1, rpy: -1, cp: 0.12 } })
add('hiphop', 'wave', 'La ola de brazos|Ձեռքերի ալիք', 4, (b) => ({ lx: 0.95, ly: 0.25 * sin(b * PI / 2 * 2), lz: 0.1, rx: 0.95, ry: 0.25 * sin(b * PI / 2 * 2 - 2.2), rz: 0.1, lh: 0.7 * sin(b * PI + 1), rh: 0.7 * sin(b * PI - 3), lpx: 0, lpy: sw(b), lpz: -0.5, rpx: 0, rpy: sw(b - 1), rpz: -0.5, cr: 0.15 * sin(b * PI - 1), hx: 0.03 * sw(b), hy: -0.05, lfx: 0.15, rfx: 0.15 }))
add('hiphop', 'popping', 'El popping|Փոփինգ', 4, (b) => { const i = Math.floor(b) % 4, z = Math.pow(1 - b % 1, 4) * 0.06; return { hy: -0.06 - z, cp: z * 3, lfx: 0.16, rfx: 0.16, lx: [0.6, 0.2, 0.8, 0.3][i], ly: [0.5, 0, -0.1, -0.5][i], lz: [0.2, 0.6, 0.2, 0.4][i], rx: [0.3, 0.7, 0.3, 0.7][i], ry: [-0.4, 0.4, 0.1, -0.2][i], rz: [0.4, 0.3, 0.6, 0.3][i], lpx: 1, rpx: 1, cy: [0.2, -0.2, 0.25, -0.1][i], ny: [0.4, -0.4, 0.2, -0.2][i] } })
add('hiphop', 'kick', 'La patada|Ոտքի հարված', 4, (b) => { const s = sin(b * PI / 2 * 1), p = pop(b); return { lfz: s > 0 ? 0.4 * p : 0, lfy: s > 0 ? 0.25 * p : 0, lft: s > 0 ? -0.4 * p : 0, rfz: s <= 0 ? 0.4 * p : 0, rfy: s <= 0 ? 0.25 * p : 0, rft: s <= 0 ? -0.4 * p : 0, hy: -0.06, cp: 0.1, hpit: -0.08 * p, lx: 0.5, ly: -0.2, lz: 0.3 - 0.4 * s, rx: 0.5, ry: -0.2, rz: 0.3 + 0.4 * s, lpy: -1, rpy: -1 } })
add('hiphop', 'freeze', 'El freeze|Ֆրիզ՝ սառած դիրք', 2, () => ({ hy: -0.3, hx: 0.12, hrol: -0.2, lfx: 0.22, lfr: 0.6, rfx: 0.55, rfr: 0.1, sr: 0.25, cy: 0.3, lx: 0.35, ly: 0.1, lz: 0.5, lpx: 1, rx: 0.75, ry: 0.65, rz: 0, ny: -0.5 }))
add('hiphop', 'toprock', 'El top rock|Թոփ ռոք', 4, (b) => { const s = sw(b, 4); return { hyaw: 0.5 * s, lfz: 0.25 * max(0, s), rfz: 0.25 * max(0, -s), lfx: 0.1 - 0.12 * max(0, s), rfx: 0.1 - 0.12 * max(0, -s), lfy: 0.06 * pop(b), rfy: 0.06 * pop(b + 0.5), hy: bounce(b, 0.06), lx: 0.2 + 0.6 * abs(s), ly: 0, lz: 0.4, rx: 0.2 + 0.6 * abs(s), ry: 0, rz: 0.4, lpx: 1, rpx: 1 } })
// --- contemporary
add('contemporaneo', 'arabesque', 'El arabesque|Արաբեսկ', 4, (b, l) => { const e = sin(Math.min(1, b / l) * PI); return { hpit: 0.35 * e, sp: -0.15 * e, rfz: -0.6 * e, rfy: 0.5 * e, rft: 1 * e, rfx: 0.06, lfx: 0.02, hy: 0, lx: 0.2, ly: 0.35 * e, lz: 0.9, rx: 0.8, ry: -0.1, rz: -0.2, np: -0.2 * e } })
add('contemporaneo', 'extension', 'La extensión|Ձգում', 4, (b) => ({ lx: 0.5, ly: 0.75 * abs(sw(b, 8)), lz: 0.3, rx: 0.9, ry: 0.1, rz: 0.1, cr: 0.25 * sw(b, 8), sr: 0.15 * sw(b, 8), lfx: 0.25, hx: 0.08 * sw(b, 8), hy: -0.06, np: -0.2 }))
add('contemporaneo', 'caida', 'La caída suave|Մեղմ անկում', 4, (b, l) => { const e = sin(b / l * PI); return { hy: -0.02 - 0.34 * e, hpit: 0.25 * e, sp: 0.35 * e, np: 0.3 * e, rfz: -0.3 * e, rfr: 0.2, lfz: 0.12 * e, rft: 0.6 * e, lx: 0.5, ly: -0.8 + 0.2 * e, lz: 0.4, rx: 0.5, ry: -0.8 + 0.6 * e, rz: -0.2 } })
add('contemporaneo', 'grand', 'El gran salto|Մեծ թռիչք', 4, (b, l) => { const j = max(0, sin((b / l - 0.2) * PI * 1.6)) * 0.34; return { hy: -0.05 + j, lfy: j * 1.25, lfz: j * 1.9, rfy: j * 1.25, rfz: -j * 1.9, rft: j * 2.4, lft: j * 1.6, lx: 0.5, ly: 0.2 + j, lz: 0.7, rx: 0.95, ry: 0.1 + j, rz: -0.1, np: -0.1 } })
add('contemporaneo', 'pirueta', 'La pirueta|Պիրուետ', 4, (b) => ({ lfx: 0.02, rfx: 0.0, rfz: 0.06, rfy: 0.34, rft: 0.7, rfr: 1.1, lft: 0.2, hy: 0.0, ...(b > 0.3 ? { lx: -0.05, ly: 0.02, lz: 0.6, rx: -0.05, ry: 0.02, rz: 0.6, lpx: 1, lpy: 0, lpz: 0.2, rpx: 1, rpy: 0, rpz: 0.2 } : {}) }), [0, 0, PI * 4])
export const MOVES = M
export const MV: Record<string, Move> = Object.fromEntries(M.map(m => [m.id, m]))
export const byStyle = (s: Style) => M.filter(m => m.style === s)
// --- locomotion & idles
export const idle = (t: number): Pose => ({ hrol: 0.03 * sin(t * 0.7), hx: 0.018 * sin(t * 0.7), sr: -0.03 * sin(t * 0.7), ny: 0.12 * sin(t * 0.37), nr: 0.03 * sin(t * 0.5), lz: 0.1 + 0.02 * sin(t), rz: 0.1 - 0.02 * sin(t) })
export const talk = (t: number): Pose => ({ ...idle(t), rx: 0.3, ry: -0.35 + 0.18 * sin(t * 2.3), rz: 0.5, rpx: 0.8, rw: 0.6 * sin(t * 2.1), lx: 0.2, ly: -0.8, np: 0.06 * sin(t * 2.7), nr: 0.06 * sin(t * 1.3), smile: 0.5 + 0.5 * sin(t * 9) })
export const walk = (ph: number, run: number): Pose => {
  const s = sin(ph), c = cos(ph), st = 0.2 + run * 0.16, lh = 0.06 + run * 0.14
  return { lfz: st * s, rfz: -st * s, lfy: lh * max(0, c), rfy: lh * max(0, -c), lft: max(0, c) * 0.4 - max(0, s) * 0.2 + max(0, -s) * 0.45, rft: max(0, -c) * 0.4 - max(0, -s) * 0.2 + max(0, s) * 0.45, lfx: 0.06, rfx: 0.06, hy: -0.035 - 0.02 * abs(s) - run * 0.03, hyaw: -0.1 * s, cy: 0.16 * s, hrol: 0.05 * c, sr: -0.05 * c, hpit: run * 0.08, sp: run * 0.06, lz: 0.08 - (0.3 + run * 0.15) * s + run * 0.2, rz: 0.08 + (0.3 + run * 0.15) * s + run * 0.2, ly: -0.88 + run * 0.4, ry: -0.88 + run * 0.4, lx: 0.2, rx: 0.2, lfr: 0.04, rfr: 0.04 }
}
export const cheer = (t: number, o = 0): Pose => ({ ...up(0.35 + 0.1 * sin(t * 7 + o), 0.8), hy: -0.03 + 0.06 * max(0, sin(t * 7 + o)), lfy: 0.05 * max(0, sin(t * 7 + o)), rfy: 0.05 * max(0, sin(t * 7 + o)), smile: 1 })
export const clap = (t: number): Pose => { const c = abs(sin(t * 8)) * 0.16; return { lx: -0.28 + c, ly: -0.1, lz: 0.6, rx: -0.28 + c, ry: -0.1, rz: 0.6, lpx: 1, lpy: -0.7, lpz: 0, rpx: 1, rpy: -0.7, rpz: 0, lw: 1, rw: 1, smile: 1 } }
/** pose for a move at beat b (global) */
export const poseAt = (id: string, b: number): Pose => { const m = MV[id]; const x = ((b % m.len) + m.len) % m.len; return m.f(x, m.len) }
