import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Package, DollarSign, Users, Heart, Eye, MessageCircle, ToggleLeft, ToggleRight } from 'lucide-react';

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
  serviceId?: string;
}

const categoryIcons = {
  'followers': Users,
  'likes': Heart,
  'views': Eye,
  'comments': MessageCircle,
};

export default function ServiceManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddPackageOpen, setIsAddPackageOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

  // Categories state management
  const [categories, setCategories] = useState<ServiceCategory[]>([
    { id: 1, name: 'Followers', icon: 'followers', description: 'Instagram/TikTok Followers', isActive: true, packagesCount: 3 },
    { id: 2, name: 'Likes', icon: 'likes', description: 'Instagram/TikTok Likes', isActive: true, packagesCount: 4 },
    { id: 3, name: 'Views', icon: 'views', description: 'YouTube/TikTok Views', isActive: true, packagesCount: 2 },
    { id: 4, name: 'Comments', icon: 'comments', description: 'Instagram Comments', isActive: false, packagesCount: 1 },
  ]);

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

      // Update local state
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
      
      // Update local state
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

  const mockPackages: ServicePackage[] = [
    { id: 1, categoryId: 1, name: '1K Followers', quantity: 1000, price: 5000, description: 'High quality followers', isActive: true },
    { id: 2, categoryId: 1, name: '5K Followers', quantity: 5000, price: 20000, description: 'Premium followers package', isActive: true },
    { id: 3, categoryId: 1, name: '10K Followers', quantity: 10000, price: 35000, description: 'Ultimate followers boost', isActive: true },
    { id: 4, categoryId: 2, name: '500 Likes', quantity: 500, price: 2000, description: 'Instant likes', isActive: true },
    { id: 5, categoryId: 2, name: '1K Likes', quantity: 1000, price: 3500, description: 'Popular post boost', isActive: true },
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

  const filteredPackages = selectedCategory 
    ? mockPackages.filter(pkg => pkg.categoryId === selectedCategory)
    : mockPackages;

  const CategoryForm = ({ category, onClose }: { category?: ServiceCategory, onClose: () => void }) => {
    const [formData, setFormData] = useState({
      name: category?.name || '',
      icon: category?.icon || 'package',
      description: category?.description || '',
      isActive: category?.isActive ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Implementasi save category
      toast({
        title: category ? 'Kategori diperbarui' : 'Kategori ditambahkan',
        description: `${formData.name} berhasil ${category ? 'diperbarui' : 'ditambahkan'}`,
      });
      onClose();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Nama Kategori</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="contoh: Followers"
            required
          />
        </div>
        <div>
          <Label htmlFor="description">Deskripsi</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="contoh: Instagram/TikTok Followers"
          />
        </div>
        <div>
          <Label htmlFor="icon">Icon</Label>
          <select
            id="icon"
            value={formData.icon}
            onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            className="w-full p-2 border rounded-md"
          >
            <option value="followers">👥 Followers</option>
            <option value="likes">❤️ Likes</option>
            <option value="views">👁️ Views</option>
            <option value="comments">💬 Comments</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          <Label htmlFor="isActive">Aktif</Label>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit">
            {category ? 'Perbarui' : 'Tambah'} Kategori
          </Button>
        </div>
      </form>
    );
  };

  const PackageForm = ({ package: pkg, onClose }: { package?: ServicePackage, onClose: () => void }) => {
    const [formData, setFormData] = useState({
      categoryId: pkg?.categoryId || selectedCategory || 1,
      name: pkg?.name || '',
      quantity: pkg?.quantity || 0,
      price: pkg?.price || 0,
      description: pkg?.description || '',
      isActive: pkg?.isActive ?? true,
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      // Implementasi save package
      toast({
        title: pkg ? 'Paket diperbarui' : 'Paket ditambahkan',
        description: `${formData.name} berhasil ${pkg ? 'diperbarui' : 'ditambahkan'}`,
      });
      onClose();
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="categoryId">Kategori</Label>
          <select
            id="categoryId"
            value={formData.categoryId}
            onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
            className="w-full p-2 border rounded-md"
            required
          >
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="packageName">Nama Paket</Label>
          <Input
            id="packageName"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="contoh: 1K Followers"
            required
          />
        </div>
        <div>
          <Label htmlFor="quantity">Jumlah</Label>
          <Input
            id="quantity"
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
            placeholder="1000"
            required
          />
        </div>
        <div>
          <Label htmlFor="price">Harga (IDR)</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
            placeholder="5000"
            required
          />
        </div>
        <div>
          <Label htmlFor="packageDescription">Deskripsi</Label>
          <Input
            id="packageDescription"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="High quality followers"
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="packageActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          />
          <Label htmlFor="packageActive">Aktif</Label>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit">
            {pkg ? 'Perbarui' : 'Tambah'} Paket
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">
            Kelola kategori layanan dan paket untuk bot Telegram Anda
          </p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList>
          <TabsTrigger value="categories">Kategori Layanan</TabsTrigger>
          <TabsTrigger value="packages">Paket Layanan</TabsTrigger>
          <TabsTrigger value="preview">Preview Menu</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Kategori Layanan</h2>
            <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Kategori
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Kategori Baru</DialogTitle>
                  <DialogDescription>
                    Buat kategori layanan baru untuk bot Telegram Anda
                  </DialogDescription>
                </DialogHeader>
                <CategoryForm onClose={() => setIsAddCategoryOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const IconComponent = getIconComponent(category.icon);
              return (
                <Card key={category.id} className={!category.isActive ? 'opacity-50' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <IconComponent className="h-5 w-5" />
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                      </div>
                      <Badge variant={category.isActive ? 'default' : 'secondary'}>
                        {category.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {category.packagesCount} paket tersedia
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleCategoryStatus(category.id)}
                          title={category.isActive ? 'Nonaktifkan kategori' : 'Aktifkan kategori'}
                          className={category.isActive ? 'text-green-600' : 'text-gray-400'}
                        >
                          {category.isActive ? 'ON' : 'OFF'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingCategory(category);
                            setIsAddCategoryOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => deleteCategory(category.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Paket Layanan</h2>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <Dialog open={isAddPackageOpen} onOpenChange={setIsAddPackageOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Paket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Paket Baru</DialogTitle>
                  <DialogDescription>
                    Buat paket layanan baru dengan harga dan detail
                  </DialogDescription>
                </DialogHeader>
                <PackageForm onClose={() => setIsAddPackageOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Nama Paket</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPackages.map((pkg) => {
                  const category = categories.find(c => c.id === pkg.categoryId);
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {category && (() => {
                            const IconComponent = getIconComponent(category.icon);
                            return <IconComponent className="h-4 w-4" />;
                          })()}
                          <span>{category?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>{pkg.quantity.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(pkg.price)}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                          {pkg.isActive ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview Menu Telegram Bot</CardTitle>
              <CardDescription>
                Beginilah tampilan menu yang akan dilihat pengguna di bot Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg font-mono text-sm">
                <div className="space-y-2">
                  <div className="font-bold">🤖 Menu Utama</div>
                  {categories.filter(cat => cat.isActive).map(category => {
                    const categoryPackages = mockPackages.filter(pkg => 
                      pkg.categoryId === category.id && pkg.isActive
                    );
                    const IconComponent = getIconComponent(category.icon);
                    
                    return (
                      <div key={category.id} className="ml-4">
                        <div className="flex items-center space-x-2">
                          <span>├──</span>
                          <IconComponent className="h-4 w-4" />
                          <span className="font-semibold">{category.name}</span>
                        </div>
                        {categoryPackages.map((pkg, index) => (
                          <div key={pkg.id} className="ml-8">
                            <div className="flex items-center space-x-2">
                              <span>{index === categoryPackages.length - 1 ? '└──' : '├──'}</span>
                              <span>{pkg.name} - {formatCurrency(pkg.price)}</span>
                            </div>
                            {index === 0 && (
                              <div className="ml-8 text-gray-500">
                                <div>└── Bayar → QRIS Midtrans → Cek Pembayaran → Link Target</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}