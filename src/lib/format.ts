const LOCALE = 'pt-BR'

/** "sábado, 24 de outubro" */
export function partyDay(iso: string | null): string {
  if (!iso) return 'o dia da festa'
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(iso),
  )
}

/** "16h" / "16h30" */
export function partyTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours()
  const m = d.getMinutes()
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
}

/** "sábado, 24 de outubro, às 16h" */
export function partyWhen(iso: string | null): string {
  const time = partyTime(iso)
  return time ? `${partyDay(iso)}, às ${time}` : partyDay(iso)
}

/** "hoje, 7h42" / "26 de set., 21h10" */
export function shortDateTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const time = partyTime(iso)
  if (d.toDateString() === today.toDateString()) return `hoje, ${time}`
  const day = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' }).format(d)
  return `${day}, ${time}`
}
