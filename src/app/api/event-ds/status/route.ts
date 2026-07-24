import { NextResponse } from 'next/server'
import { getAdmin, getSessionUser } from '@/lib/admin'

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getAdmin()

  const { data: profile } = await db.from('profiles').select('role, player_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ visible: false, pending: false })

  const isAdmin = profile.role === 'admin'

  let isActivePlayer = false
  if (profile.player_id) {
    const { data: player } = await db.from('players').select('is_active').eq('id', profile.player_id).single()
    isActivePlayer = !!player?.is_active
  }

  const visible = isAdmin || isActivePlayer

  let pending = false
  if (isActivePlayer) {
    const { data: activeWeek } = await db.from('weeks').select('id').eq('status', 'active').maybeSingle()
    if (activeWeek) {
      const { data: signup } = await db
        .from('event_ds_signups')
        .select('validated')
        .eq('week_id', activeWeek.id)
        .eq('player_id', profile.player_id)
        .maybeSingle()
      pending = !signup?.validated
    }
  }

  return NextResponse.json({ visible, pending })
}
