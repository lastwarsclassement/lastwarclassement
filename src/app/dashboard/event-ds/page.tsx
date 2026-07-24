import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import EventDsClient from '@/components/EventDsClient'
import type { EventDsSignup, EventDsAssignment } from '@/types'

export const dynamic = 'force-dynamic'

export default async function EventDsPage() {
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

  let signups: EventDsSignup[] = []
  let assignments: EventDsAssignment[] = []

  if (activeWeek) {
    const [s, a] = await Promise.all([
      db.from('event_ds_signups').select('*').eq('week_id', activeWeek.id),
      db.from('event_ds_assignments').select('*').eq('week_id', activeWeek.id),
    ])
    signups = s.data || []
    assignments = a.data || []
  }

  return (
    <EventDsClient
      profile={profile}
      players={players || []}
      activeWeek={activeWeek}
      signups={signups}
      assignments={assignments}
    />
  )
}
