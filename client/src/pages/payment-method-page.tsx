import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, 
  Key, 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink,
  Eye,
  EyeOff,
  TestTube,
  Trash2,
  Settings
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const paymentConfigSchema = z.object({
  serverKey: z.string().min(1, 'Server Key wajib diisi'),
  clientKey: z.string().min(1, 'Client Key wajib diisi'),
  isProduction: z.boolean().default(false),
});

type PaymentConfigForm = z.infer<typeof paymentConfigSchema>;

interface PaymentSettings {
  id: number;
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  isConfigured: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PaymentMethodPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showServerKey, setShowServerKey] = useState(false);
  const [showClientKey, setShowClientKey] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const form = useForm<PaymentConfigForm>({
    resolver: zodResolver(paymentConfigSchema),
    defaultValues: {
      serverKey: '',
      clientKey: '',
      isProduction: false,
    },
  });

  // Fetch current payment settings
  const { data: paymentSettings, isLoading, error } = useQuery({
    queryKey: ['/api/payment/settings'],
    queryFn: () => apiRequest('/api/payment/settings'),
  });

  // Load existing settings into form
  useEffect(() => {
    if (paymentSettings) {
      form.reset({
        serverKey: paymentSettings.serverKey || '',
        clientKey: paymentSettings.clientKey || '',
        isProduction: paymentSettings.isProduction || false,
      });
    }
  }, [paymentSettings, form]);

  // Save payment settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: (data: PaymentConfigForm) => 
      apiRequest('/api/payment/settings', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
      }),
    onSuccess: () => {
      toast({
        title: 'Pengaturan berhasil disimpan',
        description: 'Konfigurasi Midtrans telah diperbarui',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Gagal menyimpan pengaturan',
        description: error.message || 'Terjadi kesalahan saat menyimpan konfigurasi',
        variant: 'destructive',
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: () => apiRequest('/api/payment/test-connection', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: 'Koneksi berhasil',
        description: `Koneksi ke Midtrans ${data.environment} berhasil`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Koneksi gagal',
        description: error.message || 'Tidak dapat terhubung ke Midtrans',
        variant: 'destructive',
      });
    },
  });

  // Delete settings mutation
  const deleteSettingsMutation = useMutation({
    mutationFn: () => apiRequest('/api/payment/settings', { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: 'Konfigurasi berhasil dihapus',
        description: 'Pengaturan Midtrans telah direset',
      });
      form.reset({
        serverKey: '',
        clientKey: '',
        isProduction: false,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/payment/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Gagal menghapus konfigurasi',
        description: error.message || 'Terjadi kesalahan saat menghapus konfigurasi',
        variant: 'destructive',
      });
    },
  });

  const handleSaveSettings = (data: PaymentConfigForm) => {
    saveSettingsMutation.mutate(data);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      await testConnectionMutation.mutateAsync();
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleDeleteSettings = () => {
    if (confirm('Apakah Anda yakin ingin menghapus konfigurasi Midtrans? Tindakan ini tidak dapat dibatalkan.')) {
      deleteSettingsMutation.mutate();
    }
  };

  const getStatusBadge = () => {
    if (!paymentSettings) return null;
    
    if (paymentSettings.isConfigured) {
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle className="w-3 h-3" />
          Terkonfigurasi
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="w-3 h-3" />
          Belum dikonfigurasi
        </Badge>
      );
    }
  };

  const getEnvironmentBadge = () => {
    if (!paymentSettings?.isConfigured) return null;
    
    return (
      <Badge variant={paymentSettings.isProduction ? "destructive" : "outline"} className="gap-1">
        <Shield className="w-3 h-3" />
        {paymentSettings.isProduction ? 'Production' : 'Sandbox'}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="w-8 h-8" />
            Payment Method
          </h1>
          <p className="text-gray-600 mt-1">
            Konfigurasi metode pembayaran Midtrans untuk sistem SMM Panel
          </p>
        </div>
        <div className="flex gap-2">
          {getStatusBadge()}
          {getEnvironmentBadge()}
        </div>
      </div>

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Konfigurasi
          </TabsTrigger>
          <TabsTrigger value="documentation" className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Dokumentasi
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="w-4 h-4" />
            Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                Konfigurasi Midtrans
              </CardTitle>
              <CardDescription>
                Masukkan kredensial Midtrans Anda untuk mengaktifkan sistem pembayaran
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveSettings)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="serverKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Server Key
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showServerKey ? "text" : "password"}
                              placeholder="SB-Mid-server-xxxxxxxxxxxxxxxxxxxxxxxx"
                              {...field}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowServerKey(!showServerKey)}
                            >
                              {showServerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Server Key digunakan untuk komunikasi server-to-server dengan Midtrans
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="clientKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Key className="w-4 h-4" />
                          Client Key
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showClientKey ? "text" : "password"}
                              placeholder="SB-Mid-client-xxxxxxxxxxxxxxxxxxxxxxxx"
                              {...field}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={() => setShowClientKey(!showClientKey)}
                            >
                              {showClientKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Client Key digunakan untuk komunikasi frontend dengan Midtrans
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isProduction"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Mode Production
                          </FormLabel>
                          <FormDescription>
                            Aktifkan untuk menggunakan environment production Midtrans
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="flex gap-3">
                    <Button 
                      type="submit" 
                      disabled={saveSettingsMutation.isPending}
                      className="flex-1"
                    >
                      {saveSettingsMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                    </Button>
                    
                    {paymentSettings?.isConfigured && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={isTestingConnection || testConnectionMutation.isPending}
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          {isTestingConnection ? 'Testing...' : 'Test Koneksi'}
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          onClick={handleDeleteSettings}
                          disabled={deleteSettingsMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus
                        </Button>
                      </>
                    )}
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cara Mendapatkan Kredensial Midtrans</CardTitle>
              <CardDescription>
                Panduan langkah demi langkah untuk mendapatkan Server Key dan Client Key
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                    Daftar akun Midtrans
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Buat akun di dashboard Midtrans sesuai dengan environment yang Anda inginkan:
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://dashboard.sandbox.midtrans.com/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Dashboard Sandbox
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://dashboard.midtrans.com/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Dashboard Production
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                    Akses halaman Settings
                  </h4>
                  <p className="text-sm text-gray-600">
                    Setelah login ke dashboard, navigasi ke menu <strong>Settings</strong> → <strong>Access Keys</strong>
                  </p>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                    Copy kredensial
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Salin kedua kredensial berikut:
                  </p>
                  <ul className="text-sm space-y-1 ml-4">
                    <li>• <strong>Server Key</strong>: Digunakan untuk komunikasi server</li>
                    <li>• <strong>Client Key</strong>: Digunakan untuk komunikasi frontend</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                    Konfigurasi sistem
                  </h4>
                  <p className="text-sm text-gray-600">
                    Masukkan kredensial ke form di atas dan pilih mode yang sesuai (Sandbox untuk testing, Production untuk live)
                  </p>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Catatan Keamanan:</strong> Jangan pernah membagikan Server Key Anda kepada siapapun. 
                  Server Key memiliki akses penuh ke akun Midtrans Anda.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Koneksi & Validasi</CardTitle>
              <CardDescription>
                Verifikasi bahwa konfigurasi Midtrans Anda berfungsi dengan benar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentSettings?.isConfigured ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Status Konfigurasi</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Environment:</span>
                          <Badge variant={paymentSettings.isProduction ? "destructive" : "outline"}>
                            {paymentSettings.isProduction ? 'Production' : 'Sandbox'}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Status:</span>
                          <Badge variant="default">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Aktif
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Terakhir diperbarui:</span>
                          <span className="text-sm">
                            {new Date(paymentSettings.updatedAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Kredensial</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Server Key:</span>
                          <span className="text-sm font-mono">
                            {paymentSettings.serverKey ? `${paymentSettings.serverKey.substring(0, 15)}...` : 'Tidak tersedia'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Client Key:</span>
                          <span className="text-sm font-mono">
                            {paymentSettings.clientKey ? `${paymentSettings.clientKey.substring(0, 15)}...` : 'Tidak tersedia'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    <Button
                      onClick={handleTestConnection}
                      disabled={isTestingConnection || testConnectionMutation.isPending}
                      className="flex-1"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      {isTestingConnection ? 'Menguji Koneksi...' : 'Test Koneksi Midtrans'}
                    </Button>
                  </div>

                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Konfigurasi Midtrans Anda sudah siap digunakan. Sistem pembayaran akan menggunakan 
                      environment <strong>{paymentSettings.isProduction ? 'Production' : 'Sandbox'}</strong>.
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Silakan konfigurasikan kredensial Midtrans terlebih dahulu di tab <strong>Konfigurasi</strong> 
                    untuk melakukan testing koneksi.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}