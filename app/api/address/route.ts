import { NextResponse } from 'next/server'
import { getAddressOptions } from '@/src/data/patientInfo'

export async function GET() {
  try {
    const result = getAddressOptions()
    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/address | Error]:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch address options.',
        barangay: '',
        municipality: '',
        province: '',
        zipCode: '',
        country: '',
        puroks: [],
      },
      { status: 500 },
    )
  }
}