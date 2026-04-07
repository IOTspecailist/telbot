import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { calcScores, type RawStats } from '@/lib/fighter-score'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const sql = getSql()
  const { slug } = await params
  try {
    const rows = await sql`SELECT * FROM ufc_fighters WHERE slug = ${slug} LIMIT 1` as Record<string, number & string>[]
    const row = rows[0]
    if (!row) {
      return NextResponse.json({ notInDb: true, error: 'DB에 없는 선수입니다. Fighter DB에서 먼저 저장해주세요.' }, { status: 404 })
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
    return NextResponse.json({ slug, weightClass: row.weight_class, raw, scores, position, winMethod })
  } catch (e) {
    console.error('[ufc-fighters GET slug]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const sql = getSql()
  const { slug } = await params
  try {
    await sql`DELETE FROM ufc_fighters WHERE slug = ${slug}`
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[ufc-fighters DELETE]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
