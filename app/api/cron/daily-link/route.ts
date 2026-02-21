import { NextRequest, NextResponse } from 'next/server'
import { sendDailyGoogleLink } from '@/lib/notifications/daily-google'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await sendDailyGoogleLink()
  return NextResponse.json({ ok: true })
}
