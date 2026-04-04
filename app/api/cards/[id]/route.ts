import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sql = getSql()
  const { id } = await params
  try {
    await sql`DELETE FROM mma_cards WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[cards DELETE]', e)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }
}
