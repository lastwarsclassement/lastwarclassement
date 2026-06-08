import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

  const { weekId, contributions } = await req.json() as {
    weekId: string
    contributions: { player_id: string; tier: 1 | 2 | 3; points: number }[]
  }

  if (contributions.length !== 30) {
    return NextResponse.json({ error: 'Exactly 30 players required (10 per tier)' }, { status: 400 })
  }

  // Delete existing contributions for this week before re-inserting
  await supabase.from('weekly_contributions').delete().eq('week_id', weekId)

  const { error } = await supabase.from('weekly_contributions').insert(
    contributions.map(c => ({ ...c, week_id: weekId }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
