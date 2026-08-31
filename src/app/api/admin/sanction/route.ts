import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'

export async function POST(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { weekId, playerIds, points } = await req.json() as {
    weekId: string
    playerIds: string[]
    points: number
  }

  const amount = Math.abs(points ?? 5)
  if (!amount) return NextResponse.json({ error: 'Invalid points value' }, { status: 400 })

  const db = getAdmin()
  const { error } = await db.from('sanctions').insert(
    playerIds.map(id => ({
      week_id: weekId,
      player_id: id,
      points: -amount,
    }))
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sanctionId } = await req.json() as { sanctionId: string }
  if (!sanctionId) return NextResponse.json({ error: 'Missing sanctionId' }, { status: 400 })

  const db = getAdmin()
  const { error } = await db.from('sanctions').delete().eq('id', sanctionId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
