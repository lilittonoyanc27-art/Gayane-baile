import { S } from '../store'
let voices: SpeechSynthesisVoice[] = []
const load = () => { voices = window.speechSynthesis?.getVoices() ?? [] }
if (typeof window !== 'undefined' && 'speechSynthesis' in window) { load(); speechSynthesis.addEventListener?.('voiceschanged', load) }
export const canSpeak = () => 'speechSynthesis' in window
export function speak(t: string, rate?: number, male = false) {
  if (!canSpeak() || S().set.voice <= 0) return
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t.replace(/_+/g, '…').replace(/[«»]/g, '')); u.lang = 'es-ES'; const es = voices.filter(v => v.lang.startsWith('es')); const pref = es.find(v => /es[-_]ES/.test(v.lang) && /M[óo]nica|Marisol|Elvira|Google/.test(v.name)) ?? es.find(v => /es[-_]ES/.test(v.lang)) ?? es[0]; const mv = es.find(v => /Jorge|Diego|Juan|Alvaro|Carlos/.test(v.name)); const v = male ? mv ?? pref : pref; if (v) u.voice = v; u.rate = rate ?? S().set.rate; u.volume = S().set.voice; u.pitch = male && !mv ? 0.75 : 1; speechSynthesis.speak(u) } catch { /* speech unavailable */ }
}
export const hush = () => { try { window.speechSynthesis?.cancel() } catch { /* */ } }
export const listen = (cb: (t: string) => void, end: () => void): (() => void) | null => { const R = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition; if (!R) return null; const r = new R(); r.lang = 'es-ES'; r.interimResults = false; r.onresult = (e: any) => cb(e.results[0][0].transcript); r.onend = end; r.onerror = end; try { r.start() } catch { return null } return () => r.stop() }
