import { sendTelegramMessage } from '../telegram'

const TOPIC_KEYWORDS: Record<string, string[]> = {
  '경제': ['금리', '환율', '주가', '코스피', '코스닥', '물가', 'GDP', '경제', '증시', '달러', '원화', '인플레', '금융', '부동산', '주식', '채권', '은행', '대출', '수출', '무역'],
  '정책': ['정부', '국회', '법안', '대통령', '규제', '선거', '정책', '의원', '장관', '여당', '야당', '민주당', '국민의힘', '입법', '행정', '사법', '헌법', '법원', '검찰', '경찰'],
  'AI': ['ChatGPT', '인공지능', 'AI', '딥러닝', 'LLM', '클로드', 'GPT', '머신러닝', '로봇', '자율주행', '생성형', '챗봇', '오픈AI', '구글AI', '메타AI', '반도체', 'GPU'],
  '국제': ['미국', '중국', '전쟁', '외교', '트럼프', 'NATO', '러시아', '우크라이나', '이스라엘', '일본', '북한', '유엔', 'UN', '정상회담', '제재', '관세', '가자', '중동'],
  '환경': ['기후변화', '탄소', '미세먼지', '환경오염', '태풍', '지진', '홍수', '재난', '환경', '산불', '폭염', '한파', '온실가스', '재생에너지', '탄소중립'],
}

interface TrendingTopic {
  title: string
  traffic: string
}

async function fetchKoreaDailyTrends(): Promise<TrendingTopic[]> {
  const res = await fetch(
    'https://trends.google.com/trends/api/dailytrends?hl=ko&tz=-540&geo=KR&ns=15',
    {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TrendBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    }
  )
  const raw = await res.text()
  // Google wraps response with )]}'
  const json = JSON.parse(raw.replace(/^\)\]\}'\n/, ''))
  const days = json?.default?.trendingSearchesDays ?? []
  if (days.length === 0) return []

  const searches = days[0]?.trendingSearches ?? []
  return searches.map((s: { title: { query: string }; formattedTraffic: string }) => ({
    title: s.title?.query ?? '',
    traffic: s.formattedTraffic ?? '',
  }))
}

function categorize(topics: TrendingTopic[]): Record<string, TrendingTopic[]> {
  const result: Record<string, TrendingTopic[]> = {}

  for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    const matched = topics.filter(topic =>
      keywords.some(kw => topic.title.toLowerCase().includes(kw.toLowerCase()))
    )
    if (matched.length > 0) result[category] = matched
  }

  return result
}

const CATEGORY_EMOJI: Record<string, string> = {
  '경제': '💰',
  '정책': '🏛️',
  'AI': '🤖',
  '국제': '🌍',
  '환경': '🌿',
}

export async function sendTopicTrends(): Promise<void> {
  const topics = await fetchKoreaDailyTrends()
  if (topics.length === 0) throw new Error('트렌드를 가져올 수 없습니다')

  const categorized = categorize(topics)

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Seoul',
  })

  let message = `📊 <b>구글 트렌드 주제별</b> (${today})\n\n`

  const categoryOrder = ['경제', '정책', 'AI', '국제', '환경']
  let hasAny = false

  for (const cat of categoryOrder) {
    const items = categorized[cat]
    if (!items || items.length === 0) continue
    hasAny = true
    const emoji = CATEGORY_EMOJI[cat]
    message += `${emoji} <b>${cat}</b>\n`
    items.slice(0, 5).forEach(item => {
      const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(item.title)}&geo=KR`
      message += `  • <a href="${url}">${item.title}</a>`
      if (item.traffic) message += ` <i>(${item.traffic})</i>`
      message += '\n'
    })
    message += '\n'
  }

  if (!hasAny) {
    message += '현재 해당 주제의 트렌드가 없습니다.\n'
    message += '\n📌 <b>오늘의 전체 트렌드</b>\n'
    topics.slice(0, 5).forEach(item => {
      const url = `https://trends.google.com/trends/explore?q=${encodeURIComponent(item.title)}&geo=KR`
      message += `  • <a href="${url}">${item.title}</a>`
      if (item.traffic) message += ` <i>(${item.traffic})</i>`
      message += '\n'
    })
  }

  await sendTelegramMessage(message)
}
