import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    // For now, we'll use a default user ID of 1
    // In a real app, this would come from session/auth
    const userId = 1

    const settings = await prisma.paymentSettings.findUnique({
      where: { userId }
    })

    if (!settings) {
      return NextResponse.json({
        id: null,
        serverKey: '',
        clientKey: '',
        isProduction: false,
        isConfigured: false,
        createdAt: null,
        updatedAt: null,
      })
    }

    return NextResponse.json({
      id: settings.id,
      serverKey: settings.serverKey ? `${settings.serverKey.substring(0, 15)}...` : '',
      clientKey: settings.clientKey ? `${settings.clientKey.substring(0, 15)}...` : '',
      isProduction: settings.isProduction,
      isConfigured: !!(settings.serverKey && settings.clientKey),
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    })
  } catch (error) {
    console.error('❌ Get payment settings error:', error)
    return NextResponse.json(
      { message: 'Gagal mengambil pengaturan pembayaran' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { serverKey, clientKey, isProduction } = await req.json()
    
    // For now, we'll use a default user ID of 1
    const userId = 1

    // Validate input
    if (!serverKey || !clientKey) {
      return NextResponse.json(
        { message: 'Server Key dan Client Key wajib diisi' },
        { status: 400 }
      )
    }

    // Upsert settings
    const settings = await prisma.paymentSettings.upsert({
      where: { userId },
      update: {
        serverKey,
        clientKey,
        isProduction: isProduction || false,
        updatedAt: new Date(),
      },
      create: {
        userId,
        serverKey,
        clientKey,
        isProduction: isProduction || false,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pengaturan pembayaran berhasil disimpan',
      settings: {
        id: settings.id,
        isProduction: settings.isProduction,
        isConfigured: true,
        updatedAt: settings.updatedAt,
      }
    })
  } catch (error) {
    console.error('❌ Save payment settings error:', error)
    return NextResponse.json(
      { message: 'Gagal menyimpan pengaturan pembayaran' },
      { status: 500 }
    )
  }
}