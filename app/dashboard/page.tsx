'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Key, Activity, DollarSign, Users } from 'lucide-react'

export default function DashboardPage() {
  const stats = [
    {
      title: 'Total API Keys',
      value: '4',
      icon: Key,
      description: 'API keys yang aktif'
    },
    {
      title: 'Total Requests',
      value: '2',
      icon: Activity,
      description: 'Request dalam 24 jam terakhir'
    },
    {
      title: 'Total Orders',
      value: '0',
      icon: Users,
      description: 'Order yang diproses'
    },
    {
      title: 'Total Revenue',
      value: '$0.00',
      icon: DollarSign,
      description: 'Pendapatan hari ini'
    }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Provider Dashboard</h1>
        <p className="text-gray-600">Kelola API keys dan monitor transaksi customer Anda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <stat.icon className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">API Keys</h2>
        <Button>
          <Key className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys Management</CardTitle>
          <CardDescription>Kelola dan monitor penggunaan API keys Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">API Keys akan ditampilkan di sini</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}