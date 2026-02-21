'use client'

import { useState } from 'react'
import NotifyButton from './NotifyButton'
import TurnstileWidget from './TurnstileWidget'

export default function MainPanel() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)

  return (
    <>
      <div className={captchaToken ? 'captcha-widget-hidden' : 'captcha-section'}>
        {!captchaToken && <p className="captcha-hint">사람임을 먼저 인증해주세요</p>}
        <TurnstileWidget onTokenChange={setCaptchaToken} />
      </div>

      {captchaToken && (
        <section className="notify-section">
          <NotifyButton
            type="test"
            label="🧪 테스트 알림 전송"
            captchaToken={captchaToken}
          />
          <NotifyButton
            type="server-error"
            label="🚨 서버 오류 알림 전송"
            captchaToken={captchaToken}
          />
        </section>
      )}
    </>
  )
}
