import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.paymentSettings.findFirst()
    
    if (!settings) {
      return NextResponse.json({
        id: null,
        serverKey: '',
        clientKey: '',
        isProduction: false,
        isConfigured: false,
        createdAt: null,
        updatedAt: null
      })
    }

    return NextResponse.json({
      id: settings.id,
      serverKey: settings.serverKey ? '***' : '',
      clientKey: settings.clientKey ? '***' : '',
      isProduction: settings.isProduction,
      isConfigured: !!(settings.serverKey && settings.clientKey),
      createdAt: settings.createdAt?.toISOString() || null,
      updatedAt: settings.updatedAt?.toISOString() || null
    })
  } catch (error) {
    console.error('Error fetching payment settings:', error)
    return NextResponse.json({ error: 'Failed to fetch payment settings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { serverKey, clientKey, isProduction } = body

    if (!serverKey || !clientKey) {
      return NextResponse.json({ error: 'Server key and client key are required' }, { status: 400 })
    }

    const existingSettings = await prisma.paymentSettings.findFirst()

    let settings
    if (existingSettings) {
      settings = await prisma.paymentSettings.update({
        where: { id: existingSettings.id },
        data: {
          serverKey,
          clientKey,
          isProduction,
          updatedAt: new Date()
        }
      })
    } else {
      settings = await prisma.paymentSettings.create({
        data: {
          serverKey,
          clientKey,
          isProduction,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
    }

    return NextResponse.json({
      id: settings.id,
      serverKey: '***',
      clientKey: '***',
      isProduction: settings.isProduction,
      isConfigured: true,
      createdAt: settings.createdAt?.toISOString(),
      updatedAt: settings.updatedAt?.toISOString()
    })
  } catch (error) {
    console.error('Error saving payment settings:', error)
    return NextResponse.json({ error: 'Failed to save payment settings' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    await prisma.paymentSettings.deleteMany({})
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment settings:', error)
    return NextResponse.json({ error: 'Failed to delete payment settings' }, { status: 500 })
  }
}