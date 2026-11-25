import { create } from 'zustand'
import type { Item } from '../three/kit'
export interface UI { started: boolean; scene: string; loading: number; near: Item | null; items: Item[]; panel: { id: string; arg?: any } | null; dialog: { id: string; arg?: any } | null; toasts: { id: number; t: string; k: string }[]; pop: { es: string; hy: string; word?: string; why?: string; x: number; y: number } | null; pause: boolean; tmode: boolean; hud: boolean }
export const useUI = create<UI>(() => ({ started: false, scene: '', loading: 0, near: null, items: [], panel: null, dialog: null, toasts: [], pop: null, pause: false, tmode: false, hud: true }))
export const U = useUI.getState, setU = useUI.setState
let tid = 0
export function toast(t: string, k = 'ok') { const id = ++tid; setU(s => ({ toasts: [...s.toasts.slice(-2), { id, t, k }] })); setTimeout(() => setU(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), 3400) }
export const openPanel = (id: string, arg?: any) => setU({ panel: { id, arg }, dialog: null })
export const openDialog = (id: string, arg?: any) => setU({ dialog: { id, arg }, panel: null })
export const closePanel = () => setU({ panel: null, dialog: null })
