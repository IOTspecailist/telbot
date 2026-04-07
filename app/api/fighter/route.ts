import { NextRequest, NextResponse } from 'next/server'
import { calcScores, type RawStats } from '@/lib/fighter-score'
import { getSql } from '@/lib/db'

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

  // 5. 체급
  let weightClass = 'Unknown'
  const htmlLower = html.toLowerCase()
  for (const wc of WEIGHT_CLASSES) {
    if (htmlLower.includes(wc.toLowerCase())) {
      weightClass = wc
      break
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
  const sql = getSql()

  // DB 먼저 조회
  const rows = await sql`
    SELECT * FROM ufc_fighters WHERE slug = ${slug} LIMIT 1
  ` as Record<string, number>[]
  const row = rows[0]

  if (!row) {
    return NextResponse.json(
      { error: `"${name}" 선수가 DB에 없습니다. Fighter DB에서 먼저 저장해주세요.`, notInDb: true },
      { status: 404 }
    )
  }

  const raw: RawStats = {
    strikePerMin:      row.strike_per_min,
    allowedPerMin:     row.allowed_per_min,
    striking_accuracy: row.striking_accuracy,
    striking_defense:  row.striking_defense,
    takedown_accuracy: row.takedown_accuracy,
    takedown_defense:  row.takedown_defense,
    td_per_15:         row.td_per_15,
    subs_per_15:       row.subs_per_15,
    avg_fight_min:     row.avg_fight_min,
    kd_avg:            row.kd_avg,
    ko_wins:           row.ko_wins,
    sub_wins:          row.sub_wins,
    dec_wins:          row.dec_wins,
    total_wins:        row.total_wins,
    ko_losses:         row.ko_losses,
    sub_losses:        row.sub_losses,
    dec_losses:        row.dec_losses,
    total_losses:      row.total_losses,
  }

  const scores = calcScores(raw)

  const position = {
    posStanding: { count: row.pos_standing_count, pct: row.pos_standing_pct },
    posClinch:   { count: row.pos_clinch_count,   pct: row.pos_clinch_pct },
    posGround:   { count: row.pos_ground_count,   pct: row.pos_ground_pct },
  }
  const winMethod = {
    koBar:  { count: row.ko_wins,  pct: row.ko_wins_pct },
    decBar: { count: row.dec_wins, pct: row.dec_wins_pct },
    subBar: { count: row.sub_wins, pct: row.sub_wins_pct },
  }
  const target = {
    tgtHead: { count: 0, pct: 0 },
    tgtBody: { count: 0, pct: 0 },
    tgtLeg:  { count: 0, pct: 0 },
  }

  return NextResponse.json({ slug, weightClass: row.weight_class, raw, scores, position, target, winMethod })
}
