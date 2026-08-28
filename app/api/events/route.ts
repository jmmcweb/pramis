import { NextResponse } from 'next/server'
import { getEvents } from '@/lib/actions/event'

export async function GET() {
  try {
    const result = await getEvents()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/events | Error]:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch events from database.',
        events: [],
        scheduled: [],
        archive: [],
      },
      { status: 500 },
    )
  }
}