/** Product name shown in the UI. Change it here to rename the app everywhere. */
export const APP_NAME = 'Eu Levo'

/**
 * Mock mode: `npm run dev:mock` (or VITE_MOCK=1 on the dev server). Uses the in-memory demo data in
 * src/lib/mock.ts instead of Supabase. Always false in production builds, so the mock is left out of them.
 */
export const MOCK = import.meta.env.DEV && import.meta.env.VITE_MOCK === '1'
