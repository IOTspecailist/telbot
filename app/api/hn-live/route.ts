import { NextResponse } from 'next/server'

interface HNHit {
  title: string
  url: string | null
  objectID: string
  points: number
  num_comments: number
}

interface HNPost {
  title: string
  url: string
  points: number
  numComments: number
}

interface HNSection {
  id: string
  name: string
  siteUrl: string
  posts: HNPost[]
  error: boolean
}

const SECTIONS = [
  { id: 'top',  name: 'Top Stories', tag: 'front_page', limit: 15, site: 'https://news.ycombinator.com/' },
  { id: 'ask',  name: 'Ask HN',      tag: 'ask_hn',     limit: 10, site: 'https://news.ycombinator.com/ask' },
  { id: 'show', name: 'Show HN',     tag: 'show_hn',    limit: 10, site: 'https://news.ycombinator.com/show' },
]

async function fetchHN(tag: string, limit: number): Promise<HNPost[]> {
  const res = await fetch(
    `https://hn.algolia.com/api/v1/search?tags=${tag}&hitsPerPage=${limit}`,
    { cache: 'no-store', signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  return (json.hits as HNHit[]).map(hit => ({
    title: hit.title,
    url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
    points: hit.points ?? 0,
    numComments: hit.num_comments ?? 0,
  }))
}

export async function GET() {
  const results = await Promise.allSettled(
    SECTIONS.map(s => fetchHN(s.tag, s.limit))
  )

  const data: HNSection[] = SECTIONS.map((s, i) => ({
    id: s.id,
    name: s.name,
    siteUrl: s.site,
    posts: results[i].status === 'fulfilled' ? results[i].value : [],
    error: results[i].status === 'rejected' ||
           (results[i].status === 'fulfilled' && results[i].value.length === 0),
  }))

  return NextResponse.json({ data, fetchedAt: new Date().toISOString() })
}
