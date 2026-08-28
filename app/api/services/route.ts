import { NextResponse } from 'next/server'
import { getServices } from '@/lib/actions/service'

export async function GET() {
  try {
    const result = await getServices()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/services | Error]:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch services from database.',
        services: [],
      },
      { status: 500 },
    )
  }
}