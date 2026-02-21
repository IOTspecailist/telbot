import { NextRequest, NextResponse } from 'next/server'
import { notificationHandlers, type NotificationId } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const { type } = await req.json()

  if (!type || !(type in notificationHandlers)) {
    return NextResponse.json(
      { error: `Unknown notification type: ${type}` },
      { status: 400 }
    )
  }

  await notificationHandlers[type as NotificationId]()
  return NextResponse.json({ ok: true })
}
