'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

interface PaymentSettings {
  id: number | null
  serverKey: string
  clientKey: string
  isProduction: boolean
  isConfigured: boolean
  createdAt: string | null
  updatedAt: string | null
}

export default function PaymentMethodPage() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    serverKey: '',
    clientKey: '',
    isProduction: false,
  })
  const { toast } = useToast()

  // Load settings on component mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/payment/settings')
      const data = await response.json()
      setSettings(data)
      setFormData({
        serverKey: data.serverKey || '',
        clientKey: data.clientKey || '',
        isProduction: data.isProduction || false,
      })
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: 'Error',
        description: 'Gagal memuat pengaturan pembayaran',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/payment/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      toast({
        title: 'Berhasil',
        description: 'Pengaturan Midtrans berhasil disimpan',
      })
      
      // Reload settings
      await loadSettings()
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Gagal menyimpan pengaturan',
        description: error instanceof Error ? error.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Memuat pengaturan...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Payment Method</h1>
          <p className="text-gray-600 mt-2">Konfigurasi metode pembayaran Midtrans untuk sistem Anda</p>
        </div>

        <Tabs defaultValue="configuration" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configuration">Konfigurasi</TabsTrigger>
            <TabsTrigger value="documentation">Dokumentasi</TabsTrigger>
            <TabsTrigger value="testing">Testing</TabsTrigger>
          </TabsList>

          <TabsContent value="configuration" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Konfigurasi Midtrans</CardTitle>
                    <CardDescription>
                      Setup kredensial Midtrans untuk memproses pembayaran
                    </CardDescription>
                  </div>
                  {settings?.isConfigured && (
                    <Badge variant={settings.isProduction ? "default" : "secondary"}>
                      {settings.isProduction ? "Production" : "Sandbox"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="serverKey">Server Key</Label>
                    <Input
                      id="serverKey"
                      type="password"
                      placeholder="SB-Mid-server-... atau Mid-server-..."
                      value={formData.serverKey}
                      onChange={(e) => setFormData({ ...formData, serverKey: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Server Key untuk autentikasi API Midtrans
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientKey">Client Key</Label>
                    <Input
                      id="clientKey"
                      type="password"
                      placeholder="SB-Mid-client-... atau Mid-client-..."
                      value={formData.clientKey}
                      onChange={(e) => setFormData({ ...formData, clientKey: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Client Key untuk frontend integration
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="production"
                      checked={formData.isProduction}
                      onCheckedChange={(checked) => setFormData({ ...formData, isProduction: checked })}
                    />
                    <Label htmlFor="production" className="text-sm font-medium">
                      Mode Production
                    </Label>
                  </div>

                  {formData.isProduction && (
                    <Alert>
                      <AlertDescription>
                        ⚠️ Mode Production akan memproses pembayaran real. Pastikan kredensial sudah benar.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button 
                    onClick={handleSave}
                    disabled={saving || !formData.serverKey || !formData.clientKey}
                    className="flex-1"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </Button>
                </div>

                {settings?.updatedAt && (
                  <p className="text-sm text-gray-500">
                    Terakhir diperbarui: {new Date(settings.updatedAt).toLocaleString('id-ID')}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dokumentasi Setup</CardTitle>
                <CardDescription>
                  Panduan lengkap setup Midtrans untuk sistem SMM Panel
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose max-w-none">
                  <h3>Langkah-langkah Setup:</h3>
                  <ol className="list-decimal pl-6 space-y-2">
                    <li>Daftar akun di <a href="https://midtrans.com" target="_blank" className="text-blue-600">Midtrans</a></li>
                    <li>Login ke Dashboard Midtrans</li>
                    <li>Pilih Environment (Sandbox untuk testing, Production untuk live)</li>
                    <li>Copy Server Key dan Client Key</li>
                    <li>Paste kredensial di form konfigurasi</li>
                    <li>Test koneksi sebelum go-live</li>
                  </ol>

                  <h3 className="mt-6">Format Kredensial:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li><strong>Sandbox Server Key:</strong> SB-Mid-server-...</li>
                    <li><strong>Sandbox Client Key:</strong> SB-Mid-client-...</li>
                    <li><strong>Production Server Key:</strong> Mid-server-...</li>
                    <li><strong>Production Client Key:</strong> Mid-client-...</li>
                  </ul>

                  <h3 className="mt-6">Metode Pembayaran yang Didukung:</h3>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>QRIS (Quick Response Indonesian Standard)</li>
                    <li>Virtual Account (BCA, BNI, BRI, Mandiri, Permata)</li>
                    <li>E-Wallet (GoPay, OVO, DANA, ShopeePay)</li>
                    <li>Credit/Debit Card (Visa, Mastercard)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Koneksi</CardTitle>
                <CardDescription>
                  Verifikasi koneksi ke Midtrans dengan kredensial yang sudah disimpan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    {settings?.isConfigured 
                      ? `✅ Kredensial tersimpan untuk mode ${settings.isProduction ? 'Production' : 'Sandbox'}`
                      : '❌ Kredensial belum dikonfigurasi. Silakan isi form konfigurasi terlebih dahulu.'
                    }
                  </AlertDescription>
                </Alert>

                {settings?.isConfigured && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Environment</p>
                        <p className="text-sm text-gray-600">{settings.isProduction ? 'Production' : 'Sandbox'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Server Key</p>
                        <p className="text-sm text-gray-600 font-mono">{settings.serverKey}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Client Key</p>
                        <p className="text-sm text-gray-600 font-mono">{settings.clientKey}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Status</p>
                        <Badge variant="outline" className="text-green-700 border-green-300">
                          Configured
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}