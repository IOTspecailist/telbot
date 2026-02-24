'use client'

import { useRef, useState } from 'react'
import NotifyButton from './NotifyButton'
import WeatherButton from './WeatherButton'
import TurnstileWidget, { type TurnstileHandle } from './TurnstileWidget'

export default function MainPanel() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)

  function handleAfterSend() {
    setCaptchaToken(null)
    turnstileRef.current?.reset()
  }

  return (
    <>
      <div className={captchaToken ? 'captcha-widget-hidden' : 'captcha-section'}>
        {!captchaToken && <p className="captcha-hint">사람임을 먼저 인증해주세요</p>}
        <TurnstileWidget ref={turnstileRef} onTokenChange={setCaptchaToken} />
      </div>

      {captchaToken && (
        <section className="notify-section">
          <NotifyButton
            type="test"
            label="🧪 테스트 알림 전송"
            captchaToken={captchaToken}
            onAfterSend={handleAfterSend}
          />
          <NotifyButton
            type="server-error"
            label="🚨 서버 오류 알림 전송"
            captchaToken={captchaToken}
            onAfterSend={handleAfterSend}
          />
          <NotifyButton
            type="log-test"
            label="📋 로그 테스트"
            captchaToken={captchaToken}
            onAfterSend={handleAfterSend}
          />
          <WeatherButton captchaToken={captchaToken} onAfterSend={handleAfterSend} />
        </section>
      )}
    </>
  )
}
