import type { NewsSource, Article } from '.'

// 한경 RSS 직접 접근이 Vercel IP에서 403 차단됨 → Google News 검색으로 대체
const GOOGLE_NEWS_SEARCH = 'https://news.google.com/rss/search'

function extractTag(xml: string, tag: string): string {
  const cdata = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`).exec(xml)
  if (cdata) return cdata[1].trim()
  const plain = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`).exec(xml)
  return plain?.[1]?.trim() ?? ''
}

function parseItems(xml: string): Article[] {
  const items: Article[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const raw = match[1]
    // Google News 제목 끝의 " - 한국경제" 제거
    const title = extractTag(raw, 'title').replace(/\s*-\s*한국경제\s*$/, '').trim()
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
    const url = `${GOOGLE_NEWS_SEARCH}?q=${encodeURIComponent(keyword)}+site:hankyung.com&hl=ko&gl=KR&ceid=KR:ko`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`News search failed: ${res.status}`)
    const xml = await res.text()
    const items = parseItems(xml)
    return (
      items
        .filter(a => a.pubDate >= fromDate)
        .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())[0] ?? null
    )
  },
}
