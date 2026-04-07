import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export async function GET() {
  const sql = getSql()
  try {
    const rows = await sql`
      SELECT slug, name, weight_class,
             total_wins, total_losses, ko_wins, sub_wins, dec_wins,
             ko_wins_pct, dec_wins_pct, sub_wins_pct,
             strike_per_min, allowed_per_min,
             striking_accuracy, striking_defense,
             takedown_accuracy, takedown_defense,
             td_per_15, subs_per_15, avg_fight_min, kd_avg,
             pos_standing_count, pos_standing_pct,
             pos_clinch_count, pos_clinch_pct,
             pos_ground_count, pos_ground_pct,
             fetched_at
      FROM ufc_fighters
      ORDER BY fetched_at DESC
    `
    return NextResponse.json(rows)
  } catch (e) {
    console.error('[ufc-fighters GET]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const sql = getSql()
  try {
    const b = await req.json()

    if (!b.slug || !b.name) {
      return NextResponse.json({ error: 'slug and name required' }, { status: 400 })
    }

    await sql`
      INSERT INTO ufc_fighters (
        slug, name, weight_class,
        total_wins, total_losses, ko_wins, sub_wins, dec_wins,
        ko_wins_pct, dec_wins_pct, sub_wins_pct,
        ko_losses, sub_losses, dec_losses,
        strike_per_min, allowed_per_min,
        striking_accuracy, striking_defense,
        takedown_accuracy, takedown_defense,
        td_per_15, subs_per_15, avg_fight_min, kd_avg,
        pos_standing_count, pos_standing_pct,
        pos_clinch_count,   pos_clinch_pct,
        pos_ground_count,   pos_ground_pct,
        fetched_at
      ) VALUES (
        ${b.slug}, ${b.name}, ${b.weight_class ?? null},
        ${b.total_wins ?? 0}, ${b.total_losses ?? 0},
        ${b.ko_wins ?? 0}, ${b.sub_wins ?? 0}, ${b.dec_wins ?? 0},
        ${b.ko_wins_pct ?? 0}, ${b.dec_wins_pct ?? 0}, ${b.sub_wins_pct ?? 0},
        ${b.ko_losses ?? 0}, ${b.sub_losses ?? 0}, ${b.dec_losses ?? 0},
        ${b.strike_per_min ?? 0}, ${b.allowed_per_min ?? 0},
        ${b.striking_accuracy ?? 0}, ${b.striking_defense ?? 0},
        ${b.takedown_accuracy ?? 0}, ${b.takedown_defense ?? 0},
        ${b.td_per_15 ?? 0}, ${b.subs_per_15 ?? 0},
        ${b.avg_fight_min ?? 0}, ${b.kd_avg ?? 0},
        ${b.pos_standing_count ?? 0}, ${b.pos_standing_pct ?? 0},
        ${b.pos_clinch_count ?? 0},   ${b.pos_clinch_pct ?? 0},
        ${b.pos_ground_count ?? 0},   ${b.pos_ground_pct ?? 0},
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        name              = EXCLUDED.name,
        weight_class      = EXCLUDED.weight_class,
        total_wins        = EXCLUDED.total_wins,
        total_losses      = EXCLUDED.total_losses,
        ko_wins           = EXCLUDED.ko_wins,
        sub_wins          = EXCLUDED.sub_wins,
        dec_wins          = EXCLUDED.dec_wins,
        ko_wins_pct       = EXCLUDED.ko_wins_pct,
        dec_wins_pct      = EXCLUDED.dec_wins_pct,
        sub_wins_pct      = EXCLUDED.sub_wins_pct,
        ko_losses         = EXCLUDED.ko_losses,
        sub_losses        = EXCLUDED.sub_losses,
        dec_losses        = EXCLUDED.dec_losses,
        strike_per_min    = EXCLUDED.strike_per_min,
        allowed_per_min   = EXCLUDED.allowed_per_min,
        striking_accuracy = EXCLUDED.striking_accuracy,
        striking_defense  = EXCLUDED.striking_defense,
        takedown_accuracy = EXCLUDED.takedown_accuracy,
        takedown_defense  = EXCLUDED.takedown_defense,
        td_per_15         = EXCLUDED.td_per_15,
        subs_per_15       = EXCLUDED.subs_per_15,
        avg_fight_min     = EXCLUDED.avg_fight_min,
        kd_avg            = EXCLUDED.kd_avg,
        pos_standing_count = EXCLUDED.pos_standing_count,
        pos_standing_pct   = EXCLUDED.pos_standing_pct,
        pos_clinch_count   = EXCLUDED.pos_clinch_count,
        pos_clinch_pct     = EXCLUDED.pos_clinch_pct,
        pos_ground_count   = EXCLUDED.pos_ground_count,
        pos_ground_pct     = EXCLUDED.pos_ground_pct,
        fetched_at        = EXCLUDED.fetched_at
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[ufc-fighters POST]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
