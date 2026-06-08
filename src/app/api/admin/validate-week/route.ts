import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'
import { getWeekDates } from '@/lib/scoring'
import type { PlayerRole } from '@/types'

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, rankings } = await req.json() as {
    weekId: string
    rankings: {
      player_id: string
      rank: number
      total_points: number
      role: PlayerRole
      base_score_next_week: number
    }[]
  }

  const db = getAdmin()

  // 1. Save rankings
  const { error: rankError } = await db.from('weekly_rankings').upsert(
    rankings.map(r => ({ ...r, week_id: weekId })),
    { onConflict: 'week_id,player_id' }
  )
  if (rankError) return NextResponse.json({ error: rankError.message }, { status: 500 })

  // 2. Mark week as validated
  const { error: weekError } = await db.from('weeks').update({ status: 'validated' }).eq('id', weekId)
  if (weekError) return NextResponse.json({ error: weekError.message }, { status: 500 })

  // 3. Create next week
  const { data: currentWeek } = await db.from('weeks').select('*').eq('id', weekId).single()
  if (!currentWeek) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  const nextWeekNum = currentWeek.week_number >= 52 ? 1 : currentWeek.week_number + 1
  const nextYear = currentWeek.week_number >= 52 ? currentWeek.year + 1 : currentWeek.year
  const { start, end } = getWeekDates(nextYear, nextWeekNum)

  const { data: nextWeek, error: nextWeekError } = await db
    .from('weeks')
    .insert({
      week_number: nextWeekNum,
      year: nextYear,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      type: 'push',
      status: 'active',
    })
    .select().single()

  if (nextWeekError) return NextResponse.json({ error: nextWeekError.message }, { status: 500 })

  // 4. Set base scores for next week
  const { error: baseError } = await db.from('player_week_base').insert(
    rankings.map(r => ({
      week_id: nextWeek.id,
      player_id: r.player_id,
      base_score: r.base_score_next_week,
    }))
  )
  if (baseError) return NextResponse.json({ error: baseError.message }, { status: 500 })

  return NextResponse.json({ ok: true, nextWeekId: nextWeek.id })
}
