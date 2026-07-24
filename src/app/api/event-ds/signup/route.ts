import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, getSessionUser } from '@/lib/admin'
import type { EventDsStatus } from '@/types'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, t1Power, eventAStatus, eventBStatus, vocal, validated } = await req.json() as {
    weekId: string
    t1Power: number | null
    eventAStatus: EventDsStatus
    eventBStatus: EventDsStatus
    vocal: boolean
    validated: boolean
  }

  const invalidCombo =
    (eventAStatus === 'present' && eventBStatus !== 'absent') ||
    (eventBStatus === 'present' && eventAStatus !== 'absent')
  if (invalidCombo) {
    return NextResponse.json({ error: 'Présent à un event impose absent à l\'autre' }, { status: 400 })
  }

  const db = getAdmin()

  const { data: profile } = await db.from('profiles').select('player_id').eq('id', user.id).single()
  if (!profile?.player_id) return NextResponse.json({ error: 'Aucun joueur lié à ce compte' }, { status: 403 })

  const { data: player } = await db.from('players').select('is_active').eq('id', profile.player_id).single()
  if (!player?.is_active) return NextResponse.json({ error: 'Joueur inactif' }, { status: 403 })

  const { error } = await db.from('event_ds_signups').upsert({
    week_id: weekId,
    player_id: profile.player_id,
    t1_power: t1Power,
    event_a_status: eventAStatus,
    event_b_status: eventBStatus,
    vocal,
    validated,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'week_id,player_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
