import { createClient } from '@/lib/supabase/server'
import { getAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = getAdmin()

  const { data: profile } = await db.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const [{ data: players }, { data: profiles }] = await Promise.all([
    db.from('players').select('*').order('display_name'),
    db.from('profiles').select('*').order('username'),
  ])

  return (
    <UsersClient
      players={players || []}
      profiles={profiles || []}
      currentProfile={profile}
    />
  )
}
