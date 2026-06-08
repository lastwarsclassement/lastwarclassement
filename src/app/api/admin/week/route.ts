import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWeekNumber, getWeekDates } from '@/lib/scoring'

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'admin' ? user : null
}

// POST: Start a new week
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerIds } = await req.json()

  const { week, year } = getCurrentWeekNumber()
  const { start, end } = getWeekDates(year, week)

  const { data: existingWeek } = await supabase
    .from('weeks')
    .select('id')
    .eq('week_number', week)
    .eq('year', year)
    .maybeSingle()

  if (existingWeek) {
    return NextResponse.json({ error: 'Week already exists' }, { status: 400 })
  }

  const { data: newWeek, error } = await supabase
    .from('weeks')
    .insert({
      week_number: week,
      year,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      type: 'push',
      status: 'active',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Initialize base scores to 0 for all players (first week)
  // For subsequent weeks, base scores come from validate-week
  if (playerIds?.length) {
    await supabase.from('player_week_base').insert(
      playerIds.map((id: string) => ({
        week_id: newWeek.id,
        player_id: id,
        base_score: 0,
      }))
    )
  }

  return NextResponse.json({ week: newWeek })
}

// PATCH: Update week type or status
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { weekId, type, status } = body

  const update: Record<string, string> = {}
  if (type) update.type = type
  if (status) update.status = status

  const { error } = await supabase.from('weeks').update(update).eq('id', weekId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
