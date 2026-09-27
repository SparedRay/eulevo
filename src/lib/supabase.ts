import { createClient } from '@supabase/supabase-js'
import { MOCK } from '@/config'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

if (!MOCK && (!url || !key)) {
  // Fail loudly in development so a missing .env.local is obvious.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY — copy .env.example to .env.local')
}

// In mock mode the client is never called; placeholders keep createClient from throwing without an .env.local.
export const supabase = createClient(MOCK ? 'http://mock.invalid' : url, MOCK ? 'mock' : key, {
  auth: {
    persistSession: true, // keeps the guest's anonymous "device" identity in localStorage
    autoRefreshToken: !MOCK,
    detectSessionInUrl: !MOCK, // needed for Google / email-link sign-in redirects
  },
})

/** Makes sure there is a session, creating an anonymous guest session if there is none. */
export async function ensureGuestSession(): Promise<void> {
  if (MOCK) return
  const { data } = await supabase.auth.getSession()
  if (data.session) return

  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.session) throw error ?? new Error('Could not start a guest session')
}

/** True when someone is signed in with a real account (Google / email), not as a guest. */
export async function isHostSignedIn(): Promise<boolean> {
  if (MOCK) return (await import('./mock')).mockHostSignedIn()
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  return !!user && !user.is_anonymous
}

let googleCheck: Promise<boolean> | undefined

/**
 * True when the Google provider is turned on in Supabase (Authentication → Sign In / Providers).
 * Reads the public auth settings once per page load; any failure counts as "off", since email always works.
 */
export function googleSignInEnabled(): Promise<boolean> {
  if (MOCK) return Promise.resolve(true)
  googleCheck ??= fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => s?.external?.google === true)
    .catch(() => false)
  return googleCheck
}

/** Starts Google sign-in; the browser leaves the app and comes back to `redirectTo`. Returns false on failure. */
export async function signInWithGoogle(redirectTo: string): Promise<boolean> {
  if (MOCK) {
    const mock = await import('./mock')
    mock.mockSignIn()
    return true
  }
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })
  return !error
}

/** Emails a sign-in link that opens `redirectTo`. Returns false on failure. */
export async function sendLoginLink(email: string, redirectTo: string): Promise<boolean> {
  if (MOCK) return true
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  return !error
}

export type PasswordSignIn = 'ok' | 'wrong' | 'unconfirmed' | 'error'

/** Email + password sign-in, the alternative to the email link. Hosts create a password under "Sua conta". */
export async function signInWithPassword(email: string, password: string): Promise<PasswordSignIn> {
  if (MOCK) return (await import('./mock')).mockSignInWithPassword(email, password)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (!error) return 'ok'
  if (error.code === 'invalid_credentials') return 'wrong'
  if (error.code === 'email_not_confirmed') return 'unconfirmed'
  console.error(error)
  return 'error'
}

export type SetPasswordResult = 'ok' | 'same' | 'weak' | 'reauth' | 'error'

/** Creates or changes the signed-in host's password. Sends no email. */
export async function setPassword(password: string): Promise<SetPasswordResult> {
  if (MOCK) return (await import('./mock')).mockSetPassword(password)
  const { error } = await supabase.auth.updateUser({ password })
  if (!error) return 'ok'
  if (error.code === 'same_password') return 'same'
  if (error.code === 'weak_password') return 'weak'
  // Only when "Secure password change" is on in Supabase and the session is old.
  if (error.code === 'reauthentication_needed') return 'reauth'
  console.error(error)
  return 'error'
}

/** Email of the signed-in host, for "Sua conta". */
export async function hostEmail(): Promise<string | null> {
  if (MOCK) return (await import('./mock')).mockHostEmail()
  const { data } = await supabase.auth.getSession()
  return data.session?.user.email ?? null
}

export async function signOut(): Promise<void> {
  if (MOCK) return (await import('./mock')).mockSignOut()
  await supabase.auth.signOut()
}
