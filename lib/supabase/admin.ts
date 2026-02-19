import { createClient } from '@supabase/supabase-js'

/**
 * Admin client that bypasses RLS. Use ONLY for server-side operations
 * that require reading data regardless of auth (e.g. validating invite tokens).
 * Never expose this client to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } })
}
