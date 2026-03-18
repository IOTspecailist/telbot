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

interface ApiResponse {
  data: CountryTrends[]
  fetchedAt: string
}

export default function TrendsPage() {
  const [result, setResult] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/trends-live')
      if (!res.ok) throw new Error()
      setResult(await res.json())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const fetchedTime = result?.fetchedAt
    ? new Date(result.fetchedAt).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  return (
    <main className="trends-container">
      <header className="trends-header">
        <div className="trends-header-top">
          <Link href="/" className="trends-back">← 돌아가기</Link>
          <button onClick={load} disabled={loading} className="trends-refresh">
            {loading ? '로딩 중…' : '새로고침'}
          </button>
        </div>
        <h1 className="page-title">구글 실시간 트렌드</h1>
        {fetchedTime && <p className="page-sub">기준 {fetchedTime} KST</p>}
      </header>

      {error && <p className="trends-error">데이터를 불러오지 못했습니다.</p>}

      {!error && (
        <div className="trends-grid">
          {(result?.data ?? [{}, {}, {}]).map((country, ci) => (
            <section key={ci} className="trends-card">
              <div className="trends-card-header">
                <span className="trends-flag">{(country as CountryTrends).flag ?? ''}</span>
                <span className="trends-country-name">{(country as CountryTrends).name ?? ''}</span>
              </div>
              <ol className="trends-list">
                {loading
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
    </main>
  )
}
