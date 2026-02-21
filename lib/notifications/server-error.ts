import { sendTelegramMessage } from '../telegram'

export async function sendServerErrorNotification(): Promise<void> {
  await sendTelegramMessage('🚨 서버에서 오류가 발생했습니다.')
}
