/**
 * SHARE LINK
 *
 * Each account (owner) has one public share row in `team_share`:
 * a stable token for /t/<token> and a slug for /<slug>.
 * The public pages are read-only.
 *
 * Only the owner or an admin of the account can get or create the row.
 * RLS still limits writes to the owner, so an invited admin does not receive a link.
 */
import { createClient } from '@/lib/supabase/server'
import { slugCandidate } from '@/lib/slug'

export function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

type ShareRow = { token: string; slug: string }

type WriteError = { code?: string; message?: string; details?: string } | null

function uniqueKind(error: WriteError): 'slug' | 'token' | 'owner' | 'other' {
  if (!error || error.code !== '23505') return 'other'
  const blob = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase()
  if (blob.includes('slug')) return 'slug'
  if (blob.includes('token')) return 'token'
  if (blob.includes('pkey') || blob.includes('owner')) return 'owner'
  return 'slug'
}

export async function getOrCreateShare(ownerId: string, teamName: string): Promise<ShareRow | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    if (user.id !== ownerId) {
      const { data: adminRow } = await supabase
        .from('team_admins')
        .select('owner_id')
        .eq('owner_id', ownerId)
        .eq('admin_id', user.id)
        .limit(1)
        .maybeSingle()
      if (!adminRow) return null
    }

    const { data: row, error: readError } = await supabase
      .from('team_share')
      .select('token, slug')
      .eq('owner_id', ownerId)
      .maybeSingle()
    if (readError) return null
    if (row?.token && row.slug) return { token: row.token, slug: row.slug }

    const name = teamName.trim() || 'Meu Time'

    if (row?.token) {
      for (let index = 0; index < 50; index++) {
        const slug = slugCandidate(name, index)
        const { data: updated, error } = await supabase
          .from('team_share')
          .update({ slug })
          .eq('owner_id', ownerId)
          .is('slug', null)
          .select('token, slug')
          .maybeSingle()
        if (!error && updated?.token && updated.slug) {
          return { token: updated.token, slug: updated.slug }
        }
        if (!error) {
          const { data: fresh } = await supabase
            .from('team_share')
            .select('token, slug')
            .eq('owner_id', ownerId)
            .maybeSingle()
          if (fresh?.token && fresh.slug) return { token: fresh.token, slug: fresh.slug }
          return null
        }
        if (uniqueKind(error) === 'slug') continue
        return null
      }
      return null
    }

    let token = generateShareToken()
    let tokenRetries = 0
    for (let index = 0; index < 50; index++) {
      const slug = slugCandidate(name, index)
      const { error } = await supabase.from('team_share').insert({ owner_id: ownerId, token, slug })
      if (!error) return { token, slug }
      const kind = uniqueKind(error)
      if (kind === 'token' && tokenRetries < 5) {
        token = generateShareToken()
        tokenRetries += 1
        index -= 1
        continue
      }
      if (kind === 'owner') {
        const { data: fresh } = await supabase
          .from('team_share')
          .select('token, slug')
          .eq('owner_id', ownerId)
          .maybeSingle()
        if (fresh?.token && fresh.slug) return { token: fresh.token, slug: fresh.slug }
        return null
      }
      if (kind === 'slug') continue
      return null
    }
    return null
  } catch {
    return null
  }
}
