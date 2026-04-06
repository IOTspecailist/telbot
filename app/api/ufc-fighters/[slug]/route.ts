import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

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
