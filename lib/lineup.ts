/** A match starts eleven players; anyone added after that defaults to the bench. */
export const STARTER_LIMIT = 11

export function isStarterByDefault(currentStarterCount: number): boolean {
  return currentStarterCount < STARTER_LIMIT
}

export interface GoalDraft {
  id: string
  scorerId: string
  assistantId: string | null
}

/**
 * Drop a player from in-progress goals without throwing away the goal itself
 * when they only assisted it. A goal whose scorer left the lineup is removed,
 * because every goal still needs a scorer.
 */
export function goalsAfterPlayerRemoved<T extends GoalDraft>(goals: T[], playerId: string): T[] {
  const next: T[] = []
  for (const goal of goals) {
    if (goal.scorerId === playerId) continue
    if (goal.assistantId === playerId) {
      next.push({ ...goal, assistantId: null })
      continue
    }
    next.push(goal)
  }
  return next
}
