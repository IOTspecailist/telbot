import { sendTelegramMessage } from '../telegram'

const WMO_CODES: Record<number, string> = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '안개',
  51: '이슬비', 53: '이슬비', 55: '이슬비',
  61: '비', 63: '비', 65: '강한 비',
  71: '눈', 73: '눈', 75: '강한 눈',
  80: '소나기', 81: '소나기', 82: '강한 소나기',
  95: '뇌우', 96: '뇌우', 99: '뇌우',
}

export async function fetchSeoulWeather(): Promise<string> {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=Asia/Seoul'
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()
    const c = data.current
    const desc = WMO_CODES[c.weather_code] ?? '알 수 없음'
    const temp = Math.round(c.temperature_2m)
    const feelsLike = Math.round(c.apparent_temperature)
    const humidity = c.relative_humidity_2m
    return `🌤 <b>서울 날씨</b>: ${desc} ${temp}°C (체감 ${feelsLike}°C) 💧${humidity}%\n`
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
