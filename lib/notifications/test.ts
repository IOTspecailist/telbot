import { sendTelegramMessage } from '../telegram'

export async function sendTestNotification(): Promise<void> {
  await sendTelegramMessage('🧪 테스트 알림입니다.')
}
