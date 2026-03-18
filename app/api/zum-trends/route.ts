import { NextResponse } from 'next/server'

interface ZumTrend {
  keyword: string
  delta: number
  directionClass: string
}

export async function GET() {
  try {
    const res = await fetch('https://www.zum.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(8000),
    })
    const html = await res.text()

    const match = html.match(/"issueTrends":(\[[\s\S]*?\])\s*[,}]/)
    if (!match) return NextResponse.json({ error: 'Parse failed' }, { status: 500 })

    const trends: ZumTrend[] = JSON.parse(match[1])
    const data = trends.slice(0, 20).map(t => ({
      keyword: t.keyword,
      delta: t.delta,
      direction: t.directionClass,
    }))

    return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[zum-trends]', e)
    return NextResponse.json({ error: 'Failed to fetch zum trends' }, { status: 500 })
  }
}
