/**
 * A one-time message for the next screen, e.g. "Presente adicionado" after the gift screen closes.
 * Kept in memory only: it's shown once and gone on reload.
 */
let message: string | null = null

export function setFlash(text: string) {
  message = text
}

export function takeFlash(): string | null {
  const text = message
  message = null
  return text
}
