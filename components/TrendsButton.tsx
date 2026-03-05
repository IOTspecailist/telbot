'use client'

import { useState } from 'react'

interface Props {
  captchaToken: string
  onAfterSend?: () => void
}

type Status = 'idle' | 'sending' | 'ok' | 'error'

export default function TrendsButton({ captchaToken, onAfterSend }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  async function handleClick() {
    setStatus('sending')
    try {
      const res = await fetch('/api/send-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captchaToken }),
      })
      setStatus(res.ok ? 'ok' : 'error')
      if (res.ok) onAfterSend?.()
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const btnLabel: Record<Status, string> = {
    idle: '📊 구글 트렌드 TOP3 전송',
    sending: '가져오는 중…',
    ok: '✅ 전송 완료',
    error: '❌ 오류',
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'sending'}
      data-status={status}
      className="notify-btn"
    >
      {btnLabel[status]}
    </button>
  )
}
