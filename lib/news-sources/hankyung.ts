import type { NewsSource, Article } from '.'

const RSS_URL = 'https://www.hankyung.com/feed/all-news'

function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(xml)
  if (cdata) return cdata[1].trim()
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml)
  return plain?.[1]?.trim() ?? ''
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function parseItems(xml: string): Article[] {
  const items: Article[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const raw = match[1]
    const title = decodeHtmlEntities(extractTag(raw, 'title'))
    const link = extractTag(raw, 'link') || extractTag(raw, 'guid')
    const pubDate = extractTag(raw, 'pubDate')
    if (!title || !link || !pubDate) continue
    const parsed = new Date(pubDate)
    if (!isNaN(parsed.getTime())) {
      items.push({ title, link, pubDate: parsed })
    }
  }
  return items
}

export const hankyung: NewsSource = {
  id: 'hankyung',
  name: '한국경제',
  async fetchLatest(keyword, fromDate) {
    const res = await fetch(RSS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      cache: 'no-store',
    })
    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
    const xml = await res.text()
    const items = parseItems(xml)
    return (
      items
        .filter(a => a.title.includes(keyword) && a.pubDate >= fromDate)
        .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())[0] ?? null
    )
  },
}
