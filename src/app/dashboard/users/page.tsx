import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const [{ data: players }, { data: profiles }] = await Promise.all([
    adminClient.from('players').select('*').order('display_name'),
    adminClient.from('profiles').select('*').order('username'),
  ])

  return (
    <UsersClient
      players={players || []}
      profiles={profiles || []}
      currentProfile={profile}
    />
  )
}
