/**
 * Positions offered when registering a player.
 * Shared by the player form and the lineup inline-create chips.
 */
export const PLAYER_POSITIONS = [
  'Goleiro',
  'Zagueiro',
  'Lateral Direito',
  'Lateral Esquerdo',
  'Volante',
  'Meia',
  'Atacante',
] as const

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number]
