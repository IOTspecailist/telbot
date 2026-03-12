import KoreanLunarCalendar from 'korean-lunar-calendar'
import { sendTelegramMessage } from '../telegram'
import { buildXTrendsMessage } from './x-trends'

const WMO_CODES: Record<number, string> = {
  0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림',
  45: '안개', 48: '안개',
  51: '이슬비', 53: '이슬비', 55: '이슬비',
  61: '비', 63: '비', 65: '강한 비',
  71: '눈', 73: '눈', 75: '강한 눈',
  80: '소나기', 81: '소나기', 82: '강한 소나기',
  95: '뇌우', 96: '뇌우', 99: '뇌우',
}

function dustGrade(pm10: number, pm25: number): string {
  const grade = (val: number, thresholds: number[]) =>
    val <= thresholds[0] ? '좋음' : val <= thresholds[1] ? '보통' : val <= thresholds[2] ? '나쁨' : '매우나쁨'
  return `미세먼지 ${pm10}㎍(${grade(pm10, [30, 80, 150])}) / 초미세먼지 ${pm25}㎍(${grade(pm25, [15, 35, 75])})`
}

export async function fetchSeoulWeather(): Promise<string> {
  try {
    const [weatherRes, airRes] = await Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code&timezone=Asia/Seoul', { signal: AbortSignal.timeout(5000) }),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=37.5665&longitude=126.9780&current=pm10,pm2_5&timezone=Asia/Seoul', { signal: AbortSignal.timeout(5000) }),
    ])
    const [weather, air] = await Promise.all([weatherRes.json(), airRes.json()])
    const c = weather.current
    const desc = WMO_CODES[c.weather_code] ?? '알 수 없음'
    const temp = Math.round(c.temperature_2m)
    const feelsLike = Math.round(c.apparent_temperature)
    const humidity = c.relative_humidity_2m
    const pm10 = Math.round(air.current.pm10)
    const pm25 = Math.round(air.current.pm2_5)
    return `🌤 <b>서울 날씨</b>: ${desc} ${temp}°C (체감 ${feelsLike}°C) 💧${humidity}%\n🌫 ${dustGrade(pm10, pm25)}\n`
  } catch {
    return ''
  }
}

export function getLunarDateMessage(): string {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  const cal = new KoreanLunarCalendar()
  cal.setSolarDate(y, m, d)
  const lunar = cal.getLunarCalendar()
  const intercalation = lunar.intercalation ? ' (윤달)' : ''
  return `🌙 음력 ${lunar.year}년 ${lunar.month}월 ${lunar.day}일${intercalation}\n`
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

  const cdataMatches = [...xml.matchAll(/<item>[\s\S]*?<title><!\[CDATA\[(.+?)\]\]><\/title>/g)]
  if (cdataMatches.length > 0) {
    return cdataMatches.slice(0, 3).map(m => m[1])
  }

  const itemMatches = [...xml.matchAll(/<item>[\s\S]*?<title>(.+?)<\/title>/g)]
  return itemMatches.slice(0, 3).map(m => m[1].trim())
}

async function buildTrendsMessage(today: string): Promise<string> {
  let message = `📊 <b>구글 트렌드 TOP 3</b> (${today})\n`
  for (const country of COUNTRIES) {
    const trends = await fetchTrends(country.code)
    message += `\n${country.flag} <b>${country.name}</b>\n`
    trends.forEach((keyword, i) => {
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(keyword)}`
      message += `${i + 1}. <a href="${searchUrl}">${keyword}</a>\n`
    })
  }
  return message
}

export async function sendTrendsOnly(): Promise<void> {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Seoul',
  })
  const message = await buildTrendsMessage(today)
  await sendTelegramMessage(message)
}

export async function sendDailyGoogleLink(): Promise<void> {
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Seoul',
  })

  const [weather, trends, xTrends] = await Promise.all([
    fetchSeoulWeather(),
    buildTrendsMessage(today),
    buildXTrendsMessage().catch(() => ''),
  ])
  const lunar = getLunarDateMessage()

  await sendTelegramMessage(`${weather}${lunar}\n${trends}\n${xTrends}`)
}
