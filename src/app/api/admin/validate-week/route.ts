import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeekNumber, getWeekDates } from '@/lib/scoring'
import type { PlayerRole } from '@/types'

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

  // 1. Save rankings
  const { error: rankError } = await supabase.from('weekly_rankings').upsert(
    rankings.map(r => ({ ...r, week_id: weekId })),
    { onConflict: 'week_id,player_id' }
  )
  if (rankError) return NextResponse.json({ error: rankError.message }, { status: 500 })

  // 2. Mark week as validated
  const { error: weekError } = await supabase
    .from('weeks')
    .update({ status: 'validated' })
    .eq('id', weekId)
  if (weekError) return NextResponse.json({ error: weekError.message }, { status: 500 })

  // 3. Create next week
  const { data: currentWeek } = await supabase.from('weeks').select('*').eq('id', weekId).single()
  if (!currentWeek) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  const nextWeekNum = currentWeek.week_number === 52 ? 1 : currentWeek.week_number + 1
  const nextYear = currentWeek.week_number === 52 ? currentWeek.year + 1 : currentWeek.year
  const { start, end } = getWeekDates(nextYear, nextWeekNum)

  const { data: nextWeek, error: nextWeekError } = await supabase
    .from('weeks')
    .insert({
      week_number: nextWeekNum,
      year: nextYear,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      type: 'push',
      status: 'active',
    })
    .select()
    .single()

  if (nextWeekError) return NextResponse.json({ error: nextWeekError.message }, { status: 500 })

  // 4. Set base scores for next week
  const { error: baseError } = await supabase.from('player_week_base').insert(
    rankings.map(r => ({
      week_id: nextWeek.id,
      player_id: r.player_id,
      base_score: r.base_score_next_week,
    }))
  )
  if (baseError) return NextResponse.json({ error: baseError.message }, { status: 500 })

  return NextResponse.json({ ok: true, nextWeekId: nextWeek.id })
}
