import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_KEY

if (!url || !key) {
  // Fail loudly in development so a missing .env.local is obvious.
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_KEY — copy .env.example to .env.local')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true, // keeps the guest's anonymous "device" identity in localStorage
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed for Google / email-link sign-in redirects
  },
})

/** Returns the current session, creating an anonymous guest session if there is none. */
export async function ensureGuestSession(): Promise<Session> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return data.session

  const { data: anon, error } = await supabase.auth.signInAnonymously()
  if (error || !anon.session) throw error ?? new Error('Could not start a guest session')
  return anon.session
}

/** True when someone is signed in with a real account (Google / email), not as a guest. */
export async function isHostSignedIn(): Promise<boolean> {
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  return !!user && !user.is_anonymous
}
