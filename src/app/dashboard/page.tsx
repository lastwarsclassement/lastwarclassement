import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: players },
    { data: activeWeek },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('players').select('*').eq('is_active', true).order('display_name'),
    supabase.from('weeks').select('*').eq('status', 'active').maybeSingle(),
  ])

  let dailyScores = null
  let sanctions = null
  let baseScores = null
  let weekRankings = null

  if (activeWeek) {
    const [ds, s, pwb] = await Promise.all([
      supabase.from('daily_scores').select('*').eq('week_id', activeWeek.id),
      supabase.from('sanctions').select('*').eq('week_id', activeWeek.id),
      supabase.from('player_week_base').select('*').eq('week_id', activeWeek.id),
    ])
    dailyScores = ds.data
    sanctions = s.data
    baseScores = pwb.data

    if (activeWeek.status === 'validated') {
      const { data: wr } = await supabase
        .from('weekly_rankings')
        .select('*')
        .eq('week_id', activeWeek.id)
        .order('rank')
      weekRankings = wr
    }
  }

  return (
    <DashboardClient
      currentUser={user}
      profile={profile}
      players={players || []}
      activeWeek={activeWeek}
      dailyScores={dailyScores || []}
      sanctions={sanctions || []}
      baseScores={baseScores || []}
      weekRankings={weekRankings || []}
    />
  )
}
