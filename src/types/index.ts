export type UserRole = 'admin' | 'reader'
export type WeekType = 'push' | 'eco'
export type DayType = WeekType | 'gel'
export type WeekStatus = 'active' | 'validated'
export type PlayerRole = 'pilot' | 'vip' | null

export interface Player {
  id: string
  username: string
  display_name: string
  birth_date: string
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  username: string
  role: UserRole
  player_id: string | null
  created_at: string
}

export interface Week {
  id: string
  week_number: number
  year: number
  start_date: string
  end_date: string
  type: WeekType
  status: WeekStatus
  frozen_dates: string[]
  created_at: string
}

export interface DailyScore {
  id: string
  week_id: string
  player_id: string
  score_date: string
  vs_score: number | null
  contribution_score: number | null
  points_earned: number
  week_type: DayType | null
  created_at: string
}

export interface WeeklyContribution {
  id: string
  week_id: string
  player_id: string
  tier: 1 | 2 | 3
  points: number
  created_at: string
}

export interface Sanction {
  id: string
  week_id: string
  player_id: string
  points: number
  reason: string | null
  created_at: string
}

export interface WeeklyRanking {
  id: string
  week_id: string
  player_id: string
  rank: number
  total_points: number
  role: PlayerRole
  base_score_next_week: number
  created_at: string
}

export interface PlayerWeekScore {
  player: Player
  base_score: number
  daily_points: number
  contribution_points: number
  sanction_points: number
  total_points: number
  rank?: number
  role?: PlayerRole
}
