import { NextRequest, NextResponse } from 'next/server'

// A bare hit on the REST root counts as activity for Supabase's pause check,
// so this works for any project from just its URL + key (no table lookup needed).
async function pingSupabase(url?: string, key?: string): Promise<boolean | null> {
  if (!url || !key) return null
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  return res.ok
}

// Called daily by Vercel Cron (see vercel.json) so Supabase sees activity
// and never auto-pauses the free-tier projects (prod + dev) after 7 idle days.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [prod, dev] = await Promise.all([
    pingSupabase(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY),
    pingSupabase(process.env.DEV_SUPABASE_URL, process.env.DEV_SUPABASE_SERVICE_ROLE_KEY),
  ])

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString(), prod, dev })
}
