import { ref } from 'vue'

/** Chrome's install event (not in the TypeScript DOM types). */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Set when the browser offers its own install dialog (Android Chrome, Edge, desktop Chrome). */
export const installPrompt = ref<InstallPromptEvent | null>(null)

/** Already opened from the home screen. */
export function isInstalled(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** iPhone / iPad Safari: no install dialog, only Compartilhar → Adicionar à Tela de Início. */
export function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1)
  return ios && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

/** Shows the browser's install dialog. True if the person installed. */
export async function promptInstall(): Promise<boolean> {
  const event = installPrompt.value
  if (!event) return false
  await event.prompt()
  const { outcome } = await event.userChoice
  installPrompt.value = null // each event can prompt once
  return outcome === 'accepted'
}

/** Call once at startup: the install event can fire before any screen is mounted. */
export function setUpInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // we show our own button instead of the browser's mini-bar
    installPrompt.value = e as InstallPromptEvent
  })
  window.addEventListener('appinstalled', () => (installPrompt.value = null))

  // Production only: in dev and mock mode a service worker would cache files you are editing.
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(console.error))
  }
}
