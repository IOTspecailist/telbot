'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

interface Trend {
  title: string
  traffic: string
}

interface CountryTrends {
  code: string
  flag: string
  name: string
  trends: Trend[]
}

interface GoogleApiResponse {
  data: CountryTrends[]
  fetchedAt: string
}

interface ZumTrendItem {
  keyword: string
  delta: number
  direction: string
}

interface ZumApiResponse {
  data: ZumTrendItem[]
  fetchedAt: string
}

interface CommunityPost {
  title: string
  url: string
}

interface CommunityData {
  id: string
  name: string
  siteUrl: string
  posts: CommunityPost[]
  error?: boolean
}

interface CommunityApiResponse {
  data: CommunityData[]
  fetchedAt: string
}

interface XApiResponse {
  data: string[]
  fetchedAt: string
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
  error?: boolean
}

interface HNApiResponse {
  data: HNSection[]
  fetchedAt: string
}

function directionMark(direction: string, delta: number) {
  if (direction === 'up') return <span className="zum-up">▲ {Math.abs(delta)}</span>
  if (direction === 'down') return <span className="zum-down">▼ {Math.abs(delta)}</span>
  return <span className="zum-eq">—</span>
}

const COMMUNITY_EMOJI: Record<string, string> = {
  fmkorea: '⚽',
  theqoo:  '🐣',
  ruliweb: '🎮',
}

export default function TrendsPage() {
  const [google, setGoogle] = useState<GoogleApiResponse | null>(null)
  const [zum, setZum] = useState<ZumApiResponse | null>(null)
  const [community, setCommunity] = useState<CommunityApiResponse | null>(null)
  const [xTrends, setXTrends] = useState<XApiResponse | null>(null)
  const [hn, setHn] = useState<HNApiResponse | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [zumLoading, setZumLoading] = useState(true)
  const [communityLoading, setCommunityLoading] = useState(true)
  const [xLoading, setXLoading] = useState(true)
  const [hnLoading, setHnLoading] = useState(true)
  const [googleError, setGoogleError] = useState(false)
  const [zumError, setZumError] = useState(false)
  const [xError, setXError] = useState(false)

  const loadGoogle = useCallback(async () => {
    setGoogleLoading(true)
    setGoogleError(false)
    try {
      const res = await fetch('/api/trends-live')
      if (!res.ok) throw new Error()
      setGoogle(await res.json())
    } catch {
      setGoogleError(true)
    } finally {
      setGoogleLoading(false)
    }
  }, [])

  const loadZum = useCallback(async () => {
    setZumLoading(true)
    setZumError(false)
    try {
      const res = await fetch('/api/zum-trends')
      if (!res.ok) throw new Error()
      setZum(await res.json())
    } catch {
      setZumError(true)
    } finally {
      setZumLoading(false)
    }
  }, [])

  const loadCommunity = useCallback(async () => {
    setCommunityLoading(true)
    try {
      const res = await fetch('/api/community-live')
      if (!res.ok) throw new Error()
      setCommunity(await res.json())
    } catch {
      setCommunity(null)
    } finally {
      setCommunityLoading(false)
    }
  }, [])

  const loadXTrends = useCallback(async () => {
    setXLoading(true)
    setXError(false)
    try {
      const res = await fetch('/api/x-trends-live')
      if (!res.ok) throw new Error()
      setXTrends(await res.json())
    } catch {
      setXError(true)
    } finally {
      setXLoading(false)
    }
  }, [])

  const loadHN = useCallback(async () => {
    setHnLoading(true)
    try {
      const res = await fetch('/api/hn-live')
      if (!res.ok) throw new Error()
      setHn(await res.json())
    } catch {
      setHn(null)
    } finally {
      setHnLoading(false)
    }
  }, [])

  useEffect(() => {
    loadGoogle()
    loadZum()
    loadCommunity()
    loadXTrends()
    loadHN()
  }, [loadGoogle, loadZum, loadCommunity, loadXTrends, loadHN])

  function handleRefresh() {
    loadGoogle()
    loadZum()
    loadCommunity()
    loadXTrends()
    loadHN()
  }

  const loading = googleLoading || zumLoading || communityLoading || xLoading || hnLoading

  const fetchedTime = (google?.fetchedAt ?? zum?.fetchedAt ?? community?.fetchedAt)
    ? new Date((google?.fetchedAt ?? zum?.fetchedAt ?? community?.fetchedAt)!).toLocaleTimeString('ko-KR', {
        timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit',
      })
    : null

  return (
    <main className="trends-container">
      <header className="trends-header">
        <div className="trends-header-top">
          <Link href="/" className="trends-back">← 돌아가기</Link>
          <button onClick={handleRefresh} disabled={loading} className="trends-refresh">
            {loading ? '로딩 중…' : '새로고침'}
          </button>
        </div>
        <h1 className="page-title">실시간 트렌드</h1>
        {fetchedTime && <p className="page-sub">기준 {fetchedTime} KST</p>}
      </header>

      {/* 구글 급상승 */}
      <div className="trends-section-label">📈 구글 급상승 검색어</div>
      {googleError && <p className="trends-error">데이터를 불러오지 못했습니다.</p>}
      {!googleError && (
        <div className="trends-grid" style={{ marginBottom: '1.25rem' }}>
          {(google?.data ?? [{}, {}, {}]).map((country, ci) => (
            <section key={ci} className="trends-card">
              <div className="trends-card-header">
                <span className="trends-flag">{(country as CountryTrends).flag ?? ''}</span>
                <span className="trends-country-name">{(country as CountryTrends).name ?? ''}</span>
              </div>
              <ol className="trends-list">
                {googleLoading
                  ? Array.from({ length: 10 }).map((_, i) => (
                      <li key={i} className="trends-item trends-skeleton">
                        <span className="trends-rank">{i + 1}</span>
                        <span className="trends-title-placeholder" />
                      </li>
                    ))
                  : (country as CountryTrends).trends?.slice(0, 10).map((t, i) => (
                      <li key={i} className="trends-item">
                        <span className="trends-rank">{i + 1}</span>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(t.title)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="trends-title"
                        >
                          {t.title}
                        </a>
                        {t.traffic && <span className="trends-traffic">{t.traffic}</span>}
                      </li>
                    ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {/* 나무위키 링크 버튼 */}
      <div className="namu-links">
        <a href="https://namu.wiki/" target="_blank" rel="noopener noreferrer" className="namu-btn">
          나무위키
        </a>
        <a href="https://arca.live/b/namuhotnow/" target="_blank" rel="noopener noreferrer" className="namu-btn">
          나무위키 실검이유
        </a>
      </div>

      {/* 커뮤니티 실시간 이슈 */}
      <div className="trends-section-label">💬 커뮤니티 실시간 이슈</div>
      <div className="trends-grid community-grid">
        {(community?.data ?? [{}, {}, {}]).map((site, ci) => {
          const s = site as CommunityData
          const id = s.id ?? `skeleton-${ci}`
          const emoji = COMMUNITY_EMOJI[id] ?? '📋'
          return (
            <section key={ci} className="trends-card">
              <div className="trends-card-header">
                <span className="trends-flag">{emoji}</span>
                <span className="trends-country-name">
                  {s.name
                    ? <a href={s.siteUrl} target="_blank" rel="noopener noreferrer" className="community-site-link">{s.name}</a>
                    : ''}
                </span>
              </div>
              {s.error ? (
                <p className="trends-error" style={{ padding: '0.5rem 0' }}>
                  데이터를 불러오지 못했습니다.{' '}
                  <a href={s.siteUrl} target="_blank" rel="noopener noreferrer" className="community-error-link">바로가기 →</a>
                </p>
              ) : (
                <ol className="trends-list community-list">
                  {communityLoading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <li key={i} className="trends-item trends-skeleton">
                          <span className="trends-rank">{i + 1}</span>
                          <span className="trends-title-placeholder" />
                        </li>
                      ))
                    : s.posts?.slice(0, 15).map((post, i) => (
                        <li key={i} className="trends-item">
                          <span className="trends-rank">{i + 1}</span>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="trends-title community-post-title"
                            title={post.title}
                          >
                            {post.title}
                          </a>
                        </li>
                      ))}
                </ol>
              )}
            </section>
          )
        })}
      </div>

      {/* 줌 실시간 검색어 */}
      <section className="trends-card trends-zum-section">
        <div className="trends-card-header">
          <span className="trends-country-name">🔥 줌(zum) 실시간 검색어</span>
        </div>
        {zumError ? (
          <p className="trends-error" style={{ padding: '0.5rem 0' }}>데이터를 불러오지 못했습니다.</p>
        ) : (
          <ol className="zum-list">
            {zumLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <li key={i} className="zum-item trends-skeleton">
                    <span className="trends-rank">{i + 1}</span>
                    <span className="trends-title-placeholder" style={{ height: '0.65rem', flex: 1, borderRadius: 3 }} />
                  </li>
                ))
              : zum?.data.map((t, i) => (
                  <li key={i} className="zum-item">
                    <span className="trends-rank">{i + 1}</span>
                    <a
                      href={`https://search.zum.com/search.zum?method=uni&option=acjson&query=${encodeURIComponent(t.keyword)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trends-title"
                    >
                      {t.keyword}
                    </a>
                    {directionMark(t.direction, t.delta)}
                  </li>
                ))}
          </ol>
        )}
      </section>

      {/* X 트렌드 */}
      <section className="trends-card trends-zum-section">
        <div className="trends-card-header">
          <span className="trends-country-name">🐦 X(트위터) 한국 트렌드</span>
        </div>
        {xError ? (
          <p className="trends-error" style={{ padding: '0.5rem 0' }}>데이터를 불러오지 못했습니다.</p>
        ) : (
          <ol className="zum-list">
            {xLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <li key={i} className="zum-item trends-skeleton">
                    <span className="trends-rank">{i + 1}</span>
                    <span className="trends-title-placeholder" style={{ height: '0.65rem', flex: 1, borderRadius: 3 }} />
                  </li>
                ))
              : xTrends?.data.map((topic, i) => (
                  <li key={i} className="zum-item">
                    <span className="trends-rank">{i + 1}</span>
                    <a
                      href={`https://x.com/search?q=${encodeURIComponent(topic)}&src=trend_click`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="trends-title"
                    >
                      {topic}
                    </a>
                  </li>
                ))}
          </ol>
        )}
      </section>

      {/* Hacker News */}
      <div className="trends-section-label">Hacker News</div>
      <div className="trends-grid community-grid">
        {(hn?.data ?? [{}, {}, {}]).map((section, ci) => {
          const s = section as HNSection
          return (
            <section key={ci} className="trends-card">
              <div className="trends-card-header">
                <span className="trends-country-name">
                  {s.name
                    ? <a href={s.siteUrl} target="_blank" rel="noopener noreferrer" className="community-site-link">{s.name}</a>
                    : ''}
                </span>
              </div>
              {s.error ? (
                <p className="trends-error" style={{ padding: '0.5rem 0' }}>
                  데이터를 불러오지 못했습니다.{' '}
                  <a href={s.siteUrl} target="_blank" rel="noopener noreferrer" className="community-error-link">바로가기 →</a>
                </p>
              ) : (
                <ol className="trends-list community-list">
                  {hnLoading
                    ? Array.from({ length: 10 }).map((_, i) => (
                        <li key={i} className="trends-item trends-skeleton">
                          <span className="trends-rank">{i + 1}</span>
                          <span className="trends-title-placeholder" />
                        </li>
                      ))
                    : s.posts?.map((post, i) => (
                        <li key={i} className="trends-item">
                          <span className="trends-rank">{i + 1}</span>
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="trends-title community-post-title"
                            title={post.title}
                          >
                            {post.title}
                          </a>
                          <span className="trends-traffic">▲{post.points.toLocaleString()}</span>
                        </li>
                      ))}
                </ol>
              )}
            </section>
          )
        })}
      </div>

    </main>
  )
}
