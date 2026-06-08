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

  const { weekId, playerIds, points } = await req.json() as {
    weekId: string
    playerIds: string[]
    points: number
  }

  const { error } = await supabase.from('sanctions').insert(
    playerIds.map(id => ({
      week_id: weekId,
      player_id: id,
      points: points ?? -5,
    }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
