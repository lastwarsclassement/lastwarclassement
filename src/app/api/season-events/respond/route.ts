import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, getSessionUser } from '@/lib/admin'
import type { SeasonEventStatus } from '@/types'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, status, validated } = await req.json() as {
    eventId: string
    status: SeasonEventStatus
    validated: boolean
  }

  const db = getAdmin()

  const { data: profile } = await db.from('profiles').select('player_id').eq('id', user.id).single()
  if (!profile?.player_id) return NextResponse.json({ error: 'Aucun joueur lié à ce compte' }, { status: 403 })

  const { data: player } = await db.from('players').select('is_active').eq('id', profile.player_id).single()
  if (!player?.is_active) return NextResponse.json({ error: 'Joueur inactif' }, { status: 403 })

  const { error } = await db.from('season_event_responses').upsert({
    event_id: eventId,
    player_id: profile.player_id,
    status,
    validated,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'event_id,player_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
