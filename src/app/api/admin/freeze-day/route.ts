import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'
import { computeBatchPoints, isSunday } from '@/lib/scoring'
import type { DayType } from '@/types'

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, date, freeze } = await req.json() as {
    weekId: string
    date: string
    freeze: boolean
  }

  if (isSunday(date)) {
    return NextResponse.json({ error: 'Cannot freeze Sunday' }, { status: 400 })
  }

  const db = getAdmin()
  const { data: week } = await db.from('weeks').select('*').eq('id', weekId).single()
  if (!week) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  const currentFrozen: string[] = week.frozen_dates ?? []
  const frozen_dates = freeze
    ? Array.from(new Set([...currentFrozen, date]))
    : currentFrozen.filter((d: string) => d !== date)

  const { error: weekError } = await db.from('weeks').update({ frozen_dates }).eq('id', weekId)
  if (weekError) return NextResponse.json({ error: weekError.message }, { status: 500 })

  // Recompute points for scores already entered on this date
  const { data: existing } = await db
    .from('daily_scores')
    .select('id, player_id, vs_score')
    .eq('week_id', weekId)
    .eq('score_date', date)
    .not('vs_score', 'is', null)

  if (existing?.length) {
    const newType: DayType = freeze ? 'gel' : week.type
    const entries = existing.map(e => ({ player_id: e.player_id, vs_score: e.vs_score as number }))
    const pointsMap = computeBatchPoints(entries, newType, date)

    const updateError = (await Promise.all(
      existing.map(e =>
        db.from('daily_scores')
          .update({ points_earned: pointsMap.get(e.player_id) ?? 0, week_type: newType })
          .eq('id', e.id)
      )
    )).find(r => r.error)?.error

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, frozen_dates })
}
