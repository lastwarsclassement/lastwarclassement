import type { WeekType } from '@/types'

export function getDayOfWeek(date: Date): number {
  const d = date.getDay()
  return d === 0 ? 7 : d // 1=Mon, 7=Sun
}

export function isSunday(dateStr: string): boolean {
  return getDayOfWeek(new Date(dateStr)) === 7
}

export function calculateEcoRanks(
  scores: { player_id: string; vs_score: number }[]
): Map<string, number> {
  const eligible = scores
    .filter(s => s.vs_score >= 7_200_000 && s.vs_score <= 15_000_000)
    .sort((a, b) => a.vs_score - b.vs_score)

  const ranks = new Map<string, number>()
  eligible.forEach((s, i) => ranks.set(s.player_id, i + 1))
  return ranks
}

export function calculatePoints(
  vsScore: number,
  weekType: WeekType,
  dateStr: string,
  ecoRank?: number
): number {
  const dow = getDayOfWeek(new Date(dateStr))

  if (dow === 7) return 0

  if (weekType === 'push') {
    if (vsScore < 7_200_000) return -3
    if (vsScore >= 25_000_000) return 4
    if (vsScore >= 15_000_000) return 2
    return 1
  }

  // eco
  if (dow >= 1 && dow <= 4) {
    if (vsScore < 7_200_000) return -3
    if (vsScore > 15_000_000) return -3
    if (ecoRank !== undefined) {
      if (ecoRank <= 10) return 10
      if (ecoRank <= 20) return 2
      if (ecoRank <= 30) return 1
    }
    return 0
  }

  // eco fri-sat: push-like points, no penalty for >15M
  if (dow === 5 || dow === 6) {
    if (vsScore < 7_200_000) return -3
    if (vsScore >= 25_000_000) return 4
    if (vsScore >= 15_000_000) return 2
    return 1
  }

  return 0
}

export function computeBatchPoints(
  entries: { player_id: string; vs_score: number }[],
  weekType: WeekType,
  dateStr: string
): Map<string, number> {
  const dow = getDayOfWeek(new Date(dateStr))
  const result = new Map<string, number>()

  if (weekType === 'eco' && dow >= 1 && dow <= 4) {
    const ranks = calculateEcoRanks(entries)
    for (const e of entries) {
      const rank = ranks.get(e.player_id)
      result.set(e.player_id, calculatePoints(e.vs_score, weekType, dateStr, rank))
    }
  } else {
    for (const e of entries) {
      result.set(e.player_id, calculatePoints(e.vs_score, weekType, dateStr))
    }
  }

  return result
}

export function getWeekDates(year: number, weekNumber: number): { start: Date; end: Date } {
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const start = new Date(startOfWeek1)
  start.setDate(startOfWeek1.getDate() + (weekNumber - 1) * 7)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

export function getCurrentWeekNumber(): { week: number; year: number } {
  const now = new Date()
  const jan4 = new Date(now.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const diff = now.getTime() - startOfWeek1.getTime()
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
  return { week, year: now.getFullYear() }
}

export function getBirthdaysInRange(
  players: { id: string; birth_date: string }[],
  start: Date,
  end: Date
): string[] {
  return players
    .filter(p => {
      const bd = new Date(p.birth_date)
      const thisYear = new Date(start.getFullYear(), bd.getMonth(), bd.getDate())
      const nextYear = new Date(start.getFullYear() + 1, bd.getMonth(), bd.getDate())
      return (thisYear >= start && thisYear <= end) || (nextYear >= start && nextYear <= end)
    })
    .map(p => p.id)
}
