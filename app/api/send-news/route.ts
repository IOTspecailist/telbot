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
  const { keyword, siteId, captchaToken } = await req.json()

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

  const source = NEWS_SOURCES[siteId]
  if (!source) {
    return NextResponse.json({ error: 'Unknown news source' }, { status: 400 })
  }

  // 버튼 클릭 시각 기준 3일 전 (UTC 타임스탬프 비교이므로 KST 무관하게 정확함)
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 3)

  let article
  try {
    article = await source.fetchLatest(keyword.trim(), fromDate)
  } catch (e) {
    console.error('[send-news] fetchLatest error:', e)
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }

  try {
    if (!article) {
      await sendTelegramMessage(
        `🔍 <b>[${source.name}]</b> "${escapeHtml(keyword)}" 관련 최근 3일 기사 없음`
      )
      return NextResponse.json({ ok: true, found: false })
    }

    await sendTelegramMessage(
      `📰 <b>[${source.name}]</b> "${escapeHtml(keyword)}" 최신 기사\n\n` +
        `${escapeHtml(article.title)}\n${escapeHtml(article.link)}`
    )
    return NextResponse.json({ ok: true, found: true })
  } catch (e) {
    console.error('[send-news] sendTelegramMessage error:', e)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
