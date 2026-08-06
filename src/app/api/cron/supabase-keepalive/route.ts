import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/admin'

// Called daily by Vercel Cron (see vercel.json) so Supabase sees activity
// and never auto-pauses the free-tier project after 7 idle days.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getAdmin()
  const { error } = await db.from('weeks').select('id').limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() })
}
