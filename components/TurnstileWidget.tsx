'use client'

import { useEffect, useImperativeHandle, useRef, forwardRef } from 'react'

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, params: object) => string
      reset: (widgetId: string) => void
    }
  }
}

interface Props {
  onTokenChange: (token: string | null) => void
}

export interface TurnstileHandle {
  reset: () => void
}

const TurnstileWidget = forwardRef<TurnstileHandle, Props>(function TurnstileWidget(
  { onTokenChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const callbackRef = useRef(onTokenChange)

  useEffect(() => {
    callbackRef.current = onTokenChange
  })

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
    },
  }))

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!
    let retryTimer: ReturnType<typeof setTimeout>

    function tryRender() {
      if (!containerRef.current || widgetIdRef.current) return
      if (typeof window !== 'undefined' && window.turnstile) {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => callbackRef.current(token),
          'expired-callback': () => callbackRef.current(null),
          'error-callback': () => callbackRef.current(null),
        })
      } else {
        retryTimer = setTimeout(tryRender, 100)
      }
    }

    tryRender()

    return () => {
      clearTimeout(retryTimer)
      widgetIdRef.current = null
    }
  }, [])

  return <div ref={containerRef} />
})

export default TurnstileWidget
