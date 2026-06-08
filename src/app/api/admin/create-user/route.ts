import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { toEmailFormat } from '@/lib/utils'

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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
  }

  const { username, displayName, password, role, birthdate, playerId } = await req.json()

  if (!username || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const email = toEmailFormat(username)

  // If reader: create/update player record first
  let finalPlayerId = playerId || null

  if (role === 'reader' && !finalPlayerId) {
    const { data: newPlayer, error: playerError } = await adminSupabase
      .from('players')
      .insert({
        username: username.trim(),
        display_name: displayName || username.trim(),
        birth_date: birthdate,
        is_active: true,
      })
      .select()
      .single()

    if (playerError) {
      // If player already exists, fetch it
      const { data: existing } = await adminSupabase
        .from('players')
        .select('id')
        .eq('username', username.trim())
        .single()
      finalPlayerId = existing?.id || null
    } else {
      finalPlayerId = newPlayer.id
    }
  }

  // Create auth user
  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      username: username.trim(),
      role,
      player_id: finalPlayerId,
    },
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Update player birth_date if provided and player exists
  if (finalPlayerId && birthdate) {
    await adminSupabase
      .from('players')
      .update({ birth_date: birthdate })
      .eq('id', finalPlayerId)
  }

  return NextResponse.json({ ok: true, userId: authData.user.id })
}
