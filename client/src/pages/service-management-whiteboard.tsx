import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, Package, Users, Heart, Eye, MessageCircle, 
  ArrowRight, Zap, Settings, QrCode, Save, X, GripVertical, Move
} from 'lucide-react';

interface ServiceButton {
  id: string;
  text: string;
  stepType: 'category' | 'service' | 'quantity' | 'price' | 'payment';
  isActive: boolean;
  order: number;
  x?: number;
  y?: number;
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

const stepColumns = [
  { key: 'category', title: 'Menu utama / KATAGORY', color: 'bg-blue-50 border-blue-200' },
  { key: 'service', title: 'NAMA LAYANAN', color: 'bg-green-50 border-green-200' },
  { key: 'quantity', title: 'JUMLAH', color: 'bg-yellow-50 border-yellow-200' },
  { key: 'price', title: 'HARGA', color: 'bg-orange-50 border-orange-200' },
  { key: 'payment', title: 'BAYAR', color: 'bg-purple-50 border-purple-200' }
];

export default function ServiceManagementWhiteboard() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingButton, setEditingButton] = useState<ServiceButton | null>(null);
  const [selectedStep, setSelectedStep] = useState<string>('category');
  const [draggedButton, setDraggedButton] = useState<ServiceButton | null>(null);

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
    },
    {
      id: 'btn_3',
      text: '1000 Followers',
      stepType: 'service',
      isActive: true,
      order: 1,
      config: {
        name: '1000 Followers Package',
        quantity: 1000,
        icon: 'followers',
        integrationSettings: {
          smmPanel: true
        }
      }
    },
    {
      id: 'btn_4',
      text: 'Rp 15.000',
      stepType: 'price',
      isActive: true,
      order: 1,
      config: {
        price: 15000,
        icon: 'package'
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

  // Get buttons for specific step
  const getButtonsForStep = (stepType: string) => {
    return serviceButtons.filter(btn => btn.stepType === stepType);
  };

  // Add new button function
  const handleAddButton = (stepType: string) => {
    setSelectedStep(stepType);
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
    setSelectedStep(button.stepType);
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
      stepType: selectedStep as any,
      isActive: true,
      order: editingButton?.order || getButtonsForStep(selectedStep).length + 1,
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, button: ServiceButton) => {
    setDraggedButton(button);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStepType: string) => {
    e.preventDefault();
    if (draggedButton && draggedButton.stepType !== targetStepType) {
      setServiceButtons(prev => prev.map(btn => 
        btn.id === draggedButton.id 
          ? { ...btn, stepType: targetStepType as any, order: getButtonsForStep(targetStepType).length + 1 }
          : btn
      ));
      toast({
        title: "Berhasil",
        description: `Tombol dipindahkan ke ${stepColumns.find(col => col.key === targetStepType)?.title}`,
      });
    }
    setDraggedButton(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Service Management Whiteboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Drag & drop tombol antar kolom atau klik + untuk menambah tombol baru
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Save className="h-4 w-4 mr-2" />
              Simpan Konfigurasi
            </Button>
          </div>
        </div>
      </div>

      {/* Whiteboard Canvas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 min-h-[600px]">
        <div className="grid grid-cols-5 gap-6 h-full">
          {stepColumns.map((column, index) => (
            <div key={column.key} className="flex flex-col">
              {/* Column Header */}
              <div className={`rounded-lg border-2 ${column.color} dark:bg-gray-700 dark:border-gray-600 p-4 mb-4`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200 text-center w-full">
                    {column.title}
                  </h3>
                </div>
                <Button 
                  onClick={() => handleAddButton(column.key)}
                  className="w-full h-10 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 border-2 border-dashed border-gray-400 dark:border-gray-500 text-gray-600 dark:text-gray-300"
                  variant="outline"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </div>

              {/* Drop Zone */}
              <div 
                className="flex-1 min-h-[400px] p-2 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700 space-y-3"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, column.key)}
              >
                {getButtonsForStep(column.key).map((button) => {
                  const IconComponent = getIconComponent(button.config.icon || 'package');
                  return (
                    <div
                      key={button.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, button)}
                      className={`group relative cursor-move ${
                        button.isActive 
                          ? 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 shadow-md' 
                          : 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 opacity-70'
                      } rounded-lg p-3 transition-all hover:shadow-lg hover:scale-105`}
                    >
                      {/* Drag Handle */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>

                      <div className="flex items-start space-x-2">
                        <IconComponent className={`h-5 w-5 mt-0.5 ${
                          button.isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-sm ${
                            button.isActive ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {button.text}
                          </h4>
                          {button.config.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {button.config.description}
                            </p>
                          )}
                          
                          {/* Additional info */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {button.config.quantity && (
                              <Badge variant="outline" className="text-xs">
                                {button.config.quantity.toLocaleString()}
                              </Badge>
                            )}
                            {button.config.price && (
                              <Badge variant="outline" className="text-xs">
                                {formatCurrency(button.config.price)}
                              </Badge>
                            )}
                          </div>

                          {/* Integration badges */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {button.config.integrationSettings?.midtransQR && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                QRIS
                              </Badge>
                            )}
                            {button.config.integrationSettings?.smmPanel && (
                              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                SMM
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleButton(button.id)}
                            className={`h-6 px-2 text-xs ${button.isActive 
                              ? 'text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20' 
                              : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
                            }`}
                          >
                            {button.isActive ? 'ON' : 'OFF'}
                          </Button>
                        </div>
                        <div className="flex space-x-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleEditButton(button)}
                            className="h-6 px-2 text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteButton(button.id)}
                            className="h-6 px-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty state with add button */}
                {getButtonsForStep(column.key).length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <Button 
                      onClick={() => handleAddButton(column.key)}
                      variant="ghost"
                      className="h-full w-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Arrow to next column */}
              {index < stepColumns.length - 1 && (
                <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <div className="bg-white dark:bg-gray-800 rounded-full p-1 border border-gray-300 dark:border-gray-600 shadow-sm">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingButton ? 'Edit Tombol' : 'Tambah Tombol Baru'}
            </DialogTitle>
            <DialogDescription>
              {editingButton ? 'Edit pengaturan tombol' : `Tambah tombol baru untuk kolom ${stepColumns.find(col => col.key === selectedStep)?.title}`}
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

            {(selectedStep === 'quantity' || selectedStep === 'service') && (
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

            {(selectedStep === 'price' || selectedStep === 'service') && (
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

            {selectedStep === 'payment' && (
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
                    <Label className="text-sm">Custom Action</Label>
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