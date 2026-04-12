import { NextRequest, NextResponse } from 'next/server'
import { calcScores, type RawStats } from '@/lib/fighter-score'

const WEIGHT_CLASSES = [
  'Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
  'Light Heavyweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Heavyweight',
]

// 한국어 체급명 → 영어 매핑
const KR_WEIGHT_CLASS: Record<string, string> = {
  '스트로급': 'Strawweight',
  '플라이급': 'Flyweight',
  '밴텀급': 'Bantamweight',
  '페더급': 'Featherweight',
  '라이트급': 'Lightweight',
  '웰터급': 'Welterweight',
  '미들급': 'Middleweight',
  '라이트헤비급': 'Light Heavyweight',
  '헤비급': 'Heavyweight',
}

const TRANSLITERATE: Record<string, string> = {
  à:'a',á:'a',â:'a',ã:'a',ä:'a',å:'a',
  è:'e',é:'e',ê:'e',ë:'e',
  ì:'i',í:'i',î:'i',ï:'i',
  ò:'o',ó:'o',ô:'o',õ:'o',ö:'o',ø:'o',
  ù:'u',ú:'u',û:'u',ü:'u',
  ý:'y',ÿ:'y',
  ñ:'n',ç:'c',ß:'ss',
  š:'s',ś:'s',ș:'s',
  ž:'z',ź:'z',ż:'z',
  č:'c',ć:'c',
  đ:'d',ð:'d',
  ř:'r',
  ł:'l',
  þ:'th',æ:'ae',œ:'oe',
}

function nameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\u0000-\u007E]/g, c => TRANSLITERATE[c] ?? '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function parseTime(t: string): number {
  const [m, s] = t.split(':').map(Number)
  return (m || 0) + (s || 0) / 60
}

async function fetchUFCFighter(slug: string): Promise<string> {
  const url = `https://kr.ufc.com/athlete/${slug}`
  const MAX_RETRIES = 3
  let lastError: Error = new Error('unknown')

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) throw new Error(`UFC page not found (${res.status}): ${url}`)
      return await res.text()
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
      if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 500 * attempt))
    }
  }
  throw lastError
}

// 3bar 섹션에서 횟수·퍼센트 추출
// 실제 HTML 형식: c-stat-3bar__value">1012 (65%)  — 같은 element에 count(pct) 형태
function extract3bar(html: string, sectionTitle: string): { count: number; pct: number }[] {
  const escaped = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // 섹션 제목은 c-stat-3bar__title 클래스에 있고, 다음 c-stat-3bar__title 또는 끝까지가 범위
  const section = html.match(new RegExp(escaped + '[\\s\\S]*?(?=c-stat-3bar__title|$)', 'i'))
  if (!section) return []
  return [...section[0].matchAll(/c-stat-3bar__value">\s*(\d+)\s*\((\d+)%\)/g)]
    .map(m => ({ count: parseInt(m[1]), pct: parseInt(m[2]) }))
}

function parseStats(html: string, slug: string) {
  // 1. 전적
  const recordMatch = html.match(/(\d+)-(\d+)-\d+\s*\(W-L-D\)/)
  if (!recordMatch) throw new Error('FIGHTER_NOT_FOUND')
  let totalWins   = parseInt(recordMatch[1])
  let totalLosses = parseInt(recordMatch[2])

  if (slug === 'jon-jones' && totalLosses === 1) {
    totalWins += 1
    totalLosses = 0
  }

  // 2. Win by Method — 한국어/영어 타이틀 순서로 시도, 모두 실패 시 포지션 섹션 앞의 첫 3개 추출
  let winBars = extract3bar(html, '승리 방법')
  if (winBars.length === 0) winBars = extract3bar(html, '방법별 승리')
  if (winBars.length === 0) winBars = extract3bar(html, 'Win by Method')
  if (winBars.length === 0) {
    const posIdx = html.indexOf('포지션 별 중요 타격')
    const beforePos = posIdx > 0 ? html.slice(0, posIdx) : html
    winBars = [...beforePos.matchAll(/c-stat-3bar__value">\s*(\d+)\s*\((\d+)%\)/g)]
      .map(m => ({ count: parseInt(m[1]), pct: parseInt(m[2]) }))
  }
  const koBar  = winBars[0] ?? { count: 0, pct: 0 }
  const decBar = winBars[1] ?? { count: 0, pct: 0 }
  const subBar = winBars[2] ?? { count: 0, pct: 0 }
  const koWins  = koBar.count
  const decWins = decBar.count
  const subWins = subBar.count

  // 3. c-stat-compare__number
  const compareNums = [...html.matchAll(/<div class="c-stat-compare__number">\s*([\d.:]+)/g)]
    .map(m => m[1].trim())
  const strikePerMin    = parseFloat(compareNums[0] ?? '0')
  const allowedPerMin   = parseFloat(compareNums[1] ?? '0')
  const tdPer15   = parseFloat(compareNums[2] ?? '0')
  const subsPer15 = parseFloat(compareNums[3] ?? '0')
  const strDefInt = parseFloat(compareNums[4] ?? '0')
  const tdDefInt  = parseFloat(compareNums[5] ?? '0')
  const kdAvg      = parseFloat(compareNums[6] ?? '0')
  const avgFightStr = compareNums[7] ?? '0:00'

  // 4. 원형 퍼센트
  const circlePercs = [...html.matchAll(/<text[^>]*class="e-chart-circle__percent"[^>]*>(\d+)%<\/text>/g)]
    .map(m => parseInt(m[1]))
  const strAcc = (circlePercs[0] ?? 0) / 100
  const tdAcc  = (circlePercs[1] ?? 0) / 100

  // 5. 체급 - 라벨 근처 집중 탐색 (전체 HTML includes는 nav/링크 오염 때문에 부정확)
  let weightClass = 'Unknown'
  const htmlLower = html.toLowerCase()

  // 1단계: '체급' / 'weight class' 라벨 근처 500자 안에서 찾기
  for (const label of ['체급', 'weight class']) {
    const idx = htmlLower.indexOf(label)
    if (idx === -1) continue
    const nearby = html.slice(idx, idx + 500)
    // 한국어 체급명 우선
    for (const [kr, en] of Object.entries(KR_WEIGHT_CLASS)) {
      if (nearby.includes(kr)) { weightClass = en; break }
    }
    if (weightClass !== 'Unknown') break
    // 영어 체급명
    const nearbyLower = nearby.toLowerCase()
    for (const wc of WEIGHT_CLASSES) {
      if (nearbyLower.includes(wc.toLowerCase())) { weightClass = wc; break }
    }
    if (weightClass !== 'Unknown') break
  }

  // 2단계: c-bio 섹션 안에서만 탐색
  if (weightClass === 'Unknown') {
    const bioStart = html.indexOf('c-bio')
    if (bioStart !== -1) {
      const bio = html.slice(bioStart, bioStart + 3000)
      const bioLower = bio.toLowerCase()
      for (const [kr, en] of Object.entries(KR_WEIGHT_CLASS)) {
        if (bio.includes(kr)) { weightClass = en; break }
      }
      if (weightClass === 'Unknown') {
        for (const wc of WEIGHT_CLASSES) {
          if (bioLower.includes(wc.toLowerCase())) { weightClass = wc; break }
        }
      }
    }
  }

  // 6. 포지션 별 중요 타격 (Standing / Clinch / Ground)
  const posBars = extract3bar(html, '포지션 별 중요 타격')
  const posStanding = posBars[0] ?? { count: 0, pct: 0 }
  const posClinch   = posBars[1] ?? { count: 0, pct: 0 }
  const posGround   = posBars[2] ?? { count: 0, pct: 0 }

  // 7. 표적 별 중요 타격 — JS 렌더링 데이터라 서버사이드 fetch로 불가, null 처리
  const tgtHead = { count: 0, pct: 0 }
  const tgtBody = { count: 0, pct: 0 }
  const tgtLeg  = { count: 0, pct: 0 }

  const raw: RawStats = {
    strikePerMin,
    allowedPerMin,
    striking_accuracy: strAcc,
    striking_defense:  strDefInt / 100,
    takedown_accuracy: tdAcc,
    takedown_defense:  tdDefInt / 100,
    td_per_15:         tdPer15,
    subs_per_15:       subsPer15,
    avg_fight_min:     parseTime(avgFightStr),
    kd_avg:            kdAvg,
    ko_wins:           koWins,
    sub_wins:          subWins,
    dec_wins:          decWins,
    total_wins:        totalWins,
    ko_losses:         0,
    sub_losses:        0,
    dec_losses:        0,
    total_losses:      totalLosses,
  }

  const position  = { posStanding, posClinch, posGround }
  const target    = { tgtHead, tgtBody, tgtLeg }
  const winMethod = { koBar, decBar, subBar }

  return { raw, weightClass, position, target, winMethod }
}


export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const slug = nameToSlug(name)

  try {
    const html = await fetchUFCFighter(slug)
    const { raw, weightClass, position, target, winMethod } = parseStats(html, slug)
    const scores = calcScores(raw)

    return NextResponse.json({ slug, weightClass, raw, scores, position, target, winMethod })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'FIGHTER_NOT_FOUND') {
      return NextResponse.json({ error: `"${name}" 선수를 UFC에서 찾을 수 없습니다. 영문 이름을 확인해주세요.` }, { status: 404 })
    }
    console.error('[fighter]', e)
    return NextResponse.json({ error: 'UFC.com 데이터를 가져오지 못했습니다' }, { status: 500 })
  }
}
