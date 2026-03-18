import { NextResponse } from 'next/server'

interface Post {
  title: string
  url: string
}

interface Community {
  id: string
  name: string
  siteUrl: string
  posts: Post[]
  error?: boolean
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
}

function htmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function extractPosts(html: string, tagFilter: (attrs: string) => boolean, hrefFilter: (href: string) => boolean, limit = 15): Post[] {
  const posts: Post[] = []
  const seen = new Set<string>()
  const tagRe = /<a\b([^>]{5,300})>([\s\S]{2,120}?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(html)) !== null && posts.length < limit) {
    const attrs = m[1]
    if (!tagFilter(attrs)) continue
    const hrefM = attrs.match(/href="([^"]+)"/) ?? attrs.match(/href='([^']+)'/)
    if (!hrefM) continue
    const href = hrefM[1]
    if (!hrefFilter(href) || seen.has(href)) continue
    seen.add(href)
    const title = htmlEntities(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    if (!title || title.length < 2) continue
    posts.push({ title, url: href })
  }
  return posts
}

async function fetchFmkorea(): Promise<Post[]> {
  const res = await fetch('https://www.fmkorea.com/best', {
    headers: HEADERS,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  // FMKorea XE CMS: article title links have class="title" and href="/NUMERIC"
  const posts = extractPosts(
    html,
    (attrs) => (attrs.includes('class="title"') || attrs.includes("class='title'")),
    (href) => /^\/\d+/.test(href),
  )
  // Make URLs absolute
  return posts.map(p => ({ ...p, url: p.url.startsWith('http') ? p.url : `https://www.fmkorea.com${p.url}` }))
}

async function fetchTheqoo(): Promise<Post[]> {
  const res = await fetch('https://theqoo.net/hot', {
    headers: { ...HEADERS, Referer: 'https://theqoo.net/' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  // TheQoo: article links href="/hot/NUMERIC" or "/square/NUMERIC"
  const posts = extractPosts(
    html,
    () => true,
    (href) => /^https?:\/\/theqoo\.net\/(hot|square)\/\d+|^\/(hot|square)\/\d+/.test(href),
  )
  return posts
    .map(p => ({
      title: p.title.replace(/\s*\[\d+\]\s*$/, '').trim(), // strip trailing comment count
      url: p.url.startsWith('http') ? p.url : `https://theqoo.net${p.url}`,
    }))
    .filter(p => p.title.length > 1)
}

async function fetchRuliweb(): Promise<Post[]> {
  const res = await fetch('https://bbs.ruliweb.com/best/board/300143', {
    headers: { ...HEADERS, Referer: 'https://bbs.ruliweb.com/' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  // Ruliweb: subject_link class
  const posts = extractPosts(
    html,
    (attrs) => attrs.includes('subject_link'),
    (href) => href.includes('ruliweb.com') || href.startsWith('/'),
  )
  return posts.map(p => ({
    ...p,
    url: p.url.startsWith('http') ? p.url : `https://bbs.ruliweb.com${p.url}`,
  }))
}

export async function GET() {
  const results = await Promise.allSettled([
    fetchFmkorea(),
    fetchTheqoo(),
    fetchRuliweb(),
  ])

  const meta = [
    { id: 'fmkorea', name: '에펨코리아', siteUrl: 'https://www.fmkorea.com/best' },
    { id: 'theqoo',  name: '더쿠',      siteUrl: 'https://theqoo.net/hot' },
    { id: 'ruliweb', name: '루리웹',    siteUrl: 'https://bbs.ruliweb.com/best/board/300143' },
  ]

  const data: Community[] = results.map((r, i) => ({
    ...meta[i],
    posts: r.status === 'fulfilled' ? r.value : [],
    error: r.status === 'rejected' || (r.status === 'fulfilled' && r.value.length === 0),
  }))

  return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
}
