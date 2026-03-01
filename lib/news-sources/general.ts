import type { NewsSource, Article } from '.'

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
    const source = extractTag(raw, 'source')
    // 제목 끝의 " - 출처명" 제거
    const title = extractTag(raw, 'title').replace(/\s*-\s*[^-]+$/, '').trim()
    const link = extractTag(raw, 'link') || extractTag(raw, 'guid')
    const pubDate = extractTag(raw, 'pubDate')
    if (!title || !link || !pubDate) continue
    const parsed = new Date(pubDate)
    if (!isNaN(parsed.getTime())) {
      items.push({ title, link, pubDate: parsed, source })
    }
  }
  return items
}

export const general: NewsSource = {
  id: 'general',
  name: '구글뉴스',
  async fetchTop(keyword, fromDate, limit) {
    const url = `${GOOGLE_NEWS_SEARCH}?q=${encodeURIComponent(keyword)}&hl=ko&gl=KR&ceid=KR:ko`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`)
    const xml = await res.text()
    return parseItems(xml)
      .filter(a => a.pubDate >= fromDate)
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
      .slice(0, limit)
  },
}
