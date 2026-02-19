/**
 * ADMIN SUPABASE CLIENT
 *
 * Bypasses RLS using the service role key. Used for:
 * - Fetching user metadata (team name) for other users
 * - Reading match_events reliably
 * - Public share page (no auth, needs to read all data)
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY env var. Throws if not set.
 * Never expose this client to the browser.
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY env var. ' +
      'Add it in Vercel Dashboard → Settings → Environment Variables.'
    )
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
