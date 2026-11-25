// mistakes become review cards (local only)
const K = 'gayane-errs'
export interface Err { q: string; a: string; e: string }
export const getErrs = (): Err[] => { try { return JSON.parse(localStorage.getItem(K) ?? '[]') } catch { return [] } }
export const addErr = (q: string, a: string, e: string) => { try { localStorage.setItem(K, JSON.stringify([{ q, a, e }, ...getErrs().filter(x => x.q !== q)].slice(0, 40))) } catch { /* */ } }
export const delErr = (q: string) => { try { localStorage.setItem(K, JSON.stringify(getErrs().filter(x => x.q !== q))) } catch { /* */ } }
