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
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

// ── FMKorea ───────────────────────────────────────────────────────────────────
// Uses a 2-step cookie bypass: get the security page cookie, then retry
async function fetchFmkorea(): Promise<Post[]> {
  // Step 1: get security page and extract cookie value
  const secRes = await fetch('https://www.fmkorea.com/best', {
    headers: HEADERS,
    signal: AbortSignal.timeout(8000),
  })
  const secHtml = await secRes.text()

  const cookieM = secHtml.match(/escape\('([a-f0-9]{32})'\)/)
  if (!cookieM) throw new Error('Security cookie not found')
  const cookieVal = cookieM[1]

  // Step 2: retry with cookie set by the security page JS
  const res = await fetch('https://www.fmkorea.com/best?ddosCheckOnly=1', {
    headers: {
      ...HEADERS,
      Cookie: `lite_year=${cookieVal}; g_lite_year=${cookieVal}`,
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  if (html.includes('에펨코리아 보안 시스템')) throw new Error('Still blocked by WAF')

  // FMKorea XE CMS: <a class="title" href="/NUMERIC">TITLE</a>
  const posts: Post[] = []
  const seen = new Set<string>()
  const re = /<a\b([^>]{5,400})>([\s\S]{2,500}?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && posts.length < 15) {
    const attrs = m[1]
    if (!attrs.includes('class="title"') && !attrs.includes("class='title'")) continue
    const hrefM = attrs.match(/href="([^"]+)"/)
    if (!hrefM) continue
    const href = hrefM[1]
    if (!/^\/\d+/.test(href) || seen.has(href)) continue
    seen.add(href)
    const title = htmlEntities(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    if (!title || title.length < 2) continue
    posts.push({ title, url: href.startsWith('http') ? href : `https://www.fmkorea.com${href}` })
  }
  return posts
}

// ── TheQoo ────────────────────────────────────────────────────────────────────
async function fetchTheqoo(): Promise<Post[]> {
  const res = await fetch('https://theqoo.net/hot', {
    headers: { ...HEADERS, Referer: 'https://theqoo.net/' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const posts: Post[] = []
  const seen = new Set<string>()
  // Article links: /hot/NUMERIC (exact — no hash, no "category")
  const re = /<a\b([^>]{5,300})>([\s\S]{2,600}?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const attrs = m[1]
    const hrefM = attrs.match(/href="([^"]+)"/)
    if (!hrefM) continue
    const href = hrefM[1]
    if (!/^\/(hot|square)\/\d+$/.test(href) || seen.has(href)) continue
    seen.add(href)
    const title = htmlEntities(m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    if (!title || title.length < 2) continue
    posts.push({ title, url: `https://theqoo.net${href}` })
  }
  // Skip first 4 (공지글)
  return posts.slice(4, 19)
}

// ── Ruliweb ───────────────────────────────────────────────────────────────────
async function fetchRuliweb(): Promise<Post[]> {
  const res = await fetch('https://bbs.ruliweb.com/best', {
    headers: HEADERS,
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const posts: Post[] = []
  const seen = new Set<string>()
  // href="/best/board/300143/read/{id}?m=humor..." — class 속성 없음
  const re = /<a\b[^>]*href="(\/best\/board\/300143\/read\/\d+[^"]*)"[^>]*>([\s\S]*?)<\/a>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null && posts.length < 15) {
    const baseHref = m[1].split('?')[0]
    if (seen.has(baseHref)) continue
    seen.add(baseHref)
    // 태그 제거 후 앞 순위 숫자와 뒤 댓글수 (N) 제거
    const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    const title = htmlEntities(text.replace(/^\d+\s+/, '').replace(/\s*\(\d+\)\s*$/, '').trim())
    if (!title || title.length < 2) continue
    posts.push({ title, url: `https://bbs.ruliweb.com${baseHref}` })
  }
  return posts
}

// ── Route ─────────────────────────────────────────────────────────────────────
export async function GET() {
  const results = await Promise.allSettled([
    fetchFmkorea(),
    fetchTheqoo(),
    fetchRuliweb(),
  ])

  const meta = [
    { id: 'fmkorea', name: '에펨코리아', siteUrl: 'https://www.fmkorea.com/best' },
    { id: 'theqoo',  name: '더쿠',       siteUrl: 'https://theqoo.net/hot' },
    { id: 'ruliweb', name: '루리웹',     siteUrl: 'https://bbs.ruliweb.com/best/board/300143' },
  ]

  const data: Community[] = results.map((r, i) => ({
    ...meta[i],
    posts: r.status === 'fulfilled' ? r.value : [],
    error: r.status === 'rejected' || (r.status === 'fulfilled' && r.value.length === 0),
  }))

  return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
}
