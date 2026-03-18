import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch('https://trends24.in/korea/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    const matches = [...html.matchAll(/<ol[^>]*class=["']?[^"'>]*trend-card__list[^"'>]*["']?[^>]*>([\s\S]*?)<\/ol>/g)]
    if (matches.length === 0) throw new Error('Parse failed')

    const listHtml = matches[0][1]
    const items = [...listHtml.matchAll(/<a[^>]*>([^<]+)<\/a>/g)]
    const data = items.slice(0, 10).map(m => m[1].trim()).filter(Boolean)

    return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[x-trends-live]', e)
    return NextResponse.json({ error: 'Failed to fetch X trends' }, { status: 500 })
  }
}
