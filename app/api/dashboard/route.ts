import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Ambil data real dari database
    const apiKeysCount = await prisma.apiKey.count()
    const ordersCount = await prisma.order.count()
    
    const stats = {
      totalApiKeys: apiKeysCount,
      totalRequests: 0, // Will be calculated from logs
      totalOrders: ordersCount,
      totalRevenue: 0 // Will be calculated from orders
    }

    const apiKeys = await prisma.apiKey.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      stats,
      apiKeys
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}