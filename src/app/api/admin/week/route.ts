import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'
import { getCurrentWeekNumber, getCurrentWeekStart, getWeekDates, computeBatchPoints } from '@/lib/scoring'
import type { WeekType } from '@/types'

// POST: Start a new week
export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getAdmin()
  const { playerIds } = await req.json()

  // Block if an active week already exists
  const { data: activeWeek } = await db.from('weeks').select('id').eq('status', 'active').maybeSingle()
  if (activeWeek) return NextResponse.json({ error: 'Week already active' }, { status: 400 })

  // Determine next week number: continue from last existing week, or use current ISO week
  const { data: lastWeek } = await db
    .from('weeks').select('week_number, year')
    .order('year', { ascending: false }).order('week_number', { ascending: false })
    .limit(1).maybeSingle()

  let week: number, year: number, startDate: string, endDate: string

  if (lastWeek) {
    const nextWeekNum = lastWeek.week_number >= 52 ? 1 : lastWeek.week_number + 1
    const nextYear = lastWeek.week_number >= 52 ? lastWeek.year + 1 : lastWeek.year
    const { start, end } = getWeekDates(nextYear, nextWeekNum)
    week = nextWeekNum
    year = nextYear
    startDate = start.toISOString().split('T')[0]
    endDate = end.toISOString().split('T')[0]
  } else {
    const cur = getCurrentWeekNumber()
    week = cur.week
    year = cur.year
    const monday = getCurrentWeekStart()
    const sunday = new Date(monday)
    sunday.setUTCDate(monday.getUTCDate() + 6)
    startDate = monday.toISOString().split('T')[0]
    endDate = sunday.toISOString().split('T')[0]
  }

  const { data: newWeek, error } = await db
    .from('weeks')
    .insert({ week_number: week, year, start_date: startDate, end_date: endDate, type: 'push', status: 'active' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recover base scores from the last validated week's rankings
  const baseScoreMap = new Map<string, number>()
  const { data: lastValidated } = await db
    .from('weeks').select('id').eq('status', 'validated')
    .order('year', { ascending: false }).order('week_number', { ascending: false })
    .limit(1).maybeSingle()

  if (lastValidated) {
    const { data: rankings } = await db
      .from('weekly_rankings').select('player_id, base_score_next_week').eq('week_id', lastValidated.id)
    rankings?.forEach(r => baseScoreMap.set(r.player_id, r.base_score_next_week))
  }

  if (playerIds?.length) {
    await db.from('player_week_base').insert(
      playerIds.map((id: string) => ({ week_id: newWeek.id, player_id: id, base_score: baseScoreMap.get(id) ?? 0 }))
    )
  }

  return NextResponse.json({ week: newWeek })
}

// DELETE: Remove week and all its data
export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId } = await req.json()
  const db = getAdmin()

  const { error } = await db.from('weeks').delete().eq('id', weekId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// PATCH: Update week type or status
export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getAdmin()
  const { weekId, type, status } = await req.json()

  const update: Record<string, string> = {}
  if (type) update.type = type
  if (status) update.status = status

  const { error } = await db.from('weeks').update(update).eq('id', weekId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (type) {
    const { data: scores } = await db
      .from('daily_scores').select('id, player_id, score_date, vs_score')
      .eq('week_id', weekId).not('vs_score', 'is', null)

    if (scores?.length) {
      const byDate = new Map<string, { id: string; player_id: string; vs_score: number }[]>()
      for (const s of scores) {
        if (!byDate.has(s.score_date)) byDate.set(s.score_date, [])
        byDate.get(s.score_date)!.push({ id: s.id, player_id: s.player_id, vs_score: s.vs_score })
      }
      for (const [date, entries] of byDate) {
        const pointsMap = computeBatchPoints(
          entries.map(e => ({ player_id: e.player_id, vs_score: e.vs_score })),
          type as WeekType, date
        )
        for (const entry of entries) {
          await db.from('daily_scores').update({ points_earned: pointsMap.get(entry.player_id) ?? 0 }).eq('id', entry.id)
        }
      }
    }
  }

  return NextResponse.json({ ok: true })
}
