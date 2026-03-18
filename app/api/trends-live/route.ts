import { NextResponse } from 'next/server'

const COUNTRIES = [
  { code: 'KR', flag: '🇰🇷', name: '한국' },
  { code: 'US', flag: '🇺🇸', name: '미국' },
  { code: 'JP', flag: '🇯🇵', name: '일본' },
]

async function fetchTrends(geo: string): Promise<{ title: string; traffic: string }[]> {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`, {
    signal: AbortSignal.timeout(8000),
  })
  const xml = await res.text()
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1])
  return items
    .map(item => {
      const cdataTitle = item.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/)
      const plainTitle = item.match(/<title>(.+?)<\/title>/)
      const title = cdataTitle?.[1] ?? plainTitle?.[1]?.trim() ?? ''
      const traffic = item.match(/<ht:approx_traffic>([^<]+)<\/ht:approx_traffic>/)?.[1] ?? ''
      return { title, traffic }
    })
    .filter(t => t.title)
}

export async function GET() {
  try {
    const data = await Promise.all(
      COUNTRIES.map(async c => ({
        ...c,
        trends: await fetchTrends(c.code),
      }))
    )
    return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[trends-live]', e)
    return NextResponse.json({ error: 'Failed to fetch trends' }, { status: 500 })
  }
}
