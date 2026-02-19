/**
 * BROWSER SUPABASE CLIENT
 *
 * Used in 'use client' components. Respects RLS (uses anon key).
 * For server components and actions, use lib/supabase/server.ts instead.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
