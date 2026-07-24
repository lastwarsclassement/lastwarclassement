import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, name, eventDate, eventTime } = await req.json() as {
    weekId: string
    name: string
    eventDate: string
    eventTime: string
  }

  if (!weekId || !name || !eventDate || !eventTime) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  const db = getAdmin()
  const { data, error } = await db.from('season_events').insert({
    week_id: weekId,
    name,
    event_date: eventDate,
    event_time: eventTime,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ event: data })
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId, name, eventDate, eventTime } = await req.json() as {
    eventId: string
    name: string
    eventDate: string
    eventTime: string
  }

  if (!eventId) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })

  const db = getAdmin()
  const { error } = await db.from('season_events').update({
    name,
    event_date: eventDate,
    event_time: eventTime,
  }).eq('id', eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { eventId } = await req.json() as { eventId: string }
  if (!eventId) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })

  const db = getAdmin()
  const { error } = await db.from('season_events').delete().eq('id', eventId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
