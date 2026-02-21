// ─── Notification Registry ───────────────────────────────────────────────────
// 새 알림 추가 방법:
//   1. lib/notifications/<name>.ts 파일 생성
//   2. 아래 import + handlers 객체에 한 줄씩 추가
// ─────────────────────────────────────────────────────────────────────────────

import { sendTestNotification } from './test'
import { sendServerErrorNotification } from './server-error'

export const notificationHandlers = {
  test: sendTestNotification,
  'server-error': sendServerErrorNotification,
} as const

export type NotificationId = keyof typeof notificationHandlers
