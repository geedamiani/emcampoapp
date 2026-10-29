import { createClient } from '@/lib/supabase/client'
import { collapseOpponentName } from '@/lib/opponent-search'

export type CreatedPlayer = {
  id: string
  name: string
  position: string | null
}

type InsertResult = {
  data: CreatedPlayer | null
  error: { message: string } | null
}

/**
 * Creates a player the same way the player form does:
 * insert into players for this account and return the new row.
 * Position may be null when the lineup flow skips it.
 */
export async function createPlayer(
  ownerId: string,
  name: string,
  position: string | null,
): Promise<{ data: CreatedPlayer | null; error: string | null }> {
  const trimmed = collapseOpponentName(name)
  if (!trimmed) return { data: null, error: 'Informe o nome do jogador' }

  const supabase = createClient()
  const pending = supabase
    .from('players')
    .insert({
      name: trimmed,
      position,
      user_id: ownerId,
    })
    .select('id, name, position')
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
      return { data: null, error: result.error?.message || 'Erro ao cadastrar jogador' }
    }

    return {
      data: {
        id: result.data.id,
        name: result.data.name,
        position: result.data.position ?? null,
      },
      error: null,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro inesperado ao cadastrar jogador'
    return { data: null, error: message }
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
