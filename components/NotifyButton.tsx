'use client'

import { useState } from 'react'
import type { NotificationId } from '@/lib/notifications'

interface Props {
  type: NotificationId
  label: string
  captchaToken: string
  onAfterSend?: () => void
}

export default function NotifyButton({ type, label, captchaToken, onAfterSend }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  async function handleClick() {
    setStatus('sending')
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, captchaToken }),
      })
      setStatus(res.ok ? 'ok' : 'error')
      if (res.ok) onAfterSend?.()
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const label_map = {
    idle: label,
    sending: '전송 중…',
    ok: '✅ 전송 완료',
    error: '❌ 전송 실패',
  }

  return (
    <button
      onClick={handleClick}
      disabled={status === 'sending'}
      data-status={status}
      className="notify-btn"
    >
      {label_map[status]}
    </button>
  )
}
