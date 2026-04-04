import { NextRequest, NextResponse } from 'next/server'
import { calcScores, type RawStats } from '@/lib/fighter-score'

const WEIGHT_CLASSES = [
  'Strawweight', 'Flyweight', 'Bantamweight', 'Featherweight',
  'Lightweight', 'Welterweight', 'Middleweight',
  'Light Heavyweight', 'Heavyweight',
]

function nameToSlug(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function parsePercent(text: string): number {
  return parseFloat(text.replace('%', '')) / 100
}

function parseTime(text: string): number {
  const [m, s] = text.split(':').map(Number)
  return m + s / 60
}

function parseNum(text: string): number {
  return parseFloat(text.replace(/[^0-9.]/g, '')) || 0
}

async function fetchUFCFighter(slug: string) {
  const url = `https://www.ufc.com/athlete/${slug}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`UFC page not found: ${url}`)
  return res.text()
}

function parseStats(html: string): { raw: RawStats; weightClass: string; detectedClasses: string[] } {
  // 전적 파싱
  const winsMatch = html.match(/(\d+)\s*<span[^>]*>\s*Wins?\s*<\/span>/i)
    ?? html.match(/<div[^>]*class="[^"]*win[^"]*"[^>]*>\s*(\d+)/i)
  const lossesMatch = html.match(/(\d+)\s*<span[^>]*>\s*Loss(?:es)?\s*<\/span>/i)
    ?? html.match(/<div[^>]*class="[^"]*loss[^"]*"[^>]*>\s*(\d+)/i)

  // 파이터 통계 파싱 (data-value 또는 텍스트)
  function extractStat(label: string): string {
    const re = new RegExp(
      `${label}[\\s\\S]*?([\\d.]+%?:[\\d.]+%?|[\\d.]+%|[\\d.]+)`,
      'i'
    )
    const m = html.match(re)
    return m?.[1] ?? '0'
  }

  // UFC 페이지 구조 기반 파싱
  const koWinsMatch = html.match(/KO\/TKO[\s\S]*?(\d+)(?=\s*(?:Wins?|<))/i)
  const subWinsMatch = html.match(/Submissions?[\s\S]*?(\d+)(?=\s*(?:Wins?|<))/i)
  const decWinsMatch = html.match(/Decisions?[\s\S]*?(\d+)(?=\s*(?:Wins?|<))/i)

  const spmMatch = html.match(/SLpM[\s\S]*?([\d.]+)/i)
    ?? html.match(/Sig\.?\s*Str\.?\s*Landed[\s\S]*?per[\s\S]*?([\d.]+)/i)
  const sapmMatch = html.match(/SApM[\s\S]*?([\d.]+)/i)
    ?? html.match(/Sig\.?\s*Str\.?\s*Absorbed[\s\S]*?per[\s\S]*?([\d.]+)/i)
  const strAccMatch = html.match(/Str\.?\s*Acc\.?[\s\S]*?([\d.]+%)/i)
  const strDefMatch = html.match(/Str\.?\s*Def\.?[\s\S]*?([\d.]+%)/i)
  const tdAccMatch = html.match(/TD\s*Acc\.?[\s\S]*?([\d.]+%)/i)
  const tdDefMatch = html.match(/TD\s*Def\.?[\s\S]*?([\d.]+%)/i)
  const tdAvgMatch = html.match(/TD\s*Avg\.?[\s\S]*?([\d.]+)/i)
  const subAvgMatch = html.match(/Sub\.?\s*Avg\.?[\s\S]*?([\d.]+)/i)
  const avgFightMatch = html.match(/avg\.?\s*fight\s*time[\s\S]*?(\d+:\d+)/i)

  // 체급 파싱
  let weightClass = 'Unknown'
  const detectedClasses: string[] = []
  for (const wc of WEIGHT_CLASSES) {
    if (html.includes(wc)) {
      detectedClasses.push(wc)
      if (weightClass === 'Unknown') weightClass = wc
    }
  }

  const totalWins = parseInt(winsMatch?.[1] ?? '0')
  const totalLosses = parseInt(lossesMatch?.[1] ?? '0')
  const koWins = parseInt(koWinsMatch?.[1] ?? '0')
  const subWins = parseInt(subWinsMatch?.[1] ?? '0')
  const decWins = parseInt(decWinsMatch?.[1] ?? '0')

  const raw: RawStats = {
    spm:                parseNum(spmMatch?.[1] ?? '0'),
    sapm:               parseNum(sapmMatch?.[1] ?? '0'),
    striking_accuracy:  strAccMatch ? parsePercent(strAccMatch[1]) : 0,
    striking_defense:   strDefMatch ? parsePercent(strDefMatch[1]) : 0,
    takedown_accuracy:  tdAccMatch  ? parsePercent(tdAccMatch[1])  : 0,
    takedown_defense:   tdDefMatch  ? parsePercent(tdDefMatch[1])  : 0,
    td_per_15:          parseNum(tdAvgMatch?.[1] ?? '0'),
    subs_per_15:        parseNum(subAvgMatch?.[1] ?? '0'),
    avg_fight_min:      avgFightMatch ? parseTime(avgFightMatch[1]) : 0,
    ko_wins:            koWins,
    sub_wins:           subWins,
    dec_wins:           decWins,
    total_wins:         totalWins,
    ko_losses:          0,
    sub_losses:         0,
    dec_losses:         0,
    total_losses:       totalLosses,
  }

  return { raw, weightClass, detectedClasses }
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }

  const slug = nameToSlug(name)

  try {
    const html = await fetchUFCFighter(slug)
    const { raw, weightClass, detectedClasses } = parseStats(html)
    const scores = calcScores(raw)

    return NextResponse.json({
      slug,
      weightClass,
      detectedClasses,
      raw,
      scores,
    })
  } catch (e) {
    console.error('[fighter]', e)
    return NextResponse.json({ error: 'Fighter not found on UFC.com' }, { status: 404 })
  }
}
