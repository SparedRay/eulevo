/**
 * The last guest list opened on this phone. The installed app always starts at "/", so the home page
 * uses this to offer "Abrir a lista" instead of leaving a guest without their link.
 */
const KEY = 'eulevo-last-list'

export interface LastList {
  token: string
  title: string
}

export function rememberList(list: LastList) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // private mode or blocked storage: the home page just won't offer it
  }
}

export function lastList(): LastList | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return typeof saved?.token === 'string' && typeof saved?.title === 'string' ? saved : null
  } catch {
    return null
  }
}
