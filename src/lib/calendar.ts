import { randomId } from './id'

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

/** Downloads an .ics file the phone opens in its calendar app. */
export function downloadCalendarEvent(opts: {
  title: string
  startIso: string
  durationHours?: number
  location?: string | null
  description?: string
}) {
  const start = new Date(opts.startIso)
  const end = new Date(start.getTime() + (opts.durationHours ?? 4) * 3600_000)
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Eu Levo//PT-BR',
    'BEGIN:VEVENT',
    `UID:${randomId()}@eulevo`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeText(opts.title)}`,
    opts.location ? `LOCATION:${escapeText(opts.location)}` : '',
    opts.description ? `DESCRIPTION:${escapeText(opts.description)}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Lembrete: festa amanhã',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'festa.ics'
  a.click()
  URL.revokeObjectURL(a.href)
}
