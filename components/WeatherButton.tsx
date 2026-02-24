'use client'

import { useState } from 'react'

interface Props {
  captchaToken: string
  onAfterSend?: () => void
}

type Status = 'idle' | 'locating' | 'sending' | 'ok' | 'error'

export default function WeatherButton({ captchaToken, onAfterSend }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string>('❌ 전송 실패')

  function fail(msg: string) {
    setErrorMsg(msg)
    setStatus('error')
    setTimeout(() => setStatus('idle'), 4000)
  }

  async function handleClick() {
    setStatus('locating')

    let lat: number, lon: number
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      )
      lat = pos.coords.latitude
      lon = pos.coords.longitude
    } catch (e) {
      const code = (e as GeolocationPositionError).code
      if (code === 1) fail('❌ 위치 권한이 거부됨')
      else if (code === 2) fail('❌ 위치를 확인할 수 없음')
      else if (code === 3) fail('❌ 위치 확인 시간 초과')
      else fail('❌ 위치 확인 실패')
      return
    }

    setStatus('sending')
    try {
      const res = await fetch('/api/send-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, captchaToken }),
      })
      if (res.ok) {
        setStatus('ok')
        onAfterSend?.()
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        fail('❌ 전송 실패')
      }
    } catch {
      fail('❌ 네트워크 오류')
    }
  }

  const label_map: Record<Status, string> = {
    idle: '🌤️ 현재 날씨 전송',
    locating: '📍 위치 확인 중…',
    sending: '전송 중…',
    ok: '✅ 전송 완료',
    error: errorMsg,
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
