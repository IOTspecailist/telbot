import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export async function GET() {
  const sql = getSql()
  try {
    const rows = await sql`
      SELECT id, name, weight_class,
             score_power, score_striking, score_speed, score_chin,
             score_wrestling, score_jiujitsu, score_cardio, score_fightiq,
             image, created_at
      FROM mma_cards
      ORDER BY created_at DESC
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[cards GET]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const sql = getSql()
  try {
    const body = await req.json()
    const { id, name, weight_class, raw_stats, scores, image } = body

    // image는 88×120px JPEG 썸네일 — 정상 범위 10KB 이내, 50KB 초과면 거부
    if (image && typeof image === 'string' && image.length > 50000) {
      return NextResponse.json({ error: 'Image too large' }, { status: 400 })
    }
    if (!name || typeof name !== 'string' || name.length > 100) {
      return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    }

    await sql`
      INSERT INTO mma_cards (
        id, name, weight_class, raw_stats,
        score_power, score_striking, score_speed, score_chin,
        score_wrestling, score_jiujitsu, score_cardio, score_fightiq,
        image
      ) VALUES (
        ${id}, ${name}, ${weight_class}, ${JSON.stringify(raw_stats)},
        ${scores.power}, ${scores.striking}, ${scores.speed}, ${scores.chin},
        ${scores.wrestling}, ${scores.jiujitsu}, ${scores.cardio}, ${scores.fightiq},
        ${image ?? null}
      )
      ON CONFLICT (id) DO UPDATE SET
        name         = EXCLUDED.name,
        weight_class = EXCLUDED.weight_class,
        raw_stats    = EXCLUDED.raw_stats,
        score_power     = EXCLUDED.score_power,
        score_striking  = EXCLUDED.score_striking,
        score_speed     = EXCLUDED.score_speed,
        score_chin      = EXCLUDED.score_chin,
        score_wrestling = EXCLUDED.score_wrestling,
        score_jiujitsu  = EXCLUDED.score_jiujitsu,
        score_cardio    = EXCLUDED.score_cardio,
        score_fightiq   = EXCLUDED.score_fightiq,
        image        = EXCLUDED.image
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[cards POST]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
