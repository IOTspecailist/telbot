'use client'

import { useState } from 'react'

interface Props {
  label: string
  captchaToken: string
  onAfterSend?: () => void
}

type Status = 'idle' | 'sending' | 'ok' | 'not-found' | 'error'

export default function NewsButton({ label, captchaToken, onAfterSend }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [keyword, setKeyword] = useState('')

  async function handleClick() {
    if (!keyword.trim()) return
    setStatus('sending')
    try {
      const res = await fetch('/api/send-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, captchaToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus('error')
      } else {
        setStatus(data.found ? 'ok' : 'not-found')
        onAfterSend?.()
      }
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const btnLabel: Record<Status, string> = {
    idle: `📰 ${label}`,
    sending: '검색 중…',
    ok: '✅ 전송 완료',
    'not-found': '⚠️ 기사 없음',
    error: '❌ 오류',
  }

  return (
    <div className="news-row">
      <input
        type="text"
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleClick()}
        placeholder="검색어 입력"
        disabled={status === 'sending'}
        className="news-input"
      />
      <button
        onClick={handleClick}
        disabled={status === 'sending' || !keyword.trim()}
        data-status={status}
        className="notify-btn"
      >
        {btnLabel[status]}
      </button>
    </div>
  )
}
