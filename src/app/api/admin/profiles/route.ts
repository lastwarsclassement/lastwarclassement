import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { profileId, role, password, playerId } = await req.json()
  if (!profileId) return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })

  const db = getAdmin()

  if (role) {
    const { error } = await db.from('profiles').update({ role }).eq('id', profileId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (playerId !== undefined) {
    const { error } = await db.from('profiles').update({ player_id: playerId }).eq('id', profileId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (password) {
    const { error } = await db.auth.admin.updateUserById(profileId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
