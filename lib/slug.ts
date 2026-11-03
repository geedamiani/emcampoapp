/**
 * Team share slugs.
 *
 * Auto allocation (new rows and backfill) may append -time or -2.
 * A manual edit uses normalizeTeamSlug and rejects reserved or taken values.
 */

export const SLUG_MAX_LENGTH = 48

export const RESERVED_SLUGS = new Set([
  'auth',
  'dashboard',
  't',
  'api',
  'admin',
  'public',
  'static',
  'assets',
  'login',
  'signup',
  'sign-up',
  'share',
  'convite',
])

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const COMBINING_MARKS = /\p{M}/gu
const INNER_PUNCTUATION = /['’´.]/gu
const NON_SLUG_CHARS = /[^a-z0-9]+/g
const EDGE_HYPHENS = /^-+|-+$/g

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}

export function isSlugFormat(slug: string): boolean {
  return slug.length >= 1 && slug.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(slug)
}

export function slugifyTeamName(name: string): string {
  let slug = name.normalize('NFD').replace(COMBINING_MARKS, '')
  slug = slug.replace(/&/g, ' e ')
  slug = slug.replace(INNER_PUNCTUATION, '')
  slug = slug.toLowerCase()
  slug = slug.replace(NON_SLUG_CHARS, '-').replace(EDGE_HYPHENS, '')
  if (slug.length > SLUG_MAX_LENGTH) {
    slug = slug.slice(0, SLUG_MAX_LENGTH)
    const cut = slug.lastIndexOf('-')
    if (cut > 0) slug = slug.slice(0, cut)
    slug = slug.replace(/-+$/g, '')
  }
  return slug
}

/** Value shown before save. Empty input becomes `time`. Reserved words stay reserved so the save can refuse them. */
export function normalizeTeamSlug(input: string): string {
  return slugifyTeamName(input) || 'time'
}

export function slugEditError(slug: string, takenByOther: boolean): string | null {
  if (!isSlugFormat(slug)) return 'Use letras, números e hífens.'
  if (isReservedSlug(slug)) return 'Este endereço é reservado.'
  if (takenByOther) return 'Este endereço já está em uso.'
  return null
}

export function fitSlugSuffix(stem: string, suffix: string): string {
  let nextStem = stem
  if (nextStem.length + suffix.length > SLUG_MAX_LENGTH) {
    nextStem = nextStem.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, '')
  }
  return `${nextStem}${suffix}`
}

/** First automatic slug, before numeric collision suffixes. */
export function primaryTeamSlug(name: string): string {
  const base = slugifyTeamName(name) || 'time'
  if (!isReservedSlug(base)) return base
  return fitSlugSuffix(base, '-time')
}

/** collisionIndex 0 is the primary slug. 1 is `-2`, 2 is `-3`, and so on. */
export function slugCandidate(name: string, collisionIndex: number): string {
  const primary = primaryTeamSlug(name)
  if (collisionIndex <= 0) return primary
  return fitSlugSuffix(primary, `-${collisionIndex + 1}`)
}

export function allocateTeamSlug(name: string, isTaken: (slug: string) => boolean): string {
  for (let index = 0; index < 1000; index++) {
    const candidate = slugCandidate(name, index)
    if (!isTaken(candidate) && !isReservedSlug(candidate)) return candidate
  }
  throw new Error('Não foi possível gerar um endereço único.')
}
