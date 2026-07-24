import { NextResponse } from 'next/server'
import { getAdmin, getSessionUser } from '@/lib/admin'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getAdmin()

  const { data: profile } = await db.from('profiles').select('role, player_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ visible: false, pending: 0 })

  const isAdmin = profile.role === 'admin'

  let isActivePlayer = false
  if (profile.player_id) {
    const { data: player } = await db.from('players').select('is_active').eq('id', profile.player_id).single()
    isActivePlayer = !!player?.is_active
  }

  const visible = isAdmin || isActivePlayer

  let pending = 0
  if (isActivePlayer) {
    const { data: activeWeek } = await db.from('weeks').select('id').eq('status', 'active').maybeSingle()
    if (activeWeek) {
      const { data: events } = await db.from('season_events').select('id').eq('week_id', activeWeek.id)
      if (events?.length) {
        const { data: responses } = await db
          .from('season_event_responses')
          .select('event_id, validated')
          .eq('player_id', profile.player_id)
          .in('event_id', events.map(e => e.id))

        const validatedIds = new Set((responses ?? []).filter(r => r.validated).map(r => r.event_id))
        pending = events.filter(e => !validatedIds.has(e.id)).length
      }
    }
  }

  return NextResponse.json({ visible, pending })
}
