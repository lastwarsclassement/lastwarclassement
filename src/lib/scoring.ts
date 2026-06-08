import type { WeekType } from '@/types'

export function getDayOfWeek(date: Date): number {
  const d = date.getUTCDay()
  return d === 0 ? 7 : d // 1=Mon, 7=Sun
}

export function isSunday(dateStr: string): boolean {
  return getDayOfWeek(new Date(dateStr + 'T00:00:00Z')) === 7
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
  const dow = getDayOfWeek(new Date(dateStr + 'T00:00:00Z'))

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
    if (vsScore >= 15_000_000) return -3
    if (ecoRank !== undefined) {
      if (ecoRank <= 10) return 3
      if (ecoRank <= 20) return 2
      if (ecoRank <= 30) return 1
    }
    return 0
  }

  // eco fri-sat: -3 si < 7.2M ou >= 15M, 0 sinon
  if (dow === 5 || dow === 6) {
    if (vsScore < 7_200_000) return -3
    if (vsScore >= 15_000_000) return -3
    return 0
  }

  return 0
}

export function computeBatchPoints(
  entries: { player_id: string; vs_score: number }[],
  weekType: WeekType,
  dateStr: string
): Map<string, number> {
  const dow = getDayOfWeek(new Date(dateStr + 'T00:00:00Z'))
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

// Returns Monday of the current week in UTC
export function getCurrentWeekStart(): Date {
  const now = new Date()
  const day = now.getUTCDay() // 0=Sun, 1=Mon ... 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff))
  return monday
}

export function getWeekDates(year: number, weekNumber: number): { start: Date; end: Date } {
  // ISO week: week 1 contains Jan 4
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay()
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setUTCDate(jan4.getUTCDate() - (day === 0 ? 6 : day - 1))
  const start = new Date(startOfWeek1)
  start.setUTCDate(startOfWeek1.getUTCDate() + (weekNumber - 1) * 7)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)
  return { start, end }
}

export function getCurrentWeekNumber(): { week: number; year: number } {
  const now = new Date()
  const year = now.getUTCFullYear()
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay()
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setUTCDate(jan4.getUTCDate() - (day === 0 ? 6 : day - 1))
  const diff = now.getTime() - startOfWeek1.getTime()
  const week = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1
  return { week, year }
}

export function computeContributionPoints(
  sundayScores: { player_id: string; contribution_score: number | null }[]
): Map<string, number> {
  const sorted = sundayScores
    .filter(s => (s.contribution_score ?? 0) > 0)
    .sort((a, b) => (b.contribution_score ?? 0) - (a.contribution_score ?? 0))

  const result = new Map<string, number>()
  sorted.forEach((s, i) => {
    const rank = i + 1
    result.set(s.player_id, rank <= 10 ? 10 : rank <= 20 ? 6 : rank <= 30 ? 3 : 0)
  })
  return result
}

export function getBirthdaysInRange(
  players: { id: string; birth_date: string }[],
  start: Date,
  end: Date
): string[] {
  const y = start.getUTCFullYear()
  return players
    .filter(p => {
      const bd = new Date(p.birth_date + 'T00:00:00Z')
      const thisYear = new Date(Date.UTC(y, bd.getUTCMonth(), bd.getUTCDate()))
      const nextYear = new Date(Date.UTC(y + 1, bd.getUTCMonth(), bd.getUTCDate()))
      return (thisYear >= start && thisYear <= end) || (nextYear >= start && nextYear <= end)
    })
    .map(p => p.id)
}

export function getNextBirthdayDate(birthDate: string, start: Date): Date {
  const bd = new Date(birthDate + 'T00:00:00Z')
  const y = start.getUTCFullYear()
  const thisYear = new Date(Date.UTC(y, bd.getUTCMonth(), bd.getUTCDate()))
  return thisYear >= start ? thisYear : new Date(Date.UTC(y + 1, bd.getUTCMonth(), bd.getUTCDate()))
}
