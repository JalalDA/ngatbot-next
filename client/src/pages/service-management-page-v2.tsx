import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, Package, DollarSign, Users, Heart, Eye, MessageCircle, 
  ArrowRight, Zap, Settings, Play, QrCode, CreditCard, ToggleLeft, ToggleRight,
  Workflow, Layers, GitBranch, Monitor, Bot, Sparkles, Save, X
} from 'lucide-react';

interface ServiceCategory {
  id: number;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
  packagesCount?: number;
}

interface ServicePackage {
  id: number;
  categoryId: number;
  name: string;
  quantity: number;
  price: number;
  description: string;
  isActive: boolean;
}

interface ButtonFlow {
  id: string;
  type: 'category' | 'service' | 'payment';
  label: string;
  description?: string;
  isActive: boolean;
  order: number;
  nextStep?: string;
  integrations: {
    midtransQR: boolean;
    smmPanel: boolean;
    customAction: boolean;
  };
}

const categoryIcons = {
  followers: Users,
  likes: Heart,
  views: Eye,
  comments: MessageCircle,
  package: Package,
};

export default function ServiceManagementPageV2() {
  const { toast } = useToast();
  const [activeWorkflow, setActiveWorkflow] = useState<'design' | 'preview' | 'settings'>('design');
  const [selectedFlow, setSelectedFlow] = useState<ButtonFlow | null>(null);
  
  // Categories state management
  const [categories, setCategories] = useState<ServiceCategory[]>([
    { id: 1, name: 'Followers', icon: 'followers', description: 'Instagram/TikTok Followers', isActive: true, packagesCount: 3 },
    { id: 2, name: 'Likes', icon: 'likes', description: 'Instagram/TikTok Likes', isActive: true, packagesCount: 4 },
    { id: 3, name: 'Views', icon: 'views', description: 'YouTube/TikTok Views', isActive: true, packagesCount: 2 },
    { id: 4, name: 'Comments', icon: 'comments', description: 'Instagram Comments', isActive: false, packagesCount: 1 },
  ]);

  const [buttonFlows, setButtonFlows] = useState<ButtonFlow[]>([
    {
      id: 'category_1',
      type: 'category',
      label: 'Followers',
      description: 'Instagram/TikTok Followers',
      isActive: true,
      order: 1,
      nextStep: 'service_selection',
      integrations: { midtransQR: true, smmPanel: true, customAction: false }
    },
    {
      id: 'category_2', 
      type: 'category',
      label: 'Likes',
      description: 'Instagram/TikTok Likes',
      isActive: true,
      order: 2,
      nextStep: 'service_selection',
      integrations: { midtransQR: true, smmPanel: true, customAction: false }
    }
  ]);

  const mockPackages: ServicePackage[] = [
    { id: 1, categoryId: 1, name: '1K Followers', quantity: 1000, price: 5000, description: 'High quality followers', isActive: true },
    { id: 2, categoryId: 1, name: '5K Followers', quantity: 5000, price: 20000, description: 'Premium followers package', isActive: true },
    { id: 3, categoryId: 1, name: '10K Followers', quantity: 10000, price: 35000, description: 'Ultimate followers boost', isActive: true },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = categoryIcons[iconName as keyof typeof categoryIcons] || Package;
    return IconComponent;
  };

  // Delete category function
  const deleteCategory = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/service-categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal menghapus kategori');
      }

      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      toast({
        title: "Berhasil",
        description: "Kategori berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal menghapus kategori",
        variant: "destructive",
      });
    }
  };

  // Toggle category status function
  const toggleCategoryStatus = async (categoryId: number) => {
    try {
      const response = await fetch(`/api/service-categories/${categoryId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Gagal mengubah status kategori');
      }

      const result = await response.json();
      
      setCategories(prev => prev.map(cat => 
        cat.id === categoryId ? { ...cat, isActive: result.isActive } : cat
      ));
      
      toast({
        title: "Berhasil",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Gagal mengubah status kategori",
        variant: "destructive",
      });
    }
  };

  const FlowDesigner = () => (
    <div className="space-y-6">
      {/* Workflow Header */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border-2 border-blue-200 dark:border-blue-700 shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Workflow className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Service Workflow Designer
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Buat alur tombol interaktif untuk bot Telegram Anda
            </p>
          </div>
        </div>
      </div>

      {/* Flow Steps */}
      <div className="grid gap-6">
        {/* Step 1: Menu Utama/Kategory */}
        <Card className="border-2 border-blue-200 dark:border-blue-700 hover:border-blue-400 transition-colors bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Menu Utama / Kategory</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">Tombol kategori utama yang akan muncul di bot</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/20">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Button
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map(category => {
                const IconComponent = getIconComponent(category.icon);
                return (
                  <Card key={category.id} className={`cursor-pointer transition-all hover:shadow-lg bg-white dark:bg-gray-800 border-2 ${
                    category.isActive 
                      ? 'border-green-300 shadow-green-100 dark:border-green-600' 
                      : 'border-gray-300 dark:border-gray-600 opacity-70'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <IconComponent className={`h-5 w-5 ${category.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
                          <span className={`font-semibold ${category.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                            {category.name}
                          </span>
                        </div>
                        <Badge variant={category.isActive ? 'default' : 'secondary'} className={category.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}>
                          {category.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        {category.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {category.packagesCount} paket
                        </span>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleCategoryStatus(category.id)}
                            className={`border ${category.isActive 
                              ? 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20' 
                              : 'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                          >
                            {category.isActive ? 'ON' : 'OFF'}
                          </Button>
                          <Button size="sm" variant="outline" className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deleteCategory(category.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Arrow Connector */}
        <div className="flex justify-center">
          <ArrowRight className="h-8 w-8 text-blue-500" />
        </div>

        {/* Step 2: Nama Layanan */}
        <Card className="border-2 border-purple-200 dark:border-purple-700 hover:border-purple-400 transition-colors bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="bg-purple-50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                <div>
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Nama Layanan</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-300">Paket layanan yang tersedia dalam setiap kategori</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-400 dark:hover:bg-purple-900/20">
                <Plus className="h-4 w-4 mr-2" />
                Tambah Layanan
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-4">
              {mockPackages.map(pkg => (
                <Card key={pkg.id} className="border-2 border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">{pkg.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{pkg.description}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-semibold text-gray-900 dark:text-white">{formatCurrency(pkg.price)}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{pkg.quantity.toLocaleString()} items</div>
                        </div>
                        <Badge variant={pkg.isActive ? 'default' : 'secondary'} className={pkg.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}>
                          {pkg.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Arrow Connector */}
        <div className="flex justify-center">
          <ArrowRight className="h-8 w-8 text-purple-500" />
        </div>

        {/* Step 3: Payment Flow */}
        <Card className="border-2 border-green-200 dark:border-green-700 hover:border-green-400 transition-colors bg-white dark:bg-gray-800 shadow-lg">
          <CardHeader className="bg-green-50 dark:bg-green-900/30 border-b border-green-200 dark:border-green-700">
            <div className="flex items-center space-x-3">
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
              <div>
                <CardTitle className="text-lg text-gray-900 dark:text-white">Pembayaran & Integrasi</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300">Konfigurasi metode pembayaran dan integrasi layanan</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Midtrans QR */}
              <Card className="border border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="p-4 text-center">
                  <QrCode className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                  <h4 className="font-semibold mb-2">Integrasi Midtrans QR</h4>
                  <p className="text-sm text-gray-600 mb-3">Pembayaran QRIS otomatis</p>
                  <Button size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Konfigurasi
                  </Button>
                </CardContent>
              </Card>

              {/* SMM Panel Service */}
              <Card className="border border-purple-200 bg-purple-50 dark:bg-purple-950/20">
                <CardContent className="p-4 text-center">
                  <Layers className="h-12 w-12 text-purple-600 mx-auto mb-3" />
                  <h4 className="font-semibold mb-2">SMM Panel Service</h4>
                  <p className="text-sm text-gray-600 mb-3">Otomatis order ke provider</p>
                  <Button size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Konfigurasi
                  </Button>
                </CardContent>
              </Card>

              {/* Custom Action */}
              <Card className="border border-orange-200 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="p-4 text-center">
                  <Zap className="h-12 w-12 text-orange-600 mx-auto mb-3" />
                  <h4 className="font-semibold mb-2">Aksi Kustom</h4>
                  <p className="text-sm text-gray-600 mb-3">Webhook atau notifikasi</p>
                  <Button size="sm" className="w-full">
                    <Settings className="h-4 w-4 mr-2" />
                    Konfigurasi
                  </Button>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const PreviewBot = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-xl border">
        <div className="flex items-center space-x-3 mb-4">
          <Bot className="h-8 w-8 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold">Preview Bot Telegram</h2>
            <p className="text-gray-600 dark:text-gray-400">Simulasi tampilan bot untuk pengguna</p>
          </div>
        </div>
        
        {/* Bot Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            {/* Bot Header */}
            <div className="bg-blue-500 text-white p-4 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold">SMM Bot</h3>
                  <p className="text-sm opacity-90">Online</p>
                </div>
              </div>
            </div>
            
            {/* Bot Messages */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 space-y-3">
              <div className="bg-white dark:bg-gray-600 p-3 rounded-lg shadow-sm">
                <p className="text-sm">🤖 Selamat datang! Pilih layanan yang Anda inginkan:</p>
              </div>
              
              {/* Category Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {categories.filter(cat => cat.isActive).map(category => {
                  const IconComponent = getIconComponent(category.icon);
                  return (
                    <Button
                      key={category.id}
                      variant="outline"
                      className="h-auto p-3 flex flex-col items-center space-y-1"
                    >
                      <IconComponent className="h-5 w-5" />
                      <span className="text-xs">{category.name}</span>
                    </Button>
                  );
                })}
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  💡 Preview akan diupdate sesuai konfigurasi Anda
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
            Service Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Design alur layanan interaktif untuk bot Telegram Anda
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Monitor className="h-4 w-4 mr-2" />
            Test Bot
          </Button>
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Terapkan
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeWorkflow} onValueChange={(value) => setActiveWorkflow(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="design" className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4" />
            <span>Design Workflow</span>
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center space-x-2">
            <Monitor className="h-4 w-4" />
            <span>Preview Bot</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Pengaturan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="design">
          <FlowDesigner />
        </TabsContent>

        <TabsContent value="preview">
          <PreviewBot />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Lanjutan</CardTitle>
              <CardDescription>
                Konfigurasi integrasi dan pengaturan sistem
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Auto Deploy</h4>
                    <p className="text-sm text-gray-600">Terapkan perubahan secara otomatis</p>
                  </div>
                  <Button variant="outline">ON</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Analytics</h4>
                    <p className="text-sm text-gray-600">Lacak penggunaan tombol</p>
                  </div>
                  <Button variant="outline">OFF</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}