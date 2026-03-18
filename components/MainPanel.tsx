'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import NotifyButton from './NotifyButton'
import WeatherButton from './WeatherButton'
import NewsButton from './NewsButton'
import TrendsButton from './TrendsButton'
import SeoulWeatherButton from './SeoulWeatherButton'
import LunarButton from './LunarButton'
import XTrendsButton from './XTrendsButton'
import TopicTrendsButton from './TopicTrendsButton'
import TurnstileWidget, { type TurnstileHandle } from './TurnstileWidget'
import { NEWS_SOURCES } from '@/lib/news-sources'

const sourceNames = Object.values(NEWS_SOURCES).map(s => s.name)

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
        <>
          <section className="notify-section">
            <span className="panel-section-label">페이지</span>
            <Link href="/trends" className="notify-btn notify-btn-nav">
              📈 실시간 급상승 트렌드
            </Link>
          </section>

          <section className="notify-section">
            <span className="panel-section-label">텔레그램 발송</span>
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
            <TrendsButton captchaToken={captchaToken} onAfterSend={handleAfterSend} />
            <SeoulWeatherButton captchaToken={captchaToken} onAfterSend={handleAfterSend} />
            <LunarButton captchaToken={captchaToken} onAfterSend={handleAfterSend} />
            <XTrendsButton captchaToken={captchaToken} onAfterSend={handleAfterSend} />
            <TopicTrendsButton captchaToken={captchaToken} onAfterSend={handleAfterSend} />
          </section>

          <section className="news-section">
            <div className="news-section-header">
              <span className="news-section-title">뉴스 검색</span>
              <span className="news-source-tags">
                {sourceNames.map(name => (
                  <span key={name} className="news-source-tag">{name}</span>
                ))}
              </span>
            </div>
            <NewsButton
              label="검색"
              captchaToken={captchaToken}
              onAfterSend={handleAfterSend}
            />
          </section>
        </>
      )}
    </>
  )
}
