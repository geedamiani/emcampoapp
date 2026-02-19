/**
 * SAVE LINEUP - Server Action
 *
 * Called when the user saves lineup + goals + cards for a match.
 * Runs on the server so we can revalidate the Partidas page cache.
 *
 * Steps:
 * 1. Verify the user is allowed to edit this account's data.
 * 2. Delete existing match_players and match_events for this match.
 * 3. Insert new match_players (who played, starter or not).
 * 4. Insert new match_events (goals with optional assistant, cards).
 * 5. Revalidate the Partidas page so it shows fresh data.
 */
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getEffectiveOwnerId } from '@/lib/get-effective-owner'

type LineupRow = {
  playerId: string
  starter: boolean
  yellowCards: number
  redCards: number
}

type GoalEntry = {
  scorerId: string
  assistantId: string | null
}

export async function saveLineup(
  matchId: string,
  ownerId: string,
  lineup: LineupRow[],
  goalEntries: GoalEntry[]
): Promise<{ error?: string; eventsCount?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const effectiveOwner = await getEffectiveOwnerId(supabase, user.id)
  if (effectiveOwner !== ownerId) return { error: 'Sem permissão para esta partida' }

  // Step 2: Clear old data for this match
  const { error: delMpErr } = await supabase.from('match_players').delete().eq('match_id', matchId)
  if (delMpErr) return { error: delMpErr.message }

  const { error: delEvErr } = await supabase.from('match_events').delete().eq('match_id', matchId)
  if (delEvErr) return { error: delEvErr.message }

  // Step 3: Insert lineup (try was_starter first, fall back to starter)
  if (lineup.length > 0) {
    const rows = lineup.map(l => ({
      match_id: matchId,
      player_id: l.playerId,
      was_starter: l.starter,
      user_id: ownerId,
    }))
    const res = await supabase.from('match_players').insert(rows)
    if (res.error?.message?.includes('was_starter')) {
      const fallbackRows = lineup.map(l => ({
        match_id: matchId,
        player_id: l.playerId,
        starter: l.starter,
        user_id: ownerId,
      }))
      const res2 = await supabase.from('match_players').insert(fallbackRows)
      if (res2.error) return { error: res2.error.message }
    } else if (res.error) {
      return { error: res.error.message }
    }
  }

  // Step 4: Build events (goals + cards) and insert
  type EventRow = {
    match_id: string
    player_id: string
    event_type: string
    minute: number | null
    user_id: string
    assistant_id?: string | null
  }

  const events: EventRow[] = []

  for (const g of goalEntries) {
    events.push({
      match_id: matchId,
      player_id: g.scorerId,
      event_type: 'goal',
      minute: null,
      user_id: ownerId,
      assistant_id: g.assistantId || null,
    })
  }

  for (const l of lineup) {
    for (let i = 0; i < l.yellowCards; i++) {
      events.push({ match_id: matchId, player_id: l.playerId, event_type: 'yellow_card', minute: null, user_id: ownerId })
    }
    for (let i = 0; i < l.redCards; i++) {
      events.push({ match_id: matchId, player_id: l.playerId, event_type: 'red_card', minute: null, user_id: ownerId })
    }
  }

  if (events.length > 0) {
    const res = await supabase.from('match_events').insert(events)
    if (res.error) return { error: res.error.message }
  }

  // Step 5: Revalidate so the page shows fresh data
  revalidatePath('/dashboard/partidas')
  return { eventsCount: events.length }
}
