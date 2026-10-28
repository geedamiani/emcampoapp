import { createClient } from '@/lib/supabase/client'

export type CreatedOpponent = {
  id: string
  name: string
}

type InsertResult = {
  data: CreatedOpponent | null
  error: { message: string } | null
}

/**
 * Creates an opponent team the same way the match form used to:
 * insert into opponent_teams for this account and return the new row.
 */
export async function createOpponentTeam(
  ownerId: string,
  name: string,
): Promise<{ data: CreatedOpponent | null; error: string | null }> {
  const trimmed = name.replace(/\s+/g, ' ').trim()
  if (!trimmed) return { data: null, error: 'Informe o nome do adversário' }

  const supabase = createClient()
  const pending = supabase
    .from('opponent_teams')
    .insert({ name: trimmed, user_id: ownerId })
    .select('id, name')
    .single()

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      pending as unknown as Promise<InsertResult>,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Tempo limite excedido. Verifique sua conexão e tente novamente.')),
          15000,
        )
      }),
    ])

    if (result.error || !result.data) {
      return { data: null, error: result.error?.message || 'Erro ao criar adversário' }
    }

    return { data: { id: result.data.id, name: result.data.name }, error: null }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao criar adversário'
    return { data: null, error: message }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
