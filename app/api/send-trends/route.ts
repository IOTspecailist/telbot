import { NextRequest, NextResponse } from 'next/server'
import { sendTrendsOnly } from '@/lib/notifications/daily-google'

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: process.env.TURNSTILE_SECRET_KEY,
      response: token,
    }),
  })
  const data = await res.json()
  return data.success === true
}

export async function POST(req: NextRequest) {
  const { captchaToken } = await req.json()

  if (!captchaToken) {
    return NextResponse.json({ error: 'Missing captcha token' }, { status: 400 })
  }

  const isHuman = await verifyTurnstile(captchaToken)
  if (!isHuman) {
    return NextResponse.json({ error: 'Captcha verification failed' }, { status: 403 })
  }

  try {
    await sendTrendsOnly()
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[send-trends] error:', e)
    return NextResponse.json({ error: 'Failed to send trends' }, { status: 500 })
  }
}
