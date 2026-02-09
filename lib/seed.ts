import type { SupabaseClient } from '@supabase/supabase-js'

export async function seedIfEmpty(supabase: SupabaseClient, userId: string) {
  const { data: existingPlayers } = await supabase
    .from('players')
    .select('id')
    .limit(1)

  if (existingPlayers && existingPlayers.length > 0) return

  const playersData = [
    { name: 'Carlao', position: 'Goleiro', whatsapp: '(11) 99111-1111', user_id: userId },
    { name: 'Marquinhos', position: 'Zagueiro', whatsapp: '(11) 99222-2222', user_id: userId },
    { name: 'Thiago', position: 'Zagueiro', whatsapp: '(11) 99333-3333', user_id: userId },
    { name: 'Danilo', position: 'Lateral Direito', whatsapp: '(11) 99444-4444', user_id: userId },
    { name: 'Rafinha', position: 'Lateral Esquerdo', whatsapp: null, user_id: userId },
    { name: 'Vini', position: 'Volante', whatsapp: '(11) 99555-5555', user_id: userId },
    { name: 'Dudu', position: 'Meia', whatsapp: '(11) 99666-6666', user_id: userId },
    { name: 'Gabigol', position: 'Atacante', whatsapp: '(11) 99777-7777', user_id: userId },
    { name: 'Neymar Jr', position: 'Atacante', whatsapp: null, user_id: userId },
    { name: 'Zico', position: 'Meia', whatsapp: '(11) 99888-8888', user_id: userId },
    { name: 'Ronaldinho', position: 'Atacante', whatsapp: '(11) 99999-9999', user_id: userId },
    { name: 'Cafu', position: 'Lateral Direito', whatsapp: null, user_id: userId },
  ]

  const { data: players } = await supabase.from('players').insert(playersData).select()
  if (!players) return

  const opponentsData = [
    { name: 'Amigos do Bairro FC', user_id: userId },
    { name: 'Os Boleiros', user_id: userId },
    { name: 'Veteranos SC', user_id: userId },
    { name: 'Pelada United', user_id: userId },
    { name: 'Real Varzea', user_id: userId },
  ]

  const { data: opponents } = await supabase.from('opponent_teams').insert(opponentsData).select()
  if (!opponents) return

  const matchesData = [
    { opponent_id: opponents[0].id, match_date: '2025-11-02', goals_for: 3, goals_against: 1, location: 'Campo do Parque', user_id: userId },
    { opponent_id: opponents[1].id, match_date: '2025-11-09', goals_for: 2, goals_against: 2, location: 'Quadra Municipal', user_id: userId },
    { opponent_id: opponents[2].id, match_date: '2025-11-16', goals_for: 1, goals_against: 0, location: 'Campo do Parque', user_id: userId },
    { opponent_id: opponents[3].id, match_date: '2025-11-23', goals_for: 0, goals_against: 2, location: 'Campo Sintetico', user_id: userId },
    { opponent_id: opponents[4].id, match_date: '2025-11-30', goals_for: 4, goals_against: 1, location: 'Campo do Parque', user_id: userId },
    { opponent_id: opponents[0].id, match_date: '2025-12-07', goals_for: 2, goals_against: 0, location: 'Quadra Municipal', user_id: userId },
    { opponent_id: opponents[1].id, match_date: '2025-12-14', goals_for: 1, goals_against: 3, location: 'Campo do Parque', user_id: userId },
    { opponent_id: opponents[2].id, match_date: '2025-12-21', goals_for: 3, goals_against: 2, location: 'Campo Sintetico', user_id: userId },
    { opponent_id: opponents[3].id, match_date: '2026-01-11', goals_for: 2, goals_against: 1, location: 'Campo do Parque', user_id: userId },
    { opponent_id: opponents[4].id, match_date: '2026-01-18', goals_for: 0, goals_against: 0, location: 'Quadra Municipal', user_id: userId },
  ]

  const { data: matches } = await supabase.from('matches').insert(matchesData).select()
  if (!matches) return

  const mpData: { match_id: string; player_id: string; starter: boolean; user_id: string }[] = []
  for (const match of matches) {
    for (let idx = 0; idx < 11; idx++) {
      const skip =
        (match.match_date === '2025-11-23' && idx === 8) ||
        (match.match_date === '2025-12-14' && idx === 7) ||
        (match.match_date === '2026-01-18' && idx === 10)
      if (!skip) {
        mpData.push({ match_id: match.id, player_id: players[idx].id, starter: true, user_id: userId })
      }
    }
    if (['2025-11-02', '2025-11-16', '2025-12-07', '2026-01-11'].includes(match.match_date)) {
      mpData.push({ match_id: match.id, player_id: players[11].id, starter: false, user_id: userId })
    }
  }
  await supabase.from('match_players').insert(mpData)

  const ev: { match_id: string; player_id: string; event_type: string; minute: number | null; user_id: string }[] = []
  ev.push(
    { match_id: matches[0].id, player_id: players[7].id, event_type: 'goal', minute: 12, user_id: userId },
    { match_id: matches[0].id, player_id: players[6].id, event_type: 'assist', minute: 12, user_id: userId },
    { match_id: matches[0].id, player_id: players[8].id, event_type: 'goal', minute: 35, user_id: userId },
    { match_id: matches[0].id, player_id: players[7].id, event_type: 'assist', minute: 35, user_id: userId },
    { match_id: matches[0].id, player_id: players[10].id, event_type: 'goal', minute: 70, user_id: userId },
    { match_id: matches[0].id, player_id: players[5].id, event_type: 'yellow_card', minute: 55, user_id: userId },
    { match_id: matches[1].id, player_id: players[7].id, event_type: 'goal', minute: 20, user_id: userId },
    { match_id: matches[1].id, player_id: players[9].id, event_type: 'assist', minute: 20, user_id: userId },
    { match_id: matches[1].id, player_id: players[8].id, event_type: 'goal', minute: 78, user_id: userId },
    { match_id: matches[1].id, player_id: players[3].id, event_type: 'yellow_card', minute: 40, user_id: userId },
    { match_id: matches[1].id, player_id: players[2].id, event_type: 'yellow_card', minute: 65, user_id: userId },
    { match_id: matches[2].id, player_id: players[9].id, event_type: 'goal', minute: 88, user_id: userId },
    { match_id: matches[2].id, player_id: players[6].id, event_type: 'assist', minute: 88, user_id: userId },
    { match_id: matches[3].id, player_id: players[1].id, event_type: 'yellow_card', minute: 30, user_id: userId },
    { match_id: matches[3].id, player_id: players[5].id, event_type: 'yellow_card', minute: 50, user_id: userId },
    { match_id: matches[3].id, player_id: players[5].id, event_type: 'red_card', minute: 72, user_id: userId },
    { match_id: matches[4].id, player_id: players[7].id, event_type: 'goal', minute: 5, user_id: userId },
    { match_id: matches[4].id, player_id: players[8].id, event_type: 'assist', minute: 5, user_id: userId },
    { match_id: matches[4].id, player_id: players[8].id, event_type: 'goal', minute: 22, user_id: userId },
    { match_id: matches[4].id, player_id: players[10].id, event_type: 'goal', minute: 55, user_id: userId },
    { match_id: matches[4].id, player_id: players[9].id, event_type: 'assist', minute: 55, user_id: userId },
    { match_id: matches[4].id, player_id: players[6].id, event_type: 'goal', minute: 80, user_id: userId },
    { match_id: matches[5].id, player_id: players[7].id, event_type: 'goal', minute: 33, user_id: userId },
    { match_id: matches[5].id, player_id: players[10].id, event_type: 'assist', minute: 33, user_id: userId },
    { match_id: matches[5].id, player_id: players[10].id, event_type: 'goal', minute: 60, user_id: userId },
    { match_id: matches[5].id, player_id: players[3].id, event_type: 'yellow_card', minute: 45, user_id: userId },
    { match_id: matches[6].id, player_id: players[9].id, event_type: 'goal', minute: 15, user_id: userId },
    { match_id: matches[6].id, player_id: players[8].id, event_type: 'assist', minute: 15, user_id: userId },
    { match_id: matches[6].id, player_id: players[1].id, event_type: 'red_card', minute: 60, user_id: userId },
    { match_id: matches[6].id, player_id: players[2].id, event_type: 'yellow_card', minute: 75, user_id: userId },
    { match_id: matches[7].id, player_id: players[7].id, event_type: 'goal', minute: 10, user_id: userId },
    { match_id: matches[7].id, player_id: players[6].id, event_type: 'assist', minute: 10, user_id: userId },
    { match_id: matches[7].id, player_id: players[8].id, event_type: 'goal', minute: 45, user_id: userId },
    { match_id: matches[7].id, player_id: players[10].id, event_type: 'goal', minute: 85, user_id: userId },
    { match_id: matches[7].id, player_id: players[9].id, event_type: 'assist', minute: 85, user_id: userId },
    { match_id: matches[8].id, player_id: players[6].id, event_type: 'goal', minute: 25, user_id: userId },
    { match_id: matches[8].id, player_id: players[8].id, event_type: 'assist', minute: 25, user_id: userId },
    { match_id: matches[8].id, player_id: players[7].id, event_type: 'goal', minute: 68, user_id: userId },
    { match_id: matches[8].id, player_id: players[5].id, event_type: 'yellow_card', minute: 80, user_id: userId },
    { match_id: matches[9].id, player_id: players[3].id, event_type: 'yellow_card', minute: 38, user_id: userId },
    { match_id: matches[9].id, player_id: players[1].id, event_type: 'yellow_card', minute: 70, user_id: userId },
  )
  await supabase.from('match_events').insert(ev)
}
