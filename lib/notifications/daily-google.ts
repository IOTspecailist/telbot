import { sendTelegramMessage } from '../telegram'

export async function fetchSeoulWeather(): Promise<string> {
  try {
    const res = await fetch('https://wttr.in/Seoul?format=j1', {
      headers: { 'User-Agent': 'curl/7.68.0' },
    })
    const data = await res.json()
    const current = data.current_condition[0]
    const tempC = current.temp_C
    const desc = current.lang_ko?.[0]?.value ?? current.weatherDesc[0].value
    const humidity = current.humidity
    const feelsLike = current.FeelsLikeC
    return `🌤 <b>서울 날씨</b>: ${desc} ${tempC}°C (체감 ${feelsLike}°C) 💧${humidity}%\n`
  } catch {
    return ''
  }
}

const COUNTRIES = [
  { code: 'IN', flag: '🇮🇳', name: '인도' },
  { code: 'US', flag: '🇺🇸', name: '미국' },
  { code: 'BR', flag: '🇧🇷', name: '브라질' },
  { code: 'ID', flag: '🇮🇩', name: '인도네시아' },
  { code: 'GB', flag: '🇬🇧', name: '영국' },
  { code: 'JP', flag: '🇯🇵', name: '일본' },
  { code: 'KR', flag: '🇰🇷', name: '한국' },
]

async function fetchTrends(geo: string): Promise<string[]> {
  const res = await fetch(`https://trends.google.com/trending/rss?geo=${geo}`)
  const xml = await res.text()

  // CDATA 형식 파싱
  const cdataMatches = [...xml.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
  if (cdataMatches.length > 0) {
    return cdataMatches.slice(0, 3).map(m => m[1])
  }

  // fallback: 일반 title 태그
  const itemMatches = [...xml.matchAll(/<item>[\s\S]*?<title>(.+?)<\/title>/g)]
  return itemMatches.slice(0, 3).map(m => m[1].trim())
}

export async function sendDailyGoogleLink(): Promise<void> {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Seoul',
  })

  const weather = await fetchSeoulWeather()
  let message = `${weather}\n📊 <b>구글 트렌드 TOP 3</b> (${today})\n`

  for (const country of COUNTRIES) {
    const trends = await fetchTrends(country.code)
    message += `\n${country.flag} <b>${country.name}</b>\n`
    trends.forEach((keyword, i) => {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      message += `${i + 1}. <a href="${searchUrl}">${keyword}</a>\n`
    })
  }

  await sendTelegramMessage(message)
}
