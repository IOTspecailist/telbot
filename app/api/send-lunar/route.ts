import { NextRequest, NextResponse } from 'next/server'
import KoreanLunarCalendar from 'korean-lunar-calendar'
import { sendTelegramMessage } from '@/lib/telegram'

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

  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()

  const cal = new KoreanLunarCalendar()
  cal.setSolarDate(y, m, d)
  const lunar = cal.getLunarCalendar()

  const intercalation = lunar.intercalation ? ' (윤달)' : ''
  const message = `🌙 <b>오늘의 음력</b>\n양력 ${y}년 ${m}월 ${d}일\n음력 ${lunar.year}년 ${lunar.month}월 ${lunar.day}일${intercalation}`

  await sendTelegramMessage(message)
  return NextResponse.json({ ok: true })
}
