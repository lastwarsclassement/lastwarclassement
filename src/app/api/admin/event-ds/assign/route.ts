import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'
import type { EventDsEvent } from '@/types'

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, roleKey, slotIndex, event, playerId } = await req.json() as {
    weekId: string
    roleKey: string
    slotIndex: number
    event: EventDsEvent
    playerId: string | null
  }

  const db = getAdmin()

  const { error } = await db.from('event_ds_assignments').upsert({
    week_id: weekId,
    role_key: roleKey,
    slot_index: slotIndex,
    event,
    player_id: playerId,
  }, { onConflict: 'week_id,role_key,slot_index,event' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
