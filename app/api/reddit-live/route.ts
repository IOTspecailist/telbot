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
      'User-Agent': 'telbot-trends/1.0',
    },
    signal: AbortSignal.timeout(8000),
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
  }))

  return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
}
