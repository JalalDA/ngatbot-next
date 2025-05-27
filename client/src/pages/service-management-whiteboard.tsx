import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, Edit, Trash2, Save, X, CreditCard, Zap, ArrowDown, Link2
} from 'lucide-react';

interface WhiteboardButton {
  id: string;
  text: string;
  callbackData: string;
  url?: string;
  responseText?: string;
  responseImage?: string;
  x: number;
  y: number;
  parentId?: string;
  children: string[];
  isPaymentConnected: boolean;
  isSmmConnected: boolean;
}

interface ButtonFormData {
  text: string;
  callbackData: string;
  url: string;
  responseText: string;
  responseImage: string;
}

export default function ServiceManagementWhiteboard() {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);
  const [editingButton, setEditingButton] = useState<WhiteboardButton | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  
  // Whiteboard buttons state
  const [buttons, setButtons] = useState<WhiteboardButton[]>([]);
  
  // Special buttons
  const [paymentButton, setPaymentButton] = useState<WhiteboardButton | null>(null);
  const [smmButton, setSmmButton] = useState<WhiteboardButton | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<ButtonFormData>({
    text: '',
    callbackData: '',
    url: '',
    responseText: '',
    responseImage: ''
  });

  // Add main button
  const handleAddMainButton = () => {
    setSelectedParentId(null);
    setEditingButton(null);
    setFormData({
      text: '',
      callbackData: '',
      url: '',
      responseText: '',
      responseImage: ''
    });
    setShowDialog(true);
  };

  // Add sub button
  const handleAddSubButton = (parentId: string) => {
    setSelectedParentId(parentId);
    setEditingButton(null);
    setFormData({
      text: '',
      callbackData: '',
      url: '',
      responseText: '',
      responseImage: ''
    });
    setShowDialog(true);
  };

  // Edit button
  const handleEditButton = (button: WhiteboardButton) => {
    setEditingButton(button);
    setFormData({
      text: button.text,
      callbackData: button.callbackData,
      url: button.url || '',
      responseText: button.responseText || '',
      responseImage: button.responseImage || ''
    });
    setShowDialog(true);
  };

  // Save button
  const handleSaveButton = () => {
    if (!formData.text.trim() || !formData.callbackData.trim()) {
      toast({
        title: "Error",
        description: "Nama button dan callback data harus diisi",
        variant: "destructive",
      });
      return;
    }

    const newButton: WhiteboardButton = {
      id: editingButton?.id || `btn_${Date.now()}`,
      text: formData.text,
      callbackData: formData.callbackData,
      url: formData.url,
      responseText: formData.responseText,
      responseImage: formData.responseImage,
      x: editingButton?.x || Math.random() * 400 + 100,
      y: editingButton?.y || Math.random() * 300 + 100,
      parentId: selectedParentId || editingButton?.parentId,
      children: editingButton?.children || [],
      isPaymentConnected: editingButton?.isPaymentConnected || false,
      isSmmConnected: editingButton?.isSmmConnected || false,
    };

    if (editingButton) {
      setButtons(prev => prev.map(btn => 
        btn.id === editingButton.id ? newButton : btn
      ));
      toast({
        title: "Berhasil",
        description: "Button berhasil diperbarui",
      });
    } else {
      setButtons(prev => [...prev, newButton]);
      
      // Update parent's children array
      if (selectedParentId) {
        setButtons(prev => prev.map(btn => 
          btn.id === selectedParentId 
            ? { ...btn, children: [...btn.children, newButton.id] }
            : btn
        ));
      }
      
      toast({
        title: "Berhasil", 
        description: "Button baru berhasil ditambahkan",
      });
    }

    setShowDialog(false);
    setEditingButton(null);
    setSelectedParentId(null);
  };

  // Delete button
  const handleDeleteButton = (buttonId: string) => {
    const buttonToDelete = buttons.find(btn => btn.id === buttonId);
    if (!buttonToDelete) return;

    // Remove from parent's children array
    if (buttonToDelete.parentId) {
      setButtons(prev => prev.map(btn => 
        btn.id === buttonToDelete.parentId 
          ? { ...btn, children: btn.children.filter(childId => childId !== buttonId) }
          : btn
      ));
    }

    // Remove button and all its children
    const getAllChildren = (btnId: string): string[] => {
      const btn = buttons.find(b => b.id === btnId);
      if (!btn) return [];
      
      let allChildren = [...btn.children];
      btn.children.forEach(childId => {
        allChildren = [...allChildren, ...getAllChildren(childId)];
      });
      return allChildren;
    };

    const childrenToDelete = getAllChildren(buttonId);
    setButtons(prev => prev.filter(btn => 
      btn.id !== buttonId && !childrenToDelete.includes(btn.id)
    ));

    toast({
      title: "Berhasil",
      description: "Button dan sub-button berhasil dihapus",
    });
  };

  // Add payment button
  const handleAddPaymentButton = () => {
    if (paymentButton) {
      toast({
        title: "Info",
        description: "Payment button sudah ada",
        variant: "destructive",
      });
      return;
    }

    const newPaymentButton: WhiteboardButton = {
      id: `payment_${Date.now()}`,
      text: '💳 PAYMENT',
      callbackData: 'payment_process',
      responseText: 'Memproses pembayaran...',
      x: 600,
      y: 100,
      parentId: undefined,
      children: [],
      isPaymentConnected: false,
      isSmmConnected: false,
    };

    setPaymentButton(newPaymentButton);
    toast({
      title: "Berhasil",
      description: "Payment button berhasil ditambahkan",
    });
  };

  // Add SMM button
  const handleAddSmmButton = () => {
    if (smmButton) {
      toast({
        title: "Info",
        description: "SMM button sudah ada",
        variant: "destructive",
      });
      return;
    }

    const newSmmButton: WhiteboardButton = {
      id: `smm_${Date.now()}`,
      text: '⚡ SMM PANEL',
      callbackData: 'smm_process',
      responseText: 'Memproses layanan SMM...',
      x: 600,
      y: 200,
      parentId: undefined,
      children: [],
      isPaymentConnected: false,
      isSmmConnected: false,
    };

    setSmmButton(newSmmButton);
    toast({
      title: "Berhasil",
      description: "SMM button berhasil ditambahkan",
    });
  };

  // Connect to payment
  const handleConnectPayment = (buttonId: string) => {
    if (!paymentButton) {
      toast({
        title: "Error",
        description: "Tambahkan payment button terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    // Check if any button already connected to payment
    const alreadyConnected = buttons.some(btn => btn.isPaymentConnected);
    if (alreadyConnected) {
      toast({
        title: "Error",
        description: "Hanya satu button yang bisa terhubung ke payment",
        variant: "destructive",
      });
      return;
    }

    setButtons(prev => prev.map(btn => 
      btn.id === buttonId ? { ...btn, isPaymentConnected: true } : btn
    ));

    toast({
      title: "Berhasil",
      description: "Button berhasil terhubung ke payment",
    });
  };

  // Connect to SMM
  const handleConnectSmm = (buttonId: string) => {
    if (!smmButton) {
      toast({
        title: "Error",
        description: "Tambahkan SMM button terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    // Check if any button already connected to SMM
    const alreadyConnected = buttons.some(btn => btn.isSmmConnected);
    if (alreadyConnected) {
      toast({
        title: "Error",
        description: "Hanya satu button yang bisa terhubung ke SMM",
        variant: "destructive",
      });
      return;
    }

    setButtons(prev => prev.map(btn => 
      btn.id === buttonId ? { ...btn, isSmmConnected: true } : btn
    ));

    toast({
      title: "Berhasil",
      description: "Button berhasil terhubung ke SMM Panel",
    });
  };

  // Get main buttons (no parent)
  const getMainButtons = () => {
    return buttons.filter(btn => !btn.parentId);
  };

  // Get children of a button
  const getChildButtons = (parentId: string) => {
    return buttons.filter(btn => btn.parentId === parentId);
  };

  // Render button connections
  const renderConnections = () => {
    const connections = [];
    
    buttons.forEach(button => {
      // Payment connection
      if (button.isPaymentConnected && paymentButton) {
        connections.push(
          <svg key={`payment-${button.id}`} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            <line
              x1={button.x + 75}
              y1={button.y + 25}
              x2={paymentButton.x}
              y2={paymentButton.y + 25}
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="5,5"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        );
      }

      // SMM connection  
      if (button.isSmmConnected && smmButton) {
        connections.push(
          <svg key={`smm-${button.id}`} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
            <line
              x1={button.x + 75}
              y1={button.y + 25}
              x2={smmButton.x}
              y2={smmButton.y + 25}
              stroke="#8b5cf6"
              strokeWidth="2"
              strokeDasharray="5,5"
              markerEnd="url(#arrowhead)"
            />
          </svg>
        );
      }

      // Parent-child connections
      button.children.forEach(childId => {
        const childButton = buttons.find(b => b.id === childId);
        if (childButton) {
          connections.push(
            <svg key={`connection-${button.id}-${childId}`} className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
              <line
                x1={button.x + 75}
                y1={button.y + 50}
                x2={childButton.x + 75}
                y2={childButton.y}
                stroke="#6b7280"
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
              />
            </svg>
          );
        }
      });
    });

    return connections;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Telegram Bot Whiteboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Drag & drop, tambah button dan hubungkan dengan integrasi
            </p>
          </div>
          <div className="flex space-x-2">
            <Button onClick={handleAddMainButton} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Button Utama
            </Button>
            <Button onClick={handleAddPaymentButton} variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment
            </Button>
            <Button onClick={handleAddSmmButton} variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50">
              <Zap className="h-4 w-4 mr-2" />
              SMM Panel
            </Button>
          </div>
        </div>
      </div>

      {/* Whiteboard Canvas */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 min-h-[700px] overflow-hidden">
        
        {/* Arrow markers for SVG */}
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
             refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
            </marker>
          </defs>
        </svg>

        {/* Render connections */}
        {renderConnections()}

        {/* Main Buttons */}
        {getMainButtons().map((button) => (
          <div key={button.id}>
            {/* Add Button for Main Button (Right side) */}
            <Button
              size="sm"
              className="absolute w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg border-2 border-white"
              style={{
                left: button.x + 160,
                top: button.y + 20,
                zIndex: 15
              }}
              onClick={() => handleAddSubButton(button.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* Main Button */}
            <Card 
              className="absolute cursor-move shadow-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20"
              style={{ 
                left: button.x, 
                top: button.y, 
                width: '150px',
                zIndex: 10
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-200 truncate">
                    {button.text}
                  </h4>
                  <div className="flex space-x-1">
                    {button.isPaymentConnected && (
                      <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
                        💳
                      </Badge>
                    )}
                    {button.isSmmConnected && (
                      <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                        ⚡
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                  Callback: {button.callbackData}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-1">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => handleEditButton(button)}
                      className="h-6 px-1"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleDeleteButton(button.id)}
                      className="h-6 px-1 text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Connection buttons */}
                <div className="flex space-x-1 mt-2">
                  {!button.isPaymentConnected && paymentButton && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleConnectPayment(button.id)}
                      className="h-5 px-1 text-xs border-green-300 text-green-600"
                    >
                      <Link2 className="h-2 w-2 mr-1" />
                      Pay
                    </Button>
                  )}
                  {!button.isSmmConnected && smmButton && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleConnectSmm(button.id)}
                      className="h-5 px-1 text-xs border-purple-300 text-purple-600"
                    >
                      <Link2 className="h-2 w-2 mr-1" />
                      SMM
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sub Buttons */}
            {getChildButtons(button.id).map((subButton, index) => (
              <div key={subButton.id}>
                {/* Add Buttons for Sub Button (Top, Bottom, Right) */}
                <Button
                  size="sm"
                  className="absolute w-6 h-6 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md border border-white"
                  style={{
                    left: button.x + (index * 160) + 20 + 60,
                    top: button.y + 120 - 15,
                    zIndex: 15
                  }}
                  onClick={() => handleAddSubButton(subButton.id)}
                  title="Add Top"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  className="absolute w-6 h-6 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md border border-white"
                  style={{
                    left: button.x + (index * 160) + 20 + 60,
                    top: button.y + 120 + 65,
                    zIndex: 15
                  }}
                  onClick={() => handleAddSubButton(subButton.id)}
                  title="Add Bottom"
                >
                  <Plus className="h-3 w-3" />
                </Button>
                
                <Button
                  size="sm"
                  className="absolute w-6 h-6 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-md border border-white"
                  style={{
                    left: button.x + (index * 160) + 20 + 150,
                    top: button.y + 120 + 25,
                    zIndex: 15
                  }}
                  onClick={() => handleAddSubButton(subButton.id)}
                  title="Add Right"
                >
                  <Plus className="h-3 w-3" />
                </Button>

                <Card 
                  className="absolute cursor-move shadow-md border border-gray-300 bg-gray-50 dark:bg-gray-700"
                  style={{ 
                    left: button.x + (index * 160) + 20, 
                    top: button.y + 120,
                    width: '140px',
                    zIndex: 10
                  }}
                >
                <CardContent className="p-2">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-medium text-xs text-gray-800 dark:text-gray-200 truncate">
                      {subButton.text}
                    </h5>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {subButton.callbackData}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleAddSubButton(subButton.id)}
                      className="h-5 px-1 text-xs"
                    >
                      <Plus className="h-2 w-2 mr-1" />
                      Sub
                    </Button>
                    <div className="flex space-x-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEditButton(subButton)}
                        className="h-5 px-1"
                      >
                        <Edit className="h-2 w-2" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDeleteButton(subButton.id)}
                        className="h-5 px-1 text-red-600"
                      >
                        <Trash2 className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </div>
            ))}
          </div>
        ))}

        {/* Payment Button */}
        {paymentButton && (
          <Card 
            className="absolute shadow-lg border-2 border-green-400 bg-green-50 dark:bg-green-900/20"
            style={{ 
              left: paymentButton.x, 
              top: paymentButton.y, 
              width: '120px',
              zIndex: 10
            }}
          >
            <CardContent className="p-3 text-center">
              <div className="text-green-700 dark:text-green-300 font-semibold text-sm">
                {paymentButton.text}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                {paymentButton.callbackData}
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setPaymentButton(null)}
                className="h-5 px-1 mt-2 text-red-600"
              >
                <Trash2 className="h-2 w-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* SMM Button */}
        {smmButton && (
          <Card 
            className="absolute shadow-lg border-2 border-purple-400 bg-purple-50 dark:bg-purple-900/20"
            style={{ 
              left: smmButton.x, 
              top: smmButton.y, 
              width: '120px',
              zIndex: 10
            }}
          >
            <CardContent className="p-3 text-center">
              <div className="text-purple-700 dark:text-purple-300 font-semibold text-sm">
                {smmButton.text}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                {smmButton.callbackData}
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setSmmButton(null)}
                className="h-5 px-1 mt-2 text-red-600"
              >
                <Trash2 className="h-2 w-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {buttons.length === 0 && !paymentButton && !smmButton && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Mulai Membuat Bot Menu
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Klik "Add Button Utama" untuk membuat button pertama
              </p>
              <Button onClick={handleAddMainButton}>
                <Plus className="h-4 w-4 mr-2" />
                Add Button Utama
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingButton ? 'Edit Button' : selectedParentId ? 'Tambah Sub Button' : 'Tambah Button Utama'}
            </DialogTitle>
            <DialogDescription>
              Isi informasi button untuk bot Telegram Anda
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Nama Button *</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Contoh: Instagram Followers"
              />
            </div>

            <div>
              <Label htmlFor="callbackData">Callback Data *</Label>
              <Input
                id="callbackData"
                value={formData.callbackData}
                onChange={(e) => setFormData(prev => ({ ...prev, callbackData: e.target.value }))}
                placeholder="Contoh: ig_followers"
              />
            </div>

            <div>
              <Label htmlFor="url">URL (Opsional)</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>

            <div>
              <Label htmlFor="responseText">Pesan Respons</Label>
              <Textarea
                id="responseText"
                value={formData.responseText}
                onChange={(e) => setFormData(prev => ({ ...prev, responseText: e.target.value }))}
                placeholder="Pesan yang dikirim ketika button diklik"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="responseImage">URL Gambar Respons</Label>
              <Input
                id="responseImage"
                value={formData.responseImage}
                onChange={(e) => setFormData(prev => ({ ...prev, responseImage: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
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