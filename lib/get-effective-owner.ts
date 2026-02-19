/**
 * EFFECTIVE OWNER
 *
 * Determines whose data the current user should see:
 * - If the user has their own players → they are an owner, return their own ID.
 * - If the user is an admin for another team → return that team owner's ID.
 * - Fallback: return the user's own ID (empty account).
 *
 * This is used everywhere to scope data queries to the right account.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

export async function getEffectiveOwnerId(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data: ownPlayers } = await supabase
    .from('players')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  if (ownPlayers && ownPlayers.length > 0) {
    return userId
  }

  const { data: adminRow } = await supabase
    .from('team_admins')
    .select('owner_id')
    .eq('admin_id', userId)
    .limit(1)
    .single()

  return adminRow?.owner_id || userId
}
