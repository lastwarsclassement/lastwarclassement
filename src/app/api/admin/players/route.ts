import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, requireAdmin } from '@/lib/admin'
import { toEmailFormat } from '@/lib/utils'

const DEMO_NAMES = [
  'DragonSlayer','IronWolf','ShadowBlade','ThunderKing','NightHunter',
  'StormBreaker','CrimsonFox','GhostRider','SilverArrow','DarkPhoenix',
  'BladeRunner','FireStorm','IceDragon','VoidWalker','StarCrusher',
  'DeathBringer','SoulReaper','WarMachine','BattleLord','ChaosKnight',
  'TitanFall','RavenClaw','ViperStrike','CobraKing','FalconEye',
  'WolfPack','LionHeart','EagleWing','BearClaw','TigerBlood',
  'PhoenixRise','DragonFire','ShadowKing','NightBlade','DawnBreaker',
  'MoonWolf','SunStrike','StarBorn','CosmicRay','NebulaDrift',
  'QuantumLeap','CyberPunk','NeonGhost','DataStream','ByteCode',
  'PixelKnight','VoxelWar','MatrixBreak','GridLock','NullPointer',
  'RedViking','BlueSamurai','GreenNinja','GoldPaladin','SilverMage',
  'IronMonk','CopperBard','BronzeGuard','TitanShield','AdamantRune',
  'CrystalSword','ObsidianBow','MithrilSpear','EbonyAxe','IvoryStaff',
  'AncientKing','LostSoul','ForgottenOne','LastHero','FinalBoss',
  'AlphaWolf','BetaTest','GammaBurst','DeltaForce','EpsilonRise',
  'OmegaStrike','SigmaBlaze','ZetaSpeed','EtaFlash','ThetaWave',
  'KappaKing','LambdaLight','MuMaster','NuNight','XiXenon',
  'OmicronOmega','PiProtector','RhoRaider','TauTracker','PhiFighter',
  'UpsilonUnit','ChiChampion','PsiPower','OmegaOne','AlphaOne',
  'BlazeMaster','FrostByte','ThunderBolt','SteelFang','AshKnight',
]

// POST bulk: Add 100 demo players
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminClient = getAdmin()

  const demoPlayers = DEMO_NAMES.map((name, i) => ({
    username: `demo_${name.toLowerCase()}`,
    display_name: name,
    birth_date: `${1985 + (i % 25)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
    is_active: true,
  }))

  const { data, error } = await adminClient
    .from('players')
    .upsert(demoPlayers, { onConflict: 'username', ignoreDuplicates: true })
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, count: data?.length ?? 0 })
}

// POST: Add a new player (+ optional account)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { displayName, username, birthdate, createAccount, password, role } = await req.json()

  if (!displayName || !username || !birthdate) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 })
  }

  const accountRole: 'admin' | 'reader' = role === 'admin' ? 'admin' : 'reader'

  const adminClient = getAdmin()

  const { count } = await adminClient
    .from('players')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const isActive = (count ?? 0) < 100

  // Create player (inactive if active slots full)
  const { data: player, error: playerError } = await adminClient
    .from('players')
    .insert({ username, display_name: displayName, birth_date: birthdate, is_active: isActive })
    .select()
    .single()

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 400 })
  }

  // Create auth account + profile
  if (!password) {
    return NextResponse.json({ error: 'PASSWORD_REQUIRED' }, { status: 400 })
  }

  const email = toEmailFormat(username)
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, role: accountRole, player_id: player.id },
  })

  if (authError) {
    // Player was created — roll it back before returning the error
    await adminClient.from('players').delete().eq('id', player.id)
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  // Ensure profile exists (upsert guards against trigger double-insert)
  if (authData?.user) {
    await adminClient.from('profiles').upsert({
      id: authData.user.id,
      username,
      role: accountRole,
      player_id: player.id,
    }, { onConflict: 'id' })
  }

  return NextResponse.json({ ok: true, player, isActive })
}

// DELETE demo players (username starts with demo_)
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { playerId, userId, deleteDemo } = body
  const adminClient = getAdmin()

  if (deleteDemo) {
    const { data: demoPlayers } = await adminClient
      .from('players')
      .select('id')
      .like('username', 'demo_%')

    if (demoPlayers?.length) {
      // Delete linked auth accounts first
      const { data: demoProfiles } = await adminClient
        .from('profiles')
        .select('id')
        .in('player_id', demoPlayers.map(p => p.id))

      for (const p of demoProfiles ?? []) {
        await adminClient.auth.admin.deleteUser(p.id)
      }

      const { error } = await adminClient
        .from('players')
        .delete()
        .like('username', 'demo_%')

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: demoPlayers?.length ?? 0 })
  }

  if (playerId) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('player_id', playerId)
      .maybeSingle()

    const { error: playerError } = await adminClient
      .from('players')
      .delete()
      .eq('id', playerId)

    if (playerError) return NextResponse.json({ error: playerError.message }, { status: 500 })

    if (profile?.id) {
      await adminClient.auth.admin.deleteUser(profile.id)
    }

    return NextResponse.json({ ok: true })
  }

  if (userId) {
    const { error } = await adminClient.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'playerId, userId or deleteDemo required' }, { status: 400 })
}

// PATCH: Toggle player active status or update player
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { playerId, isActive, displayName, birthdate } = await req.json()

  const adminClient = getAdmin()

  // Block reactivation if already at 100 active players
  if (isActive === true) {
    const { count } = await adminClient
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
    if ((count ?? 0) >= 100) {
      return NextResponse.json({ error: 'MAX_PLAYERS_REACHED' }, { status: 400 })
    }
  }

  const update: Record<string, unknown> = {}
  if (typeof isActive === 'boolean') update.is_active = isActive
  if (displayName) update.display_name = displayName
  if (birthdate) update.birth_date = birthdate

  const { error } = await adminClient.from('players').update(update).eq('id', playerId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

