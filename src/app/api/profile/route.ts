import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, getSessionUser } from '@/lib/admin'

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { password } = await req.json()
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'PASSWORD_TOO_SHORT' }, { status: 400 })
  }

  const db = getAdmin()
  const { error } = await db.auth.admin.updateUserById(user.id, { password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
