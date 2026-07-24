import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import SeasonEventsClient from '@/components/SeasonEventsClient'
import type { SeasonEvent, SeasonEventResponse } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SeasonEventsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = getAdmin()

  const [
    { data: profile },
    { data: players },
    { data: activeWeek },
  ] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).single(),
    db.from('players').select('*').eq('is_active', true).order('display_name'),
    db.from('weeks').select('*').eq('status', 'active').maybeSingle(),
  ])

  let events: SeasonEvent[] = []
  let responses: SeasonEventResponse[] = []

  if (activeWeek) {
    const { data: ev } = await db
      .from('season_events')
      .select('*')
      .eq('week_id', activeWeek.id)
      .order('event_date')
      .order('event_time')
    events = ev || []

    if (events.length) {
      const { data: r } = await db
        .from('season_event_responses')
        .select('*')
        .in('event_id', events.map(e => e.id))
      responses = r || []
    }
  }

  return (
    <SeasonEventsClient
      profile={profile}
      players={players || []}
      activeWeek={activeWeek}
      events={events}
      responses={responses}
    />
  )
}
