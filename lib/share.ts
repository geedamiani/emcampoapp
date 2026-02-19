/**
 * SHARE LINK
 *
 * Each account (owner) has one public share token stored in `team_share`.
 * The public page /t/[token] shows a read-only view of that account's data.
 *
 * Only the owner or an admin of the account can get/create the token.
 */
import { createClient } from '@/lib/supabase/server'

function generateToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function getOrCreateShareToken(ownerId: string): Promise<string | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Check permission: must be the owner or an admin
    if (user.id !== ownerId) {
      const { data: adminRow } = await supabase
        .from('team_admins')
        .select('owner_id')
        .eq('owner_id', ownerId)
        .eq('admin_id', user.id)
        .limit(1)
        .single()
      if (!adminRow) return null
    }

    // Return existing token or create a new one
    const { data: row } = await supabase.from('team_share').select('token').eq('owner_id', ownerId).single()
    if (row?.token) return row.token

    const token = generateToken()
    const { error } = await supabase.from('team_share').insert({ owner_id: ownerId, token })
    if (error) return null
    return token
  } catch {
    return null
  }
}
