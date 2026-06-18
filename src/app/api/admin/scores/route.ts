import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'
import { computeBatchPoints } from '@/lib/scoring'
import type { WeekType } from '@/types'

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, weekType, date, isSunday, entries } = await req.json() as {
    weekId: string
    weekType: WeekType
    date: string
    isSunday: boolean
    entries: { player_id: string; score: number }[]
  }

  const db = getAdmin()

  if (isSunday) {
    const upserts = entries.map(e => ({
      week_id: weekId,
      player_id: e.player_id,
      score_date: date,
      vs_score: null,
      contribution_score: e.score,
      points_earned: 0,
      week_type: weekType,
    }))
    const { error } = await db.from('daily_scores').upsert(upserts, { onConflict: 'week_id,player_id,score_date' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const vsEntries = entries.map(e => ({ player_id: e.player_id, vs_score: e.score }))
  const pointsMap = computeBatchPoints(vsEntries, weekType, date)

  const upserts = entries.map(e => ({
    week_id: weekId,
    player_id: e.player_id,
    score_date: date,
    vs_score: e.score,
    contribution_score: null,
    points_earned: pointsMap.get(e.player_id) ?? 0,
    week_type: weekType,
  }))

  const { error } = await db.from('daily_scores').upsert(upserts, { onConflict: 'week_id,player_id,score_date' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: upserts.length })
}
