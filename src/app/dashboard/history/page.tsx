import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryClient from '@/components/HistoryClient'
import type { WeeklyRanking } from '@/types'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: profile },
    { data: weeks },
    { data: players },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('weeks').select('*').eq('status', 'validated').order('year', { ascending: false }).order('week_number', { ascending: false }),
    supabase.from('players').select('*').eq('is_active', true),
  ])

  let rankings: Record<string, WeeklyRanking[]> = {}
  if (weeks && weeks.length > 0) {
    const { data: allRankings } = await supabase
      .from('weekly_rankings')
      .select('*')
      .in('week_id', weeks.map(w => w.id))
      .order('rank')

    if (allRankings) {
      for (const r of allRankings) {
        if (!rankings[r.week_id]) rankings[r.week_id] = []
        rankings[r.week_id].push(r)
      }
    }
  }

  return (
    <HistoryClient
      profile={profile}
      weeks={weeks || []}
      players={players || []}
      rankings={rankings}
    />
  )
}
