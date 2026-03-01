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

  const sources = Object.values(NEWS_SOURCES)
  const results = await Promise.allSettled(
    sources.map(s => s.fetchLatest(keyword.trim(), fromDate))
  )

  const lines: string[] = [`📰 <b>"${escapeHtml(keyword)}" 최신 기사</b>`]
  let anyFound = false

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    const result = results[i]
    const article = result.status === 'fulfilled' ? result.value : null
    const displayName = article?.source ?? source.name

    lines.push(`\n🔹 <b>${escapeHtml(displayName)}</b>`)

    if (result.status === 'rejected') {
      console.error(`[send-news] ${source.id} fetchLatest error:`, result.reason)
      lines.push('조회 실패')
    } else if (!article) {
      lines.push('최근 3일 기사 없음')
    } else {
      lines.push(escapeHtml(article.title))
      lines.push(escapeHtml(article.link))
      anyFound = true
    }
  }

  try {
    await sendTelegramMessage(lines.join('\n'))
    return NextResponse.json({ ok: true, found: anyFound })
  } catch (e) {
    console.error('[send-news] sendTelegramMessage error:', e)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
