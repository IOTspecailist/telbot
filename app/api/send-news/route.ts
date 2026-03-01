import { NextRequest, NextResponse } from 'next/server'
import { NEWS_SOURCES } from '@/lib/news-sources'
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(req: NextRequest) {
  const { keyword, captchaToken } = await req.json()

  if (!captchaToken) {
    return NextResponse.json({ error: 'Missing captcha token' }, { status: 400 })
  }

  const isHuman = await verifyTurnstile(captchaToken)
  if (!isHuman) {
    return NextResponse.json({ error: 'Captcha verification failed' }, { status: 403 })
  }

  if (!keyword?.trim()) {
    return NextResponse.json({ error: 'Invalid keyword' }, { status: 400 })
  }

  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 3)

  const source = NEWS_SOURCES.general
  let articles
  try {
    articles = await source.fetchTop(keyword.trim(), fromDate, 5)
  } catch (e) {
    console.error('[send-news] fetchTop error:', e)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }

  if (articles.length === 0) {
    return NextResponse.json({ ok: true, found: false })
  }

  const lines: string[] = [`📰 <b>"${escapeHtml(keyword)}" 최신 기사</b>`]
  articles.forEach((a, i) => {
    const publisher = escapeHtml(a.source ?? '')
    const title = escapeHtml(a.title)
    lines.push(`${i + 1}. ${publisher ? `${publisher} · ` : ''}<a href="${a.link}">${title}</a>`)
  })

  try {
    await sendTelegramMessage(lines.join('\n'))
    return NextResponse.json({ ok: true, found: true })
  } catch (e) {
    console.error('[send-news] sendTelegramMessage error:', e)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
