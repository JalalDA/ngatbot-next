import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, Link } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [buttons, setButtons] = useState<WhiteboardButton[]>([]);
  const [paymentButton, setPaymentButton] = useState<WhiteboardButton | null>(null);
  const [smmButton, setSmmButton] = useState<WhiteboardButton | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingButton, setEditingButton] = useState<WhiteboardButton | null>(null);
  const [formData, setFormData] = useState<ButtonFormData>({
    text: '',
    callbackData: '',
    url: '',
    responseText: '',
    responseImage: ''
  });
  const { toast } = useToast();

  const getMainButtons = () => buttons.filter(b => !b.parentId);
  const getChildButtons = (parentId: string) => buttons.filter(b => b.parentId === parentId);

  const handleAddMainButton = () => {
    const newButton: WhiteboardButton = {
      id: `btn_${Date.now()}`,
      text: 'Menu Utama',
      callbackData: 'main_menu',
      x: 200,
      y: 200,
      children: [],
      isPaymentConnected: false,
      isSmmConnected: false
    };
    setButtons([...buttons, newButton]);
    toast({ title: "Menu utama berhasil ditambahkan!" });
  };

  const handleAddSubButton = (parentId: string) => {
    const parent = buttons.find(b => b.id === parentId);
    if (!parent) return;

    const childrenCount = getChildButtons(parentId).length;
    const newButton: WhiteboardButton = {
      id: `btn_${Date.now()}`,
      text: 'Sub Menu',
      callbackData: 'sub_menu',
      x: parent.x + (childrenCount * 160) + 20,
      y: parent.y + 120,
      parentId,
      children: [],
      isPaymentConnected: false,
      isSmmConnected: false
    };

    setButtons([...buttons, newButton]);
    toast({ title: "Sub menu berhasil ditambahkan!" });
  };

  const handleAddPaymentButton = () => {
    if (paymentButton) {
      toast({ title: "Payment button sudah ada!", variant: "destructive" });
      return;
    }

    const newPaymentButton: WhiteboardButton = {
      id: 'payment_btn',
      text: 'Payment',
      callbackData: 'payment',
      x: 50,
      y: 400,
      children: [],
      isPaymentConnected: false,
      isSmmConnected: false
    };

    setPaymentButton(newPaymentButton);
    toast({ title: "Payment button berhasil ditambahkan!" });
  };

  const handleAddSmmButton = () => {
    if (smmButton) {
      toast({ title: "SMM button sudah ada!", variant: "destructive" });
      return;
    }

    const newSmmButton: WhiteboardButton = {
      id: 'smm_btn',
      text: 'SMM Panel',
      callbackData: 'smm',
      x: 50,
      y: 550,
      children: [],
      isPaymentConnected: false,
      isSmmConnected: false
    };

    setSmmButton(newSmmButton);
    toast({ title: "SMM button berhasil ditambahkan!" });
  };

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

  const handleSaveButton = () => {
    if (!editingButton) return;

    if (editingButton.id === 'payment_btn') {
      setPaymentButton({
        ...editingButton,
        ...formData
      });
    } else if (editingButton.id === 'smm_btn') {
      setSmmButton({
        ...editingButton,
        ...formData
      });
    } else {
      setButtons(buttons.map(b => 
        b.id === editingButton.id 
          ? { ...b, ...formData }
          : b
      ));
    }

    setShowDialog(false);
    setEditingButton(null);
    toast({ title: "Button berhasil diupdate!" });
  };

  const handleDeleteButton = (buttonId: string) => {
    if (buttonId === 'payment_btn') {
      setPaymentButton(null);
    } else if (buttonId === 'smm_btn') {
      setSmmButton(null);
    } else {
      setButtons(buttons.filter(b => b.id !== buttonId && b.parentId !== buttonId));
    }
    toast({ title: "Button berhasil dihapus!" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Service Management Whiteboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-1">
          Buat dan atur menu bot Telegram dengan drag & drop
        </p>
      </div>

      {/* Action Buttons */}
      <div className="absolute top-20 left-4 space-y-2 z-20">
        <Button onClick={handleAddMainButton} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Button Utama
        </Button>
        
        <Button onClick={handleAddPaymentButton} className="w-full bg-green-600 hover:bg-green-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Payment
        </Button>
        
        <Button onClick={handleAddSmmButton} className="w-full bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Add SMM Panel
        </Button>
      </div>

      {/* Whiteboard Canvas */}
      <div className="relative w-full h-screen pt-20">
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
                    
                    <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
                      Callback: {subButton.callbackData}
                    </div>
                    
                    <div className="flex justify-between items-center">
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
            <CardContent className="p-3">
              <h4 className="font-semibold text-sm text-green-800 dark:text-green-200">
                {paymentButton.text}
              </h4>
              <div className="flex space-x-1 mt-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleEditButton(paymentButton)}
                  className="h-6 px-1"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleDeleteButton(paymentButton.id)}
                  className="h-6 px-1 text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
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
            <CardContent className="p-3">
              <h4 className="font-semibold text-sm text-purple-800 dark:text-purple-200">
                {smmButton.text}
              </h4>
              <div className="flex space-x-1 mt-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => handleEditButton(smmButton)}
                  className="h-6 px-1"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => handleDeleteButton(smmButton.id)}
                  className="h-6 px-1 text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Helper Text */}
        {buttons.length === 0 && !paymentButton && !smmButton && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Selamat Datang di Whiteboard!
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Mulai dengan menambahkan button utama untuk membuat menu bot Telegram Anda.
              </p>
              <Button onClick={handleAddMainButton} size="lg">
                <Plus className="mr-2 h-5 w-5" />
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
            <DialogTitle>Edit Button</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="text">Nama Button</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e) => setFormData({...formData, text: e.target.value})}
                placeholder="Masukkan nama button"
              />
            </div>
            
            <div>
              <Label htmlFor="callbackData">Callback Data</Label>
              <Input
                id="callbackData"
                value={formData.callbackData}
                onChange={(e) => setFormData({...formData, callbackData: e.target.value})}
                placeholder="Masukkan callback data"
              />
            </div>
            
            <div>
              <Label htmlFor="url">URL (Optional)</Label>
              <Input
                id="url"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="responseText">Response Text</Label>
              <Textarea
                id="responseText"
                value={formData.responseText}
                onChange={(e) => setFormData({...formData, responseText: e.target.value})}
                placeholder="Pesan yang akan dikirim ketika button diklik"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="responseImage">Response Image URL (Optional)</Label>
              <Input
                id="responseImage"
                value={formData.responseImage}
                onChange={(e) => setFormData({...formData, responseImage: e.target.value})}
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveButton}>
              Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}