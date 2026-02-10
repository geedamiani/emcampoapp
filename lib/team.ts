import type { SupabaseClient } from '@supabase/supabase-js'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 6)
}

/**
 * Gets the team for the current authenticated user, or creates one
 * from their user_metadata.team_name if it doesn't exist yet.
 */
export async function getOrCreateTeam(
  supabase: SupabaseClient,
  userId: string,
  teamName: string
): Promise<{ id: string; slug: string; name: string }> {
  // Check if team already exists
  const { data: existing } = await supabase
    .from('teams')
    .select('id, slug, name')
    .eq('user_id', userId)
    .single()

  if (existing) return existing

  // Generate slug from team name
  let slug = slugify(teamName) || 'meu-time'

  // Check for collision
  const { data: collision } = await supabase
    .from('teams')
    .select('id')
    .eq('slug', slug)
    .single()

  if (collision) {
    slug = `${slug}-${randomSuffix()}`
  }

  const { data: team, error } = await supabase
    .from('teams')
    .insert({ user_id: userId, name: teamName, slug })
    .select('id, slug, name')
    .single()

  if (error) {
    // If there's a unique constraint violation, try with random suffix
    if (error.code === '23505') {
      slug = `${slugify(teamName) || 'meu-time'}-${randomSuffix()}`
      const { data: retryTeam, error: retryError } = await supabase
        .from('teams')
        .insert({ user_id: userId, name: teamName, slug })
        .select('id, slug, name')
        .single()
      if (retryError) throw retryError
      return retryTeam
    }
    throw error
  }

  return team
}

/**
 * Looks up a team by its public slug. Used for the /t/[slug] public routes.
 * Returns null if the slug doesn't match any team.
 */
export async function getTeamBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<{ id: string; user_id: string; name: string; slug: string } | null> {
  const { data } = await supabase
    .from('teams')
    .select('id, user_id, name, slug')
    .eq('slug', slug)
    .single()

  return data
}
