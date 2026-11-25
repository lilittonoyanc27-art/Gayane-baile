import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GAYANE, type Outfit } from './three/character'
export interface Hist { d: string; t: string; score: number; medal: 0 | 1 | 2 | 3 }
export interface Choreo { name: string; moves: string[]; music: string; stage: string; light: string }
export interface Save {
  coins: number; xpEs: number; xpDance: number; words: Record<string, string>; quests: Record<string, number>; games: Record<string, number>
  owned: string[]; outfit: Outfit; medals: [number, number, number]; cups: string[]; history: Hist[]; cities: string[]; story: Record<string, number>
  secrets: string[]; talk: string[]; daily: { d: string; p: Record<string, number>; claimed: string[] }; choreos: Choreo[]; prep: number; finalDone: boolean; streak: number; lastDay: string; met: string[]; grammar: Record<string, number>; saved: Record<string, string>
  set: { music: number; sfx: number; voice: number; rate: number; gfx: 0 | 1 | 2; auto: boolean; sens: number; fps: boolean }
  add: (p: { coins?: number; es?: number; dance?: number }) => void; learn: (es: string, hy: string) => void; save: (es: string, hy: string) => void; mark: (q: string, n?: number) => void; bump: (id: string, n?: number) => void; up: (p: Partial<Save>) => void; reset: () => void
}
const today = () => new Date().toLocaleDateString('sv')
const init = { coins: 120, xpEs: 0, xpDance: 0, words: {}, quests: {}, games: {}, owned: ['crop_rosa', 'leg_negro', 'snk_crema'], outfit: GAYANE, medals: [0, 0, 0] as [number, number, number], cups: [], history: [], cities: ['sevilla'], story: {}, secrets: [], talk: [], daily: { d: '', p: {}, claimed: [] }, choreos: [], prep: 0, finalDone: false, streak: 0, lastDay: '', met: [], grammar: {}, saved: {}, set: { music: 0.5, sfx: 0.8, voice: 1, rate: 0.9, gfx: (/Mobi|Android|iPhone|iPad/.test(typeof navigator === 'undefined' ? '' : navigator.userAgent) ? 1 : 2) as 0 | 1 | 2, auto: true, sens: 1, fps: false } }
export const useSave = create<Save>()(persist((set, get) => ({
  ...(init as any),
  add: p => set(s => ({ coins: Math.max(0, s.coins + (p.coins ?? 0)), xpEs: s.xpEs + (p.es ?? 0), xpDance: s.xpDance + (p.dance ?? 0) })),
  learn: (es, hy) => { if (!get().words[es]) set(s => ({ words: { ...s.words, [es]: hy } })) },
  save: (es, hy) => set(s => { const n = { ...s.saved }; if (n[es]) delete n[es]; else n[es] = hy; return { saved: n } }),
  mark: (q, n = 1) => set(s => ({ quests: { ...s.quests, [q]: Math.max(n, s.quests[q] ?? 0) } })),
  bump: (id, n = 1) => set(s => { const d = today(), cur = s.daily.d === d ? s.daily : { d, p: {}, claimed: [] }; return { daily: { ...cur, p: { ...cur.p, [id]: (cur.p[id] ?? 0) + n } } } }),
  up: p => set(p), reset: () => set({ ...(init as any) }),
}), { name: 'gayane-dance-world-v1', version: 1 }))
export const S = () => useSave.getState()
export function touchDay() { const s = S(), d = today(); if (s.lastDay === d) return; const y = new Date(Date.now() - 864e5).toLocaleDateString('sv'); s.up({ lastDay: d, streak: s.lastDay === y ? s.streak + 1 : 1 }); if (s.daily.d !== d) s.up({ daily: { d, p: {}, claimed: [] } }) }
export const levelEs = (x: number) => x < 250 ? 'A2' : x < 600 ? 'A2+' : x < 1200 ? 'B1' : x < 2000 ? 'B1+' : 'B2'
export const levelDance = (x: number) => 1 + Math.floor(Math.sqrt(x / 40))
export const gLevel = (x: number): 0 | 1 | 2 => x < 350 ? 0 : x < 1200 ? 1 : 2
export function addHistory(t: string, score: number) { const s = S(), medal = (score >= 90 ? 3 : score >= 75 ? 2 : score >= 60 ? 1 : 0) as 0 | 1 | 2 | 3, m = [...s.medals] as [number, number, number]; if (medal) m[3 - medal]++; s.up({ medals: m, history: [{ d: today(), t, score, medal }, ...s.history].slice(0, 60) }); return medal }
