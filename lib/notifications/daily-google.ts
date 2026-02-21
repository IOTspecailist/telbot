import { sendTelegramMessage } from '../telegram'

export async function sendDailyGoogleLink(): Promise<void> {
  await sendTelegramMessage('🌐 오늘의 링크\nhttps://www.google.com')
}
