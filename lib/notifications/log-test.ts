import { sendTelegramMessage } from '../telegram'

export async function sendLogTestNotification(): Promise<void> {
  await sendTelegramMessage('로그 테스트중')
}
