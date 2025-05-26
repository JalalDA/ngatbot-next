import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Bot, Keyboard, Settings, Play, Square, Edit3, Layers, Layers2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AutoBot {
  id: number;
  token: string;
  botName: string;
  botUsername: string;
  welcomeMessage: string;
  isActive: boolean;
  keyboardConfig: InlineKeyboard[];
  createdAt: string;
}

interface InlineKeyboard {
  id: string;
  text: string;
  callbackData: string;
  url?: string;
  parentId?: string; // untuk sub-menu
  level?: number; // 0 = menu utama, 1 = sub-menu
  responseText?: string; // teks respons yang dikirim ketika tombol diklik
}

export default function AutoBotBuilderPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("create");
  const [newBotToken, setNewBotToken] = useState("");
  const [botName, setBotName] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Selamat datang! Silakan pilih opsi di bawah ini:");
  const [keyboardButtons, setKeyboardButtons] = useState<InlineKeyboard[]>([]);
  const [editingBot, setEditingBot] = useState<AutoBot | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [showSubMenuSelector, setShowSubMenuSelector] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newMainMenuText, setNewMainMenuText] = useState("");
  const [newMainMenuCallback, setNewMainMenuCallback] = useState("");
  const [newMainMenuUrl, setNewMainMenuUrl] = useState("");
  const [newMainMenuResponse, setNewMainMenuResponse] = useState("");
  const [newSubMenuText, setNewSubMenuText] = useState("");
  const [newSubMenuCallback, setNewSubMenuCallback] = useState("");
  const [newSubMenuUrl, setNewSubMenuUrl] = useState("");
  const [newSubMenuResponse, setNewSubMenuResponse] = useState("");
  const [selectedParentForNewSub, setSelectedParentForNewSub] = useState<string>("");
  const [newSubSubMenuText, setNewSubSubMenuText] = useState("");
  const [newSubSubMenuCallback, setNewSubSubMenuCallback] = useState("");
  const [newSubSubMenuUrl, setNewSubSubMenuUrl] = useState("");
  const [newSubSubMenuResponse, setNewSubSubMenuResponse] = useState("");
  const [selectedParentForNewSubSub, setSelectedParentForNewSubSub] = useState<string>("");
  const [showSubSubMenuSelector, setShowSubSubMenuSelector] = useState(false);
  const [selectedSubMenuForSubSub, setSelectedSubMenuForSubSub] = useState<string>("");

  // Fetch auto bots
  const { data: autoBots = [], isLoading } = useQuery({
    queryKey: ["/api/autobots"],
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (botData: any) => {
      const response = await fetch("/api/autobots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      resetForm();
      toast({
        title: "Bot Berhasil Dibuat!",
        description: "Bot Telegram Anda telah dibuat dan siap digunakan.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal Membuat Bot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update bot mutation
  const updateBotMutation = useMutation({
    mutationFn: async ({ id, ...botData }: any) => {
      const response = await fetch(`/api/autobots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(botData),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      resetForm();
      toast({
        title: "Bot Berhasil Diperbarui!",
        description: "Perubahan bot Telegram Anda telah disimpan.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal Memperbarui Bot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Toggle bot status mutation
  const toggleBotMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/autobots/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({
        title: "Status Bot Diperbarui",
        description: "Status bot berhasil diubah.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal Mengubah Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/autobots/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({
        title: "Bot Berhasil Dihapus",
        description: "Bot telah dihapus dari sistem.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal Menghapus Bot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateToken = async () => {
    if (!newBotToken.trim()) {
      toast({
        title: "Token Diperlukan",
        description: "Silakan masukkan token bot Telegram terlebih dahulu.",
        variant: "destructive",
      });
      return;
    }

    setIsValidatingToken(true);
    try {
      const response = await fetch("/api/autobots/validate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newBotToken }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Gagal memvalidasi token");
      }

      if (result.valid && result.botInfo) {
        setBotName(result.botInfo.first_name);
        setBotUsername(result.botInfo.username);
        toast({
          title: "Token Valid!",
          description: `Bot "${result.botInfo.first_name}" (@${result.botInfo.username}) berhasil diverifikasi.`,
        });
      } else {
        throw new Error(result.error || "Token tidak valid");
      }
    } catch (error: any) {
      toast({
        title: "Token Tidak Valid",
        description: error.message || "Silakan periksa kembali token bot Anda.",
        variant: "destructive",
      });
      setBotName("");
      setBotUsername("");
    } finally {
      setIsValidatingToken(false);
    }
  };

  const addKeyboardButton = (level: number = 0, parentId?: string) => {
    const newButton: InlineKeyboard = {
      id: Date.now().toString(),
      text: "",
      callbackData: "",
      level: level,
      parentId: parentId
    };
    setKeyboardButtons([...keyboardButtons, newButton]);
  };

  const addHierarchicalTemplate = () => {
    const timestamp = Date.now();
    const infoButtonId = `btn_${timestamp}_info`;
    
    const template: InlineKeyboard[] = [
      {
        id: infoButtonId,
        text: "Info",
        callbackData: "info_menu",
        level: 0
      },
      {
        id: `btn_${timestamp}_toko`,
        text: "Toko Saya",
        callbackData: "toko_saya",
        level: 1,
        parentId: infoButtonId
      },
      {
        id: `btn_${timestamp}_produk`,
        text: "Daftar Produk",
        callbackData: "daftar_produk",
        level: 1,
        parentId: infoButtonId
      }
    ];
    
    setKeyboardButtons([...keyboardButtons, ...template]);
    
    toast({
      title: "Template Ditambahkan!",
      description: "Template menu hierarkis Info → Toko Saya & Daftar Produk berhasil ditambahkan",
    });
  };

  const addSubMenuToParent = () => {
    if (!selectedParentId) {
      toast({
        title: "Pilih Menu Utama",
        description: "Silakan pilih menu utama terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    addKeyboardButton(1, selectedParentId);
    setShowSubMenuSelector(false);
    setSelectedParentId("");
    
    toast({
      title: "Sub Menu Ditambahkan!",
      description: "Sub menu baru berhasil ditambahkan ke menu utama yang dipilih",
    });
  };

  const addSubSubMenuToParent = () => {
    if (!selectedSubMenuForSubSub) {
      toast({
        title: "Pilih Sub Menu",
        description: "Silakan pilih sub menu terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    addKeyboardButton(2, selectedSubMenuForSubSub);
    setShowSubSubMenuSelector(false);
    setSelectedSubMenuForSubSub("");
    
    toast({
      title: "Sub-Sub Menu Ditambahkan!",
      description: "Sub-sub menu baru berhasil ditambahkan ke sub menu yang dipilih",
    });
  };

  const updateKeyboardButton = (id: string, field: keyof InlineKeyboard, value: string) => {
    setKeyboardButtons(buttons =>
      buttons.map(button =>
        button.id === id ? { ...button, [field]: value } : button
      )
    );
  };

  const removeKeyboardButton = (id: string) => {
    setKeyboardButtons(buttons => buttons.filter(button => button.id !== id));
  };

  const resetForm = () => {
    setNewBotToken("");
    setBotName("");
    setBotUsername("");
    setWelcomeMessage("Selamat datang! Silakan pilih opsi di bawah ini:");
    setKeyboardButtons([]);
    setEditingBot(null);
  };

  const startEditing = (bot: AutoBot) => {
    console.log('🔧 Starting to edit bot:', bot);
    setEditingBot(bot);
    setWelcomeMessage(bot.welcomeMessage);
    setKeyboardButtons(bot.keyboardConfig || []);
    setShowEditDialog(true);
  };

  const handleSubmit = async () => {
    if (editingBot) {
      updateBotMutation.mutate({
        id: editingBot.id,
        welcomeMessage,
        keyboardConfig: keyboardButtons,
      });
    } else {
      if (!newBotToken || !botName || !botUsername) {
        toast({
          title: "Data Tidak Lengkap",
          description: "Silakan validasi token bot terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }

      createBotMutation.mutate({
        token: newBotToken,
        botName,
        botUsername,
        welcomeMessage,
        keyboardConfig: keyboardButtons,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auto Bot Builder</h1>
        <p className="text-muted-foreground">Buat bot Telegram otomatis dengan keyboard inline bertingkat</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <Plus className="w-4 h-4 mr-2" />
            Buat Bot
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Settings className="w-4 h-4 mr-2" />
            Kelola Bot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Bot className="w-5 h-5 mr-2 inline" />
                Konfigurasi Bot Baru
              </CardTitle>
              <CardDescription>
                Masukkan token bot Telegram dan konfigurasikan keyboard inline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editingBot && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="botToken">Token Bot Telegram</Label>
                    <div className="flex gap-2">
                      <Input
                        id="botToken"
                        placeholder="Masukkan token bot (contoh: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz)"
                        value={newBotToken}
                        onChange={(e) => setNewBotToken(e.target.value)}
                        disabled={isValidatingToken}
                      />
                      <Button
                        onClick={validateToken}
                        disabled={isValidatingToken || !newBotToken.trim()}
                        variant="outline"
                      >
                        {isValidatingToken ? "Validasi..." : "Validasi"}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Dapatkan token dari @BotFather di Telegram
                    </p>
                  </div>

                  {botName && botUsername && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Bot Information:</p>
                      <p className="text-sm text-green-700">Name: {botName}</p>
                      <p className="text-sm text-green-700">Username: @{botUsername}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Pesan Sambutan</Label>
                <Textarea
                  id="welcomeMessage"
                  placeholder="Pesan yang akan ditampilkan saat pengguna mengetik /start"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <Keyboard className="w-5 h-5 mr-2 inline" />
                Keyboard Inline Bertingkat
              </CardTitle>
              <CardDescription>
                Konfigurasi menu hierarkis dengan struktur Menu Utama → Sub Menu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addKeyboardButton(0)}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Menu Utama
                </Button>
                
                {/* Show "Add Sub Menu" button only if there are main menu buttons */}
                {keyboardButtons.some(btn => (btn.level || 0) === 0) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubMenuSelector(true)}
                    className="flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4" />
                    Tambah Sub Menu
                  </Button>
                )}
                
                {/* Show "Add Sub-Sub Menu" button only if there are sub menu buttons */}
                {keyboardButtons.some(btn => (btn.level || 0) === 1) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSubSubMenuSelector(true)}
                    className="flex items-center gap-2"
                  >
                    <Layers2 className="w-4 h-4" />
                    Tambah Sub-Sub Menu
                  </Button>
                )}
              </div>

              {/* Grouping buttons by level for better visualization */}
              {[0, 1, 2].map(level => {
                const buttonsAtLevel = keyboardButtons.filter(btn => (btn.level || 0) === level);
                if (buttonsAtLevel.length === 0) return null;

                return (
                  <div key={level} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${level === 0 ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                      <Label className="text-sm font-medium">
                        {level === 0 ? 'Menu Utama' : 'Sub Menu'}
                      </Label>
                    </div>
                    
                    {buttonsAtLevel.map((button, index) => (
                      <div key={button.id} className={`p-4 border rounded-lg space-y-3 ${level > 0 ? 'ml-6 border-l-4 border-l-green-200' : ''}`}>
                        <div className="flex justify-between items-center">
                          <Label className="text-sm font-medium">
                            {level === 0 ? `Menu Utama ${index + 1}` : `Sub Menu ${index + 1}`}
                            {button.parentId && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (Parent: {keyboardButtons.find(b => b.id === button.parentId)?.text || 'Unknown'})
                              </span>
                            )}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKeyboardButton(button.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label htmlFor={`text-${button.id}`} className="text-xs">Teks Tombol</Label>
                            <Input
                              id={`text-${button.id}`}
                              placeholder="Teks yang tampil di tombol"
                              value={button.text}
                              onChange={(e) => updateKeyboardButton(button.id, "text", e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label htmlFor={`callback-${button.id}`} className="text-xs">Callback Data</Label>
                            <Input
                              id={`callback-${button.id}`}
                              placeholder="Data yang dikirim saat tombol ditekan"
                              value={button.callbackData}
                              onChange={(e) => updateKeyboardButton(button.id, "callbackData", e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`url-${button.id}`} className="text-xs">URL (Opsional)</Label>
                          <Input
                            id={`url-${button.id}`}
                            placeholder="https://example.com (kosongkan jika tidak perlu)"
                            value={button.url || ""}
                            onChange={(e) => updateKeyboardButton(button.id, "url", e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor={`response-${button.id}`} className="text-xs">Text</Label>
                          <Input
                            id={`response-${button.id}`}
                            placeholder="Pesan yang akan dikirim ketika tombol diklik"
                            value={button.responseText || ""}
                            onChange={(e) => updateKeyboardButton(button.id, "responseText", e.target.value)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {keyboardButtons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Keyboard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Belum ada tombol keyboard yang dikonfigurasi</p>
                  <p className="text-sm">Klik "Tambah Tombol" atau "Template Menu Hierarkis" untuk memulai</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSubmit}
                  disabled={createBotMutation.isPending || updateBotMutation.isPending}
                  className="flex-1"
                >
                  {editingBot ? "Perbarui Bot" : "Buat Bot"}
                </Button>
                
                {editingBot && (
                  <Button variant="outline" onClick={resetForm}>
                    Batal
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : autoBots.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Belum ada bot yang dibuat</p>
              </CardContent>
            </Card>
          ) : (
            autoBots.map((bot: AutoBot) => (
              <Card key={bot.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        {bot.botName}
                        <Badge variant={bot.isActive ? "default" : "secondary"}>
                          {bot.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </CardTitle>
                      <CardDescription>@{bot.botUsername}</CardDescription>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startEditing(bot)}
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBotMutation.mutate({ id: bot.id, isActive: !bot.isActive })}
                      >
                        {bot.isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Bot</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus bot {bot.botName}? Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteBotMutation.mutate(bot.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Pesan Sambutan:</Label>
                      <p className="text-sm text-muted-foreground mt-1">{bot.welcomeMessage}</p>
                    </div>
                    
                    {bot.keyboardConfig && bot.keyboardConfig.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Keyboard Configuration:</Label>
                        <div className="mt-2 space-y-2">
                          {[0, 1].map(level => {
                            const buttonsAtLevel = bot.keyboardConfig.filter(btn => (btn.level || 0) === level);
                            if (buttonsAtLevel.length === 0) return null;
                            
                            return (
                              <div key={level} className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                  {level === 0 ? 'Menu Utama:' : 'Sub Menu:'}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {buttonsAtLevel.map((btn, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {btn.text || 'Untitled'}
                                      {btn.parentId && level > 0 && (
                                        <span className="ml-1 text-muted-foreground">
                                          ← {bot.keyboardConfig.find(b => b.id === btn.parentId)?.text}
                                        </span>
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog untuk memilih parent menu */}
      <Dialog open={showSubMenuSelector} onOpenChange={setShowSubMenuSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Sub Menu</DialogTitle>
            <DialogDescription>
              Pilih menu utama yang akan menjadi parent dari sub menu baru
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Menu Utama</Label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih menu utama..." />
                </SelectTrigger>
                <SelectContent>
                  {keyboardButtons
                    .filter(btn => (btn.level || 0) === 0)
                    .map(btn => (
                      <SelectItem key={btn.id} value={btn.id}>
                        {btn.text || 'Menu tanpa nama'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSubMenuSelector(false);
              setSelectedParentId("");
            }}>
              Batal
            </Button>
            <Button onClick={addSubMenuToParent} disabled={!selectedParentId}>
              Tambah Sub Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sub-Sub Menu Selector Dialog */}
      <Dialog open={showSubSubMenuSelector} onOpenChange={setShowSubSubMenuSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers2 className="w-5 h-5" />
              Tambah Sub-Sub Menu
            </DialogTitle>
            <DialogDescription>
              Pilih sub menu untuk menambahkan sub-sub menu baru
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Sub Menu</Label>
              <Select value={selectedSubMenuForSubSub} onValueChange={setSelectedSubMenuForSubSub}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sub menu..." />
                </SelectTrigger>
                <SelectContent>
                  {keyboardButtons
                    .filter(btn => (btn.level || 0) === 1)
                    .map(btn => (
                      <SelectItem key={btn.id} value={btn.id}>
                        {btn.text || 'Sub menu tanpa nama'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowSubSubMenuSelector(false);
              setSelectedSubMenuForSubSub("");
            }}>
              Batal
            </Button>
            <Button onClick={addSubSubMenuToParent} disabled={!selectedSubMenuForSubSub}>
              Tambah Sub-Sub Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bot Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Edit Bot: {editingBot?.botName}
            </DialogTitle>
            <DialogDescription>
              Edit pengaturan dan menu inline keyboard untuk bot Telegram Anda
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Welcome Message */}
            <div className="space-y-2">
              <Label htmlFor="editWelcomeMessage">Pesan Selamat Datang</Label>
              <Textarea
                id="editWelcomeMessage"
                placeholder="Pesan yang akan ditampilkan saat pengguna memulai bot"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Keyboard Configuration */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Menu Yang Ada
                </Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newMainMenuText && newMainMenuCallback) {
                        const newButton: InlineKeyboard = {
                          id: Date.now().toString(),
                          text: newMainMenuText,
                          callbackData: newMainMenuCallback,
                          level: 0,
                          url: newMainMenuUrl || undefined,
                          responseText: newMainMenuResponse || undefined
                        };
                        setKeyboardButtons([...keyboardButtons, newButton]);
                        setNewMainMenuText("");
                        setNewMainMenuCallback("");
                        setNewMainMenuUrl("");
                        setNewMainMenuResponse("");
                      }
                    }}
                    disabled={!newMainMenuText || !newMainMenuCallback}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Menu Utama
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newSubMenuText && newSubMenuCallback && selectedParentForNewSub) {
                        const newButton: InlineKeyboard = {
                          id: Date.now().toString(),
                          text: newSubMenuText,
                          callbackData: newSubMenuCallback,
                          level: 1,
                          parentId: selectedParentForNewSub,
                          url: newSubMenuUrl || undefined,
                          responseText: newSubMenuResponse || undefined
                        };
                        setKeyboardButtons([...keyboardButtons, newButton]);
                        setNewSubMenuText("");
                        setNewSubMenuCallback("");
                        setNewSubMenuUrl("");
                        setNewSubMenuResponse("");
                        setSelectedParentForNewSub("");
                      }
                    }}
                    disabled={!newSubMenuText || !newSubMenuCallback || !selectedParentForNewSub}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Tambah Sub Menu
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (newSubSubMenuText && newSubSubMenuCallback && selectedParentForNewSubSub) {
                        const newButton: InlineKeyboard = {
                          id: Date.now().toString(),
                          text: newSubSubMenuText,
                          callbackData: newSubSubMenuCallback,
                          level: 2,
                          parentId: selectedParentForNewSubSub,
                          url: newSubSubMenuUrl || undefined,
                          responseText: newSubSubMenuResponse || undefined
                        };
                        setKeyboardButtons([...keyboardButtons, newButton]);
                        setNewSubSubMenuText("");
                        setNewSubSubMenuCallback("");
                        setNewSubSubMenuUrl("");
                        setNewSubSubMenuResponse("");
                        setSelectedParentForNewSubSub("");
                      }
                    }}
                    disabled={!newSubSubMenuText || !newSubSubMenuCallback || !selectedParentForNewSubSub}
                  >
                    <Layers2 className="w-4 h-4 mr-2" />
                    Tambah Sub-Sub Menu
                  </Button>
                </div>
              </div>

              {/* Add new main menu form */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Tambah Menu Utama Baru</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        placeholder="Teks menu utama"
                        value={newMainMenuText}
                        onChange={(e) => setNewMainMenuText(e.target.value)}
                      />
                      <Input
                        placeholder="Callback data"
                        value={newMainMenuCallback}
                        onChange={(e) => setNewMainMenuCallback(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Input
                        placeholder="URL (Opsional)"
                        value={newMainMenuUrl}
                        onChange={(e) => setNewMainMenuUrl(e.target.value)}
                      />
                      <Input
                        placeholder="Text - Pesan yang akan dikirim ketika tombol diklik"
                        value={newMainMenuResponse}
                        onChange={(e) => setNewMainMenuResponse(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add new sub menu form */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Tambah Sub Menu Baru</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <Select value={selectedParentForNewSub} onValueChange={setSelectedParentForNewSub}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih menu utama" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyboardButtons
                            .filter(btn => !btn.level || btn.level === 0)
                            .map(btn => (
                              <SelectItem key={btn.id} value={btn.id}>
                                {btn.text}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Teks sub menu"
                        value={newSubMenuText}
                        onChange={(e) => setNewSubMenuText(e.target.value)}
                      />
                      <Input
                        placeholder="Callback data"
                        value={newSubMenuCallback}
                        onChange={(e) => setNewSubMenuCallback(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Input
                        placeholder="URL (Opsional)"
                        value={newSubMenuUrl}
                        onChange={(e) => setNewSubMenuUrl(e.target.value)}
                      />
                      <Input
                        placeholder="Text - Pesan yang akan dikirim ketika tombol diklik"
                        value={newSubMenuResponse}
                        onChange={(e) => setNewSubMenuResponse(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Add new sub-sub menu form */}
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Tambah Sub-Sub Menu Baru</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <Select value={selectedParentForNewSubSub} onValueChange={setSelectedParentForNewSubSub}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih sub menu" />
                        </SelectTrigger>
                        <SelectContent>
                          {keyboardButtons
                            .filter(btn => btn.level === 1)
                            .map(btn => (
                              <SelectItem key={btn.id} value={btn.id}>
                                {btn.text}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Teks sub-sub menu"
                        value={newSubSubMenuText}
                        onChange={(e) => setNewSubSubMenuText(e.target.value)}
                      />
                      <Input
                        placeholder="Callback data"
                        value={newSubSubMenuCallback}
                        onChange={(e) => setNewSubSubMenuCallback(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Input
                        placeholder="URL (Opsional)"
                        value={newSubSubMenuUrl}
                        onChange={(e) => setNewSubSubMenuUrl(e.target.value)}
                      />
                      <Input
                        placeholder="Text - Pesan yang akan dikirim ketika tombol diklik"
                        value={newSubSubMenuResponse}
                        onChange={(e) => setNewSubSubMenuResponse(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Show existing keyboard buttons */}
              <div className="space-y-3">
                {keyboardButtons.map((button, index) => (
                  <div key={button.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={button.level === 2 ? "destructive" : button.level === 1 ? "secondary" : "default"}>
                          {button.level === 2 ? "Sub-Sub Menu" : button.level === 1 ? "Sub Menu" : "Menu Utama"}
                        </Badge>
                        {button.level === 1 && button.parentId && (
                          <span className="text-sm text-muted-foreground">
                            → {keyboardButtons.find(b => b.id === button.parentId)?.text}
                          </span>
                        )}
                        {button.level === 2 && button.parentId && (
                          <span className="text-sm text-muted-foreground">
                            → {keyboardButtons.find(b => b.id === button.parentId)?.text} 
                            → {keyboardButtons.find(b => b.id === keyboardButtons.find(sb => sb.id === button.parentId)?.parentId)?.text}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Teks tombol"
                          value={button.text}
                          onChange={(e) => {
                            const newButtons = [...keyboardButtons];
                            newButtons[index].text = e.target.value;
                            setKeyboardButtons(newButtons);
                          }}
                        />
                        <Input
                          placeholder="Callback data"
                          value={button.callbackData}
                          onChange={(e) => {
                            const newButtons = [...keyboardButtons];
                            newButtons[index].callbackData = e.target.value;
                            setKeyboardButtons(newButtons);
                          }}
                        />
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newButtons = keyboardButtons.filter((_, i) => i !== index);
                        setKeyboardButtons(newButtons);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                {keyboardButtons.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Belum ada menu yang ditambahkan
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingBot(null);
                setWelcomeMessage("Selamat datang! Silakan pilih opsi di bawah ini:");
                setKeyboardButtons([]);
              }}
            >
              Batal
            </Button>
            <Button
              onClick={() => {
                if (editingBot) {
                  updateBotMutation.mutate({
                    id: editingBot.id,
                    welcomeMessage,
                    keyboardConfig: keyboardButtons,
                  });
                  setShowEditDialog(false);
                }
              }}
              disabled={updateBotMutation.isPending}
            >
              {updateBotMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}