import { NextRequest, NextResponse } from 'next/server'
import { calcScores, type RawStats } from '@/lib/fighter-score'

const WEIGHT_CLASSES = [
  'Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
  'Light Heavyweight', 'Lightweight', 'Welterweight', 'Middleweight', 'Heavyweight',
]

function nameToSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function parseTime(t: string): number {
  const [m, s] = t.split(':').map(Number)
  return (m || 0) + (s || 0) / 60
}

async function fetchUFCFighter(slug: string): Promise<string> {
  const url = `https://kr.ufc.com/athlete/${slug}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`UFC page not found (${res.status}): ${url}`)
  return res.text()
}

function parseStats(html: string, slug: string): { raw: RawStats; weightClass: string } {
  // 1. 전적: "28-1-0 (W-L-D)" — 없으면 선수 페이지가 아님
  const recordMatch = html.match(/(\d+)-(\d+)-\d+\s*\(W-L-D\)/)
  if (!recordMatch) throw new Error('FIGHTER_NOT_FOUND')
  let totalWins   = parseInt(recordMatch[1])
  let totalLosses = parseInt(recordMatch[2])

  // Jones의 1패는 반칙패 — 현행 규정상 승리로 처리
  if (slug === 'jon-jones' && totalLosses === 1) {
    totalWins += 1
    totalLosses = 0
  }

  // 2. Win by Method 섹션에서 KO/Dec/Sub 순서로 추출
  const winSection = html.match(/Win by Method([\s\S]*?)(?=<h2|<\/section|$)/i)
  const winBarVals = winSection
    ? [...winSection[1].matchAll(/c-stat-3bar__value">\s*(\d+)/g)]
    : []
  const koWins  = parseInt(winBarVals[0]?.[1] ?? '0')
  const decWins = parseInt(winBarVals[1]?.[1] ?? '0')
  const subWins = parseInt(winBarVals[2]?.[1] ?? '0')

  // 3. c-stat-compare__number — 페이지 순서: SLpM, SApM, TD avg, Sub avg, Str Def%, TD Def%, KD avg, Avg time
  const compareNums = [...html.matchAll(/<div class="c-stat-compare__number">\s*([\d.:]+)/g)]
    .map(m => m[1].trim())
  const strikePerMin    = parseFloat(compareNums[0] ?? '0')
  const allowedPerMin   = parseFloat(compareNums[1] ?? '0')
  const tdPer15   = parseFloat(compareNums[2] ?? '0')
  const subsPer15 = parseFloat(compareNums[3] ?? '0')
  const strDefInt = parseFloat(compareNums[4] ?? '0')  // 정수 e.g. 62
  const tdDefInt  = parseFloat(compareNums[5] ?? '0')  // 정수 e.g. 91
  const kdAvg      = parseFloat(compareNums[6] ?? '0')
  const avgFightStr = compareNums[7] ?? '0:00'

  // 4. 원형 퍼센트: 타격 정확도, 테이크다운 정확도
  const circlePercs = [...html.matchAll(/<text[^>]*class="e-chart-circle__percent"[^>]*>(\d+)%<\/text>/g)]
    .map(m => parseInt(m[1]))
  const strAcc = (circlePercs[0] ?? 0) / 100
  const tdAcc  = (circlePercs[1] ?? 0) / 100

  // 5. 체급 (Light Heavyweight를 Lightweight보다 먼저 체크)
  let weightClass = 'Unknown'
  const htmlLower = html.toLowerCase()
  for (const wc of WEIGHT_CLASSES) {
    if (htmlLower.includes(wc.toLowerCase())) {
      weightClass = wc
      break
    }
  }

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
    ko_losses:         0,  // UFC 페이지에서 패배 방식 미제공
    sub_losses:        0,
    dec_losses:        0,
    total_losses:      totalLosses,
  }

  return { raw, weightClass }
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const slug = nameToSlug(name)

  try {
    const html = await fetchUFCFighter(slug)
    const { raw, weightClass } = parseStats(html, slug)
    const scores = calcScores(raw)

    return NextResponse.json({ slug, weightClass, raw, scores })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'FIGHTER_NOT_FOUND') {
      return NextResponse.json({ error: `"${name}" 선수를 UFC에서 찾을 수 없습니다. 영문 이름을 확인해주세요.` }, { status: 404 })
    }
    console.error('[fighter]', e)
    return NextResponse.json({ error: 'UFC.com 데이터를 가져오지 못했습니다' }, { status: 500 })
  }
}
