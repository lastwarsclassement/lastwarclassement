import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeBatchPoints } from '@/lib/scoring'
import type { WeekType } from '@/types'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, weekType, date, isSunday, entries } = await req.json() as {
    weekId: string
    weekType: WeekType
    date: string
    isSunday: boolean
    entries: { player_id: string; score: number }[]
  }

  if (isSunday) {
    // Store as contribution_score, no points calculation
    const upserts = entries.map(e => ({
      week_id: weekId,
      player_id: e.player_id,
      score_date: date,
      vs_score: null,
      contribution_score: e.score,
      points_earned: 0,
    }))

    const { error } = await supabase.from('daily_scores').upsert(upserts, {
      onConflict: 'week_id,player_id,score_date',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Calculate points for each player
  const vsEntries = entries.map(e => ({ player_id: e.player_id, vs_score: e.score }))
  const pointsMap = computeBatchPoints(vsEntries, weekType, date)

  const upserts = entries.map(e => ({
    week_id: weekId,
    player_id: e.player_id,
    score_date: date,
    vs_score: e.score,
    contribution_score: null,
    points_earned: pointsMap.get(e.player_id) ?? 0,
  }))

  const { error } = await supabase.from('daily_scores').upsert(upserts, {
    onConflict: 'week_id,player_id,score_date',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: upserts.length })
}
