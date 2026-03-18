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

// Request extra items to account for stickied posts being filtered out
async function fetchSubreddit(sub: string, limit = 15): Promise<RedditPost[]> {
  const res = await fetch(`https://www.reddit.com/r/${sub}.json?limit=${limit + 5}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
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
