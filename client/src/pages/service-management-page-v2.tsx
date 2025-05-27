import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, Package, DollarSign, Users, Heart, Eye, MessageCircle, 
  ArrowRight, Zap, Settings, Play, QrCode, CreditCard, Save, X
} from 'lucide-react';

interface ServiceButton {
  id: string;
  text: string;
  stepType: 'category' | 'service' | 'quantity' | 'price' | 'payment';
  isActive: boolean;
  order: number;
  config: {
    name?: string;
    quantity?: number;
    price?: number;
    description?: string;
    icon?: string;
    integrationSettings?: {
      midtransQR?: boolean;
      smmPanel?: boolean;
      customAction?: boolean;
    };
  };
}

interface FormData {
  text: string;
  name: string;
  quantity: string;
  price: string;
  description: string;
  icon: string;
  midtransQR: boolean;
  smmPanel: boolean;
  customAction: boolean;
}

const categoryIcons = {
  followers: Users,
  likes: Heart,
  views: Eye,
  comments: MessageCircle,
  package: Package,
};

const stepTitles = {
  category: 'MENU UTAMA / KATEGORY',
  service: 'NAMA LAYANAN',
  quantity: 'JUMLAH',
  price: 'HARGA',
  payment: 'BAYAR'
};

export default function ServiceManagementPageV2() {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<'category' | 'service' | 'quantity' | 'price' | 'payment'>('category');
  const [showDialog, setShowDialog] = useState(false);
  const [editingButton, setEditingButton] = useState<ServiceButton | null>(null);
  
  // Service buttons management
  const [serviceButtons, setServiceButtons] = useState<ServiceButton[]>([
    {
      id: 'btn_1',
      text: 'Instagram Followers',
      stepType: 'category',
      isActive: true,
      order: 1,
      config: {
        name: 'Instagram Followers',
        description: 'High quality Instagram followers',
        icon: 'followers',
        integrationSettings: {
          midtransQR: false,
          smmPanel: true,
          customAction: false
        }
      }
    },
    {
      id: 'btn_2', 
      text: 'Instagram Likes',
      stepType: 'category',
      isActive: true,
      order: 2,
      config: {
        name: 'Instagram Likes',
        description: 'Instant Instagram likes',
        icon: 'likes',
        integrationSettings: {
          midtransQR: false,
          smmPanel: true,
          customAction: false
        }
      }
    }
  ]);

  // Form data for adding/editing buttons
  const [formData, setFormData] = useState<FormData>({
    text: '',
    name: '',
    quantity: '',
    price: '',
    description: '',
    icon: 'package',
    midtransQR: false,
    smmPanel: false,
    customAction: false
  });

  const getIconComponent = (iconName: string) => {
    const IconComponent = categoryIcons[iconName as keyof typeof categoryIcons] || Package;
    return IconComponent;
  };

  // Get buttons for current step
  const getCurrentStepButtons = () => {
    return serviceButtons.filter(btn => btn.stepType === activeStep);
  };

  // Add new button function
  const handleAddButton = () => {
    setEditingButton(null);
    setFormData({
      text: '',
      name: '',
      quantity: '',
      price: '',
      description: '',
      icon: 'package',
      midtransQR: false,
      smmPanel: false,
      customAction: false
    });
    setShowDialog(true);
  };

  // Edit button function
  const handleEditButton = (button: ServiceButton) => {
    setEditingButton(button);
    setFormData({
      text: button.text,
      name: button.config.name || '',
      quantity: button.config.quantity?.toString() || '',
      price: button.config.price?.toString() || '',
      description: button.config.description || '',
      icon: button.config.icon || 'package',
      midtransQR: button.config.integrationSettings?.midtransQR || false,
      smmPanel: button.config.integrationSettings?.smmPanel || false,
      customAction: button.config.integrationSettings?.customAction || false
    });
    setShowDialog(true);
  };

  // Save button function
  const handleSaveButton = () => {
    if (!formData.text.trim()) {
      toast({
        title: "Error",
        description: "Nama tombol tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    const newButton: ServiceButton = {
      id: editingButton?.id || `btn_${Date.now()}`,
      text: formData.text,
      stepType: activeStep,
      isActive: true,
      order: editingButton?.order || serviceButtons.filter(b => b.stepType === activeStep).length + 1,
      config: {
        name: formData.name,
        quantity: formData.quantity ? parseInt(formData.quantity) : undefined,
        price: formData.price ? parseInt(formData.price) : undefined,
        description: formData.description,
        icon: formData.icon,
        integrationSettings: {
          midtransQR: formData.midtransQR,
          smmPanel: formData.smmPanel,
          customAction: formData.customAction
        }
      }
    };

    if (editingButton) {
      setServiceButtons(prev => prev.map(btn => 
        btn.id === editingButton.id ? newButton : btn
      ));
      toast({
        title: "Berhasil",
        description: "Tombol berhasil diperbarui",
      });
    } else {
      setServiceButtons(prev => [...prev, newButton]);
      toast({
        title: "Berhasil", 
        description: "Tombol baru berhasil ditambahkan",
      });
    }

    setShowDialog(false);
    setEditingButton(null);
  };

  // Delete button function
  const handleDeleteButton = (buttonId: string) => {
    setServiceButtons(prev => prev.filter(btn => btn.id !== buttonId));
    toast({
      title: "Berhasil",
      description: "Tombol berhasil dihapus",
    });
  };

  // Toggle button status
  const handleToggleButton = (buttonId: string) => {
    setServiceButtons(prev => prev.map(btn => 
      btn.id === buttonId ? { ...btn, isActive: !btn.isActive } : btn
    ));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Service Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Kelola alur tombol layanan untuk bot Telegram Anda
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Play className="h-4 w-4 mr-2" />
            Test Bot
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Simpan
          </Button>
        </div>
      </div>

      {/* Step Navigation */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg text-gray-900 dark:text-white">Alur Tombol Layanan</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Pilih langkah untuk mengelola tombol-tombol pada setiap tahap
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center space-x-4 overflow-x-auto pb-4">
            {Object.entries(stepTitles).map(([step, title], index) => (
              <div key={step} className="flex items-center">
                <div 
                  className={`flex flex-col items-center cursor-pointer transition-all ${
                    activeStep === step 
                      ? 'text-blue-600 dark:text-blue-400' 
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  onClick={() => setActiveStep(step as any)}
                >
                  <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold mb-2 ${
                    activeStep === step
                      ? 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'border-gray-300 bg-gray-50 text-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="text-xs font-medium text-center max-w-16">{title}</span>
                </div>
                {index < Object.keys(stepTitles).length - 1 && (
                  <ArrowRight className="h-6 w-6 text-gray-300 dark:text-gray-600 mx-2" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <Card className="bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">
                {stepTitles[activeStep]}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300">
                Kelola tombol untuk tahap {stepTitles[activeStep].toLowerCase()}
              </CardDescription>
            </div>
            <Button onClick={handleAddButton} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Tombol
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4">
            {getCurrentStepButtons().length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Belum ada tombol
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  Tambahkan tombol pertama untuk tahap {stepTitles[activeStep].toLowerCase()}
                </p>
                <Button onClick={handleAddButton} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Tombol
                </Button>
              </div>
            ) : (
              getCurrentStepButtons().map((button) => {
                const IconComponent = getIconComponent(button.config.icon || 'package');
                return (
                  <Card key={button.id} className={`border-2 transition-all ${
                    button.isActive 
                      ? 'border-green-300 bg-green-50 dark:border-green-600 dark:bg-green-900/20' 
                      : 'border-gray-300 dark:border-gray-600 opacity-70'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <IconComponent className={`h-6 w-6 ${
                            button.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                          }`} />
                          <div>
                            <h4 className={`font-semibold ${
                              button.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {button.text}
                            </h4>
                            {button.config.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300">
                                {button.config.description}
                              </p>
                            )}
                            {(button.config.quantity || button.config.price) && (
                              <div className="flex space-x-4 mt-1">
                                {button.config.quantity && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Jumlah: {button.config.quantity.toLocaleString()}
                                  </span>
                                )}
                                {button.config.price && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Harga: {formatCurrency(button.config.price)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Integration badges */}
                          <div className="flex space-x-1">
                            {button.config.integrationSettings?.midtransQR && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                <QrCode className="h-3 w-3 mr-1" />
                                QRIS
                              </Badge>
                            )}
                            {button.config.integrationSettings?.smmPanel && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                <Zap className="h-3 w-3 mr-1" />
                                SMM
                              </Badge>
                            )}
                            {button.config.integrationSettings?.customAction && (
                              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                <Settings className="h-3 w-3 mr-1" />
                                Custom
                              </Badge>
                            )}
                          </div>
                          
                          <Badge variant={button.isActive ? 'default' : 'secondary'} className={
                            button.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''
                          }>
                            {button.isActive ? 'Aktif' : 'Nonaktif'}
                          </Badge>
                          
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleButton(button.id)}
                              className={`border ${button.isActive 
                                ? 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20' 
                                : 'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800'
                              }`}
                            >
                              {button.isActive ? 'ON' : 'OFF'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleEditButton(button)}
                              className="border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteButton(button.id)}
                              className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingButton ? 'Edit Tombol' : 'Tambah Tombol Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingButton ? 'Edit pengaturan tombol' : `Tambah tombol baru untuk tahap ${stepTitles[activeStep].toLowerCase()}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Nama Tombol *</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Masukkan nama tombol"
              />
            </div>

            <div>
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Deskripsi singkat tombol"
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="icon">Icon</Label>
              <Select value={formData.icon} onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih icon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="followers">👥 Followers</SelectItem>
                  <SelectItem value="likes">❤️ Likes</SelectItem>
                  <SelectItem value="views">👁️ Views</SelectItem>
                  <SelectItem value="comments">💬 Comments</SelectItem>
                  <SelectItem value="package">📦 Package</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(activeStep === 'quantity' || activeStep === 'service') && (
              <div>
                <Label htmlFor="quantity">Jumlah</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                  placeholder="Masukkan jumlah"
                />
              </div>
            )}

            {(activeStep === 'price' || activeStep === 'service') && (
              <div>
                <Label htmlFor="price">Harga (IDR)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="Masukkan harga"
                />
              </div>
            )}

            {activeStep === 'payment' && (
              <div className="space-y-3">
                <Label>Integrasi Pembayaran</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.midtransQR}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, midtransQR: checked }))}
                    />
                    <Label className="text-sm">Integrasi Midtrans QR</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.smmPanel}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, smmPanel: checked }))}
                    />
                    <Label className="text-sm">Integrasi SMM Panel Service</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.customAction}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, customAction: checked }))}
                    />
                    <Label className="text-sm">Menandakan aktif</Label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              <X className="h-4 w-4 mr-2" />
              Batal
            </Button>
            <Button onClick={handleSaveButton}>
              <Save className="h-4 w-4 mr-2" />
              {editingButton ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}