import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const settings = await prisma.paymentSettings.findFirst()
    
    if (!settings || !settings.serverKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Payment settings not configured' 
      }, { status: 400 })
    }

    // Test Midtrans connection
    const midtransUrl = settings.isProduction 
      ? 'https://api.midtrans.com/v2/ping'
      : 'https://api.sandbox.midtrans.com/v2/ping'

    const response = await fetch(midtransUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(settings.serverKey + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      return NextResponse.json({ 
        success: true, 
        message: 'Connection successful',
        environment: settings.isProduction ? 'Production' : 'Sandbox'
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Connection failed: ${response.statusText}` 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('Error testing connection:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to test connection' 
    }, { status: 500 })
  }
}