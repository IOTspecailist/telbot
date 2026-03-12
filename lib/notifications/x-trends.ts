import { sendTelegramMessage } from '../telegram'

async function fetchXTrends(): Promise<string[]> {
  const res = await fetch('https://trends24.in/korea/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  const html = await res.text()

  // trends24.in: trend items are in <a> tags inside .trend-card__list li elements
  const matches = [...html.matchAll(/<ol[^>]*class=["']?[^"'>]*trend-card__list[^"'>]*["']?[^>]*>([\s\S]*?)<\/ol>/g)]
  if (matches.length === 0) throw new Error('트렌드 파싱 실패')

  // First ol is the most recent (current hour)
  const listHtml = matches[0][1]
  const items = [...listHtml.matchAll(/<a[^>]*>([^<]+)<\/a>/g)]
  return items.slice(0, 10).map(m => m[1].trim()).filter(Boolean)
}

export async function sendXTrends(): Promise<void> {
  const trends = await fetchXTrends()
  if (trends.length === 0) throw new Error('트렌드를 가져올 수 없습니다')

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Seoul',
  })

  let message = `🐦 <b>X(트위터) 한국 트렌드 TOP 10</b> (${today})\n\n`
  trends.forEach((topic, i) => {
    const url = `https://x.com/search?q=${encodeURIComponent(topic)}&src=trend_click`
    message += `${i + 1}. <a href="${url}">${topic}</a>\n`
  })

  await sendTelegramMessage(message)
}
