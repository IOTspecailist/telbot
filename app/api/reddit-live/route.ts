import { NextResponse } from 'next/server'

interface RedditPost {
  title: string
  url: string
  score: number
  subreddit: string
  numComments: number
}

interface RedditChild {
  data: {
    title: string
    url: string
    score: number
    subreddit: string
    permalink: string
    num_comments: number
    stickied: boolean
  }
}

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

// ── JSON 방식 (old.reddit.com) ─────────────────────────
async function fetchJSON(sub: string, limit: number): Promise<RedditPost[]> {
  const res = await fetch(`https://old.reddit.com/r/${sub}/hot.json?limit=${limit + 5}`, {
    headers: HEADERS,
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`JSON HTTP ${res.status}`)
  const json = await res.json()
  return (json.data.children as RedditChild[])
    .filter(c => !c.data.stickied)
    .slice(0, limit)
    .map(c => ({
      title: c.data.title,
      url: `https://www.reddit.com${c.data.permalink}`,
      score: c.data.score,
      subreddit: c.data.subreddit,
      numComments: c.data.num_comments,
    }))
}

// ── RSS 방식 (폴백) ────────────────────────────────────
function extractTag(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  if (!m) return ''
  const raw = m[1]
  const cdata = raw.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  return (cdata ? cdata[1] : raw)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim()
}

function parseRSS(xml: string, limit: number): RedditPost[] {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[0])
  return items
    .slice(0, limit)
    .map(item => {
      const title = extractTag(item, 'title')
      const guid  = extractTag(item, 'guid')
      const link  = extractTag(item, 'link')
      const url   = guid.startsWith('http') ? guid : link
      const subredditMatch = url.match(/\/r\/([^/]+)\//)
      return {
        title,
        url,
        score: 0,
        subreddit: subredditMatch?.[1] ?? '',
        numComments: 0,
      }
    })
    .filter(p => p.title && p.url)
}

async function fetchRSS(sub: string, limit: number): Promise<RedditPost[]> {
  const res = await fetch(`https://www.reddit.com/r/${sub}/hot.rss`, {
    headers: { ...HEADERS, Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`RSS HTTP ${res.status}`)
  const xml = await res.text()
  const posts = parseRSS(xml, limit)
  if (posts.length === 0) throw new Error('RSS: no posts parsed')
  return posts
}

// ── 폴백 체인: old.reddit JSON → RSS ──────────────────
async function fetchSubreddit(sub: string, limit = 15): Promise<RedditPost[]> {
  try {
    return await fetchJSON(sub, limit)
  } catch (jsonErr) {
    try {
      return await fetchRSS(sub, limit)
    } catch (rssErr) {
      throw new Error(`JSON: ${jsonErr} | RSS: ${rssErr}`)
    }
  }
}

export async function GET() {
  const subs = [
    { id: 'popular',    name: 'r/popular' },
    { id: 'worldnews',  name: 'r/worldnews' },
    { id: 'technology', name: 'r/technology' },
  ]

  const results = await Promise.allSettled(subs.map(s => fetchSubreddit(s.id)))

  const data = subs.map((s, i) => ({
    id: s.id,
    name: s.name,
    siteUrl: `https://www.reddit.com/r/${s.id}/`,
    posts: results[i].status === 'fulfilled' ? results[i].value : [],
    error: results[i].status === 'rejected' || (results[i].status === 'fulfilled' && results[i].value.length === 0),
    _reason: results[i].status === 'rejected' ? String((results[i] as PromiseRejectedResult).reason) : undefined,
  }))

  return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
}
