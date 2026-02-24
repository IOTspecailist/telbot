'use client'

import { useState } from 'react'

interface Props {
  captchaToken: string
  onAfterSend?: () => void
}

type Status = 'idle' | 'locating' | 'sending' | 'ok' | 'error'

export default function WeatherButton({ captchaToken, onAfterSend }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  async function handleClick() {
    setStatus('locating')

    let lat: number, lon: number
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      lat = pos.coords.latitude
      lon = pos.coords.longitude
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/send-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, captchaToken }),
      })
      setStatus(res.ok ? 'ok' : 'error')
      if (res.ok) onAfterSend?.()
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const label_map: Record<Status, string> = {
    idle: '🌤️ 현재 날씨 전송',
    locating: '📍 위치 확인 중…',
    sending: '전송 중…',
    ok: '✅ 전송 완료',
    error: '❌ 전송 실패',
  }

  return (
    <button
      onClick={handleClick}
      disabled={status !== 'idle'}
      data-status={status}
      className="notify-btn"
    >
      {label_map[status]}
    </button>
  )
}
