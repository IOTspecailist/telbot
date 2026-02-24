import { sendTelegramMessage } from '../telegram'

interface OpenMeteoResponse {
  current: {
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    weather_code: number
    wind_speed_10m: number
  }
}

interface NominatimResponse {
  address: {
    city?: string
    town?: string
    village?: string
    suburb?: string
    neighbourhood?: string
    county?: string
    state?: string
  }
}

function getWeatherDescription(code: number): string {
  if (code === 0) return '맑음 ☀️'
  if (code <= 3) return '구름 조금 ⛅'
  if (code <= 48) return '안개 🌫️'
  if (code <= 55) return '이슬비 🌦️'
  if (code <= 65) return '비 🌧️'
  if (code <= 75) return '눈 🌨️'
  if (code <= 82) return '소나기 🌦️'
  if (code <= 99) return '뇌우 ⛈️'
  return '알 수 없음'
}

export async function sendWeatherNotification(lat: number, lon: number): Promise<void> {
  const [weatherRes, geoRes] = await Promise.all([
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    ),
    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`,
      { headers: { 'User-Agent': 'telbot-weather/1.0' } }
    ),
  ])

  if (!weatherRes.ok) throw new Error(`Open-Meteo error: ${weatherRes.status}`)
  if (!geoRes.ok) throw new Error(`Nominatim error: ${geoRes.status}`)

  const weather: OpenMeteoResponse = await weatherRes.json()
  const geo: NominatimResponse = await geoRes.json()

  const { temperature_2m, relative_humidity_2m, apparent_temperature, weather_code, wind_speed_10m } =
    weather.current
  const { suburb, neighbourhood, city, town, village, county, state } = geo.address
  const area =
    suburb ?? neighbourhood ?? city ?? town ?? village ?? county ?? state ?? '알 수 없는 위치'

  const message =
    `🌤️ <b>현재 날씨 (${area})</b>\n\n` +
    `날씨: ${getWeatherDescription(weather_code)}\n` +
    `기온: ${temperature_2m}°C (체감 ${apparent_temperature}°C)\n` +
    `습도: ${relative_humidity_2m}%\n` +
    `풍속: ${wind_speed_10m} km/h`

  await sendTelegramMessage(message)
}
