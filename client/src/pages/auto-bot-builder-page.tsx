import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Bot, Keyboard, Settings, Play, Square, Edit3, Layers, Layers2, Menu, Grid3X3, Wand2, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
  isAllShow?: boolean; // untuk tombol All Show
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

  // Reset state when component mounts
  useEffect(() => {
    setNewBotToken("");
    setBotName("");
    setBotUsername("");
    setWelcomeMessage("Selamat datang! Silakan pilih opsi di bawah ini:");
    setKeyboardButtons([]);
    setEditingBot(null);
    setActiveTab("create");
  }, []);

  // Reset state when switching to create tab
  useEffect(() => {
    if (activeTab === "create") {
      setNewBotToken("");
      setBotName("");
      setBotUsername("");
      setWelcomeMessage("Selamat datang! Silakan pilih opsi di bawah ini:");
      setKeyboardButtons([]);
      setEditingBot(null);
    }
  }, [activeTab]);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [showSubMenuSelector, setShowSubMenuSelector] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [newMainMenuText, setNewMainMenuText] = useState("");
  const [newMainMenuCallback, setNewMainMenuCallback] = useState("");
  const [newMainMenuUrl, setNewMainMenuUrl] = useState("");
  const [newMainMenuResponse, setNewMainMenuResponse] = useState("");
  const [isAllShowButton, setIsAllShowButton] = useState(false);
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
  const [showLevel4Selector, setShowLevel4Selector] = useState(false);
  const [selectedLevel3ForLevel4, setSelectedLevel3ForLevel4] = useState<string>("");
  const [showLevel5Selector, setShowLevel5Selector] = useState(false);
  const [selectedLevel4ForLevel5, setSelectedLevel4ForLevel5] = useState<string>("");
  
  // State for collapsed menu groups
  const [collapsedMenus, setCollapsedMenus] = useState<Set<string>>(new Set());

  // Helper function to toggle collapsed state
  const toggleMenuCollapse = (menuId: string) => {
    const newCollapsed = new Set(collapsedMenus);
    if (newCollapsed.has(menuId)) {
      newCollapsed.delete(menuId);
    } else {
      newCollapsed.add(menuId);
    }
    setCollapsedMenus(newCollapsed);
  };

  // Helper function to get all children of a menu recursively
  const getMenuChildren = (parentId: string, level: number = 1): InlineKeyboard[] => {
    const directChildren = keyboardButtons.filter(btn => btn.parentId === parentId && (btn.level || 0) === level);
    let allChildren: InlineKeyboard[] = [...directChildren];
    
    directChildren.forEach(child => {
      allChildren = [...allChildren, ...getMenuChildren(child.id, level + 1)];
    });
    
    return allChildren;
  };

  // Helper function to get level color and name
  const getLevelInfo = (level: number) => {
    const levelConfig = {
      0: { name: "Menu Utama", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Menu },
      1: { name: "Sub Menu", color: "bg-green-100 text-green-800 border-green-200", icon: Layers },
      2: { name: "Sub Level 1", color: "bg-purple-100 text-purple-800 border-purple-200", icon: Layers2 },
      3: { name: "Sub Level 2", color: "bg-orange-100 text-orange-800 border-orange-200", icon: Grid3X3 },
      4: { name: "Sub Level 3", color: "bg-red-100 text-red-800 border-red-200", icon: Settings }
    };
    return levelConfig[level as keyof typeof levelConfig] || levelConfig[0];
  };

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

  const addLevel4ToParent = () => {
    if (!selectedLevel3ForLevel4) {
      toast({
        title: "Pilih Sub-Sub Menu",
        description: "Silakan pilih sub-sub menu terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    addKeyboardButton(3, selectedLevel3ForLevel4);
    setShowLevel4Selector(false);
    setSelectedLevel3ForLevel4("");
    
    toast({
      title: "Menu Level 4 Ditambahkan!",
      description: "Menu level 4 baru berhasil ditambahkan ke sub-sub menu yang dipilih",
    });
  };

  const addLevel5ToParent = () => {
    if (!selectedLevel4ForLevel5) {
      toast({
        title: "Pilih Menu Level 4",
        description: "Silakan pilih menu level 4 terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    addKeyboardButton(4, selectedLevel4ForLevel5);
    setShowLevel5Selector(false);
    setSelectedLevel4ForLevel5("");
    
    toast({
      title: "Menu Level 5 Ditambahkan!",
      description: "Menu level 5 baru berhasil ditambahkan ke menu level 4 yang dipilih",
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">
            <Plus className="w-4 h-4 mr-2" />
            Buat Bot
          </TabsTrigger>
          <TabsTrigger value="manage">
            <Settings className="w-4 h-4 mr-2" />
            Kelola Bot
          </TabsTrigger>
          <TabsTrigger value="keyboard">
            <Keyboard className="w-4 h-4 mr-2" />
            Management Keyboard Inline
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
            <CardContent className="space-y-6">
              {/* Main Quick Actions Bar - Only for adding main menu */}
              <div className="flex flex-wrap gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Keyboard className="w-5 h-5" />
                  <span className="font-medium">Quick Actions:</span>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addKeyboardButton(0)}
                  className="flex items-center gap-2 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  <Plus className="w-4 h-4" />
                  Menu Utama
                </Button>
              </div>

              {/* Menu Groups Management */}
              <div className="space-y-4">
                {/* Main Menus with Hierarchical Children */}
                {keyboardButtons.filter(btn => (btn.level || 0) === 0).map((mainMenu, index) => {
                  const allChildren = getMenuChildren(mainMenu.id);
                  const isCollapsed = collapsedMenus.has(mainMenu.id);
                  const totalChildren = allChildren.length;

                  return (
                    <div key={mainMenu.id} className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                      {/* Main Menu Header */}
                      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMenuCollapse(mainMenu.id)}
                            className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                            <Menu className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">
                              {mainMenu.isAllShow ? '📋 All Show Button' : `Menu Utama ${index + 1}`}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              {mainMenu.text || 'Untitled Menu'} 
                              {totalChildren > 0 && (
                                <span className="ml-1">• {totalChildren} sub-menu</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {mainMenu.isAllShow && (
                            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                              Special
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeKeyboardButton(mainMenu.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Main Menu Configuration */}
                      <div className="p-4 bg-blue-50/30 dark:bg-blue-950/10 border-b border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Teks Tombol</Label>
                            <Input
                              placeholder="Nama menu utama"
                              value={mainMenu.text}
                              onChange={(e) => updateKeyboardButton(mainMenu.id, "text", e.target.value)}
                              className="h-9 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Callback Data</Label>
                            <Input
                              placeholder="callback_data"
                              value={mainMenu.callbackData}
                              onChange={(e) => updateKeyboardButton(mainMenu.id, "callbackData", e.target.value)}
                              className="h-9 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">URL (Opsional)</Label>
                            <Input
                              placeholder="https://example.com"
                              value={mainMenu.url || ""}
                              onChange={(e) => updateKeyboardButton(mainMenu.id, "url", e.target.value)}
                              className="h-9 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-medium text-slate-700 dark:text-slate-300">Pesan Respons</Label>
                            <Input
                              placeholder="Pesan saat tombol diklik"
                              value={mainMenu.responseText || ""}
                              onChange={(e) => updateKeyboardButton(mainMenu.id, "responseText", e.target.value)}
                              className="h-9 border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Sub-Menus (Collapsible) */}
                      {!isCollapsed && totalChildren > 0 && (
                        <div className="p-4 space-y-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Layers className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Sub-Menu dalam grup ini:</span>
                          </div>
                          
                          <div className="grid gap-3 md:grid-cols-2">
                            {allChildren.map((child) => {
                              const levelColor = 
                                (child.level || 0) === 1 ? 'border-l-green-400' :
                                (child.level || 0) === 2 ? 'border-l-orange-400' :
                                (child.level || 0) === 3 ? 'border-l-purple-400' :
                                'border-l-pink-400';
                              
                              const levelName = 
                                (child.level || 0) === 1 ? 'Sub Menu' :
                                (child.level || 0) === 2 ? 'Sub Level 1' :
                                (child.level || 0) === 3 ? 'Sub Level 2' :
                                'Sub Level 3';

                              return (
                                <Card key={child.id} className={`border-l-4 ${levelColor} bg-slate-50 dark:bg-slate-800/50`}>
                                  <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${
                                          (child.level || 0) === 1 ? 'bg-green-500' :
                                          (child.level || 0) === 2 ? 'bg-orange-500' :
                                          (child.level || 0) === 3 ? 'bg-purple-500' :
                                          'bg-pink-500'
                                        }`}></div>
                                        <CardTitle className="text-xs text-slate-700 dark:text-slate-300">
                                          {levelName}
                                        </CardTitle>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeKeyboardButton(child.id)}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2">
                                      <Input
                                        placeholder="Teks tombol"
                                        value={child.text}
                                        onChange={(e) => updateKeyboardButton(child.id, "text", e.target.value)}
                                        className="h-8 text-xs border-slate-300 dark:border-slate-600"
                                      />
                                      <Input
                                        placeholder="callback_data"
                                        value={child.callbackData}
                                        onChange={(e) => updateKeyboardButton(child.id, "callbackData", e.target.value)}
                                        className="h-8 text-xs border-slate-300 dark:border-slate-600"
                                      />
                                    </div>
                                    <Input
                                      placeholder="URL (opsional)"
                                      value={child.url || ""}
                                      onChange={(e) => updateKeyboardButton(child.id, "url", e.target.value)}
                                      className="h-8 text-xs border-slate-300 dark:border-slate-600"
                                    />
                                    <Textarea
                                      placeholder="Pesan respons"
                                      value={child.responseText || ""}
                                      onChange={(e) => updateKeyboardButton(child.id, "responseText", e.target.value)}
                                      className="min-h-[50px] text-xs resize-none border-slate-300 dark:border-slate-600"
                                    />
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Quick Actions within each Menu Group */}
                      {!isCollapsed && !mainMenu.isAllShow && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                          <div className="flex items-center gap-2 mb-3">
                            <Keyboard className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Quick Actions untuk grup ini:</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedParentForNewSub(mainMenu.id);
                                setShowSubMenuSelector(true);
                              }}
                              className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900"
                            >
                              <Layers className="w-3 h-3" />
                              Sub Menu
                            </Button>

                            {/* Add Sub Level 1 if there are level 1 children */}
                            {allChildren.some(child => (child.level || 0) === 1) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowSubSubMenuSelector(true)}
                                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900"
                              >
                                <Layers2 className="w-3 h-3" />
                                Sub Level 1
                              </Button>
                            )}

                            {/* Add Sub Level 2 if there are level 2 children */}
                            {allChildren.some(child => (child.level || 0) === 2) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowLevel4Selector(true)}
                                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900"
                              >
                                <Grid3X3 className="w-3 h-3" />
                                Sub Level 2
                              </Button>
                            )}

                            {/* Add Sub Level 3 if there are level 3 children */}
                            {allChildren.some(child => (child.level || 0) === 3) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowLevel5Selector(true)}
                                className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900"
                              >
                                <Layers className="w-3 h-3" />
                                Sub Level 3
                              </Button>
                            )}

                            {/* Add All Show Button for this group - moved to end */}
                            <Button
                              size="sm"
                              onClick={() => {
                                const newButton: InlineKeyboard = {
                                  id: 'all_show_' + Date.now().toString(),
                                  text: '📋 Lihat Semua Menu',
                                  callbackData: 'show_all_menus',
                                  level: 0,
                                  isAllShow: true
                                };
                                setKeyboardButtons([...keyboardButtons, newButton]);
                                toast({
                                  title: "Tombol All Show Ditambahkan!",
                                  description: "Tombol untuk menampilkan semua menu telah ditambahkan.",
                                });
                              }}
                              className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 border-0"
                            >
                              <Grid3X3 className="w-3 h-3" />
                              All Show
                            </Button>

                            {/* Add Template Button - moved to end */}
                            <Button
                              size="sm"
                              onClick={() => {
                                // Add template hierarchy buttons to this specific main menu
                                const templateButtons: InlineKeyboard[] = [
                                  {
                                    id: 'template_sub_' + Date.now(),
                                    text: '📱 Instagram',
                                    callbackData: 'instagram',
                                    level: 1,
                                    parentId: mainMenu.id
                                  },
                                  {
                                    id: 'template_sub_' + (Date.now() + 1),
                                    text: '🎥 TikTok',
                                    callbackData: 'tiktok',
                                    level: 1,
                                    parentId: mainMenu.id
                                  },
                                  {
                                    id: 'template_sub_' + (Date.now() + 2),
                                    text: '📘 Facebook',
                                    callbackData: 'facebook',
                                    level: 1,
                                    parentId: mainMenu.id
                                  }
                                ];
                                setKeyboardButtons([...keyboardButtons, ...templateButtons]);
                                toast({
                                  title: "Template Sub-Menu Ditambahkan!",
                                  description: "Template sub-menu sosial media telah ditambahkan ke grup ini.",
                                });
                              }}
                              className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 border-0"
                            >
                              <Settings className="w-3 h-3" />
                              Template
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Standalone All Show Buttons */}
                {keyboardButtons.filter(btn => btn.isAllShow && (btn.level || 0) === 0).length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      <Grid3X3 className="w-5 h-5" />
                      Tombol All Show
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      {keyboardButtons.filter(btn => btn.isAllShow && (btn.level || 0) === 0).map((button) => (
                        <Card key={button.id} className="border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-950/10">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <CardTitle className="text-sm text-blue-800 dark:text-blue-200">📋 All Show Button</CardTitle>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeKeyboardButton(button.id)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Input
                              placeholder="Teks tombol All Show"
                              value={button.text}
                              onChange={(e) => updateKeyboardButton(button.id, "text", e.target.value)}
                              className="h-8 border-slate-300 dark:border-slate-600"
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {keyboardButtons.length === 0 && (
                <div className="text-center py-12">
                  <div className="max-w-md mx-auto">
                    <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                      <Keyboard className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Belum Ada Keyboard yang Dikonfigurasi</h3>
                    <p className="text-muted-foreground mb-6">
                      Mulai membuat menu interaktif untuk bot Telegram Anda dengan tombol inline yang mudah digunakan.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button 
                        onClick={() => addKeyboardButton(0)}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Tambah Menu Utama
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          const templateButtons: InlineKeyboard[] = [
                            {
                              id: 'demo_' + Date.now(),
                              text: '🏪 Produk & Layanan',
                              callbackData: 'produk',
                              level: 0
                            },
                            {
                              id: 'demo_' + (Date.now() + 1),
                              text: '📱 Instagram',
                              callbackData: 'instagram',
                              level: 1,
                              parentId: 'demo_' + Date.now()
                            },
                            {
                              id: 'demo_' + (Date.now() + 2),
                              text: '🎥 TikTok',
                              callbackData: 'tiktok',
                              level: 1,
                              parentId: 'demo_' + Date.now()
                            },
                            {
                              id: 'all_show_demo_' + Date.now(),
                              text: '📋 Lihat Semua Menu',
                              callbackData: 'show_all_menus',
                              level: 0,
                              isAllShow: true
                            }
                          ];
                          setKeyboardButtons(templateButtons);
                          toast({
                            title: "Template Demo Berhasil Ditambahkan!",
                            description: "Template keyboard demo telah siap untuk Anda kustomisasi.",
                          });
                        }}
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Gunakan Template Demo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Preview Section */}
              {keyboardButtons.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Preview Keyboard</h3>
                    <Badge variant="secondary">Live Preview</Badge>
                  </div>
                  
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <div className="max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                      {/* Telegram Header Simulation */}
                      <div className="bg-blue-500 text-white p-3 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{editingBot?.botName || 'Bot Name'}</p>
                          <p className="text-xs opacity-90">online</p>
                        </div>
                      </div>
                      
                      {/* Message Content */}
                      <div className="p-4 space-y-3">
                        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                          <p className="text-sm">{editingBot?.welcomeMessage || 'Selamat datang! Silakan pilih opsi di bawah ini:'}</p>
                        </div>
                        
                        {/* Keyboard Buttons Preview */}
                        <div className="space-y-2">
                          {[0, 1, 2, 3, 4].map(level => {
                            const buttonsAtLevel = keyboardButtons.filter(btn => (btn.level || 0) === level);
                            if (buttonsAtLevel.length === 0) return null;
                            
                            return (
                              <div key={level} className="space-y-1">
                                {level > 0 && (
                                  <div className="text-xs text-muted-foreground px-2">
                                    Level {level + 1} Menu:
                                  </div>
                                )}
                                <div className="grid gap-1">
                                  {buttonsAtLevel.map((button) => (
                                    <button
                                      key={button.id}
                                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                                        button.isAllShow 
                                          ? 'bg-indigo-500 text-white hover:bg-indigo-600' 
                                          : 'bg-blue-500 text-white hover:bg-blue-600'
                                      }`}
                                    >
                                      {button.text || 'Untitled Button'}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-center mt-4">
                      <p className="text-xs text-muted-foreground">
                        ↑ Pratinjau bagaimana keyboard akan terlihat di Telegram
                      </p>
                    </div>
                  </div>
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
                        onClick={() => {
                          console.log("🔧 Starting to edit bot:", bot);
                          setEditingBot(bot);
                          setBotName(bot.botName);
                          setBotUsername(bot.botUsername);
                          setWelcomeMessage(bot.welcomeMessage);
                          setKeyboardButtons(bot.keyboardConfig || []);
                          setActiveTab("keyboard");
                        }}
                        title="Edit Keyboard Inline"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleBotMutation.mutate({ id: bot.id, isActive: !bot.isActive })}
                        disabled={toggleBotMutation.isPending}
                        title={bot.isActive ? "Matikan Bot" : "Aktifkan Bot"}
                      >
                        {bot.isActive ? 
                          <ToggleRight className="w-5 h-5 text-green-600" /> : 
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        }
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
                                    <Badge key={idx} variant="outline" className={`text-xs ${btn.isAllShow ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}`}>
                                      {btn.isAllShow ? '📋 All Show' : btn.text || 'Untitled'}
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

        <TabsContent value="keyboard" className="space-y-6">
          {editingBot ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5" />
                  Management Keyboard - {editingBot.botName}
                </CardTitle>
                <CardDescription>
                  Kelola konfigurasi keyboard inline untuk bot @{editingBot.botUsername}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Existing keyboard management interface will be moved here */}
                <div className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="welcomeMessage">Pesan Sambutan</Label>
                      <Textarea
                        id="welcomeMessage"
                        placeholder="Pesan sambutan bot"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h3 className="font-medium mb-3 flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      Quick Actions
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={addMainMenu} variant="outline" size="sm">
                        <Plus className="w-3 h-3 mr-1" />
                        +Menu Utama
                      </Button>
                      <Button onClick={addAllShowButton} variant="outline" size="sm">
                        <Grid3X3 className="w-3 h-3 mr-1" />
                        📋 All Show
                      </Button>
                    </div>
                  </div>

                  {/* Keyboard Layout Display */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Keyboard Layout</h3>
                    {keyboardButtons.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                        <Keyboard className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500">Belum ada tombol keyboard</p>
                        <p className="text-sm text-gray-400">Gunakan Quick Actions untuk menambah tombol</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Group buttons by main menu */}
                        {keyboardButtons
                          .filter(btn => btn.level === 0)
                          .map(mainButton => (
                            <div key={mainButton.id} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium flex items-center gap-2">
                                  <Menu className="w-4 h-4" />
                                  {mainButton.isAllShow ? '📋 All Show' : mainButton.text || 'Menu Utama'}
                                </h4>
                                <div className="flex gap-1">
                                  <Button
                                    onClick={() => addSubMenu(mainButton.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    +Sub Menu
                                  </Button>
                                  <Button
                                    onClick={() => removeKeyboardButton(mainButton.id)}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Main button fields */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                  <Label>Text</Label>
                                  <Input
                                    value={mainButton.text || ''}
                                    onChange={(e) => updateKeyboardButton(mainButton.id, 'text', e.target.value)}
                                    placeholder="Teks tombol"
                                  />
                                </div>
                                <div>
                                  <Label>Callback Data</Label>
                                  <Input
                                    value={mainButton.callbackData || ''}
                                    onChange={(e) => updateKeyboardButton(mainButton.id, 'callbackData', e.target.value)}
                                    placeholder="callback_data"
                                  />
                                </div>
                              </div>

                              {/* Sub menus */}
                              {keyboardButtons
                                .filter(btn => btn.parentId === mainButton.id)
                                .map(subButton => (
                                  <div key={subButton.id} className="ml-6 border-l-2 border-gray-200 pl-4 mt-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm font-medium flex items-center gap-1">
                                        <Layers className="w-3 h-3" />
                                        Sub Menu
                                      </span>
                                      <Button
                                        onClick={() => removeKeyboardButton(subButton.id)}
                                        variant="outline"
                                        size="sm"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <Label>Text</Label>
                                        <Input
                                          value={subButton.text || ''}
                                          onChange={(e) => updateKeyboardButton(subButton.id, 'text', e.target.value)}
                                          placeholder="Teks sub menu"
                                        />
                                      </div>
                                      <div>
                                        <Label>Callback Data</Label>
                                        <Input
                                          value={subButton.callbackData || ''}
                                          onChange={(e) => updateKeyboardButton(subButton.id, 'callbackData', e.target.value)}
                                          placeholder="callback_data"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4 pt-4 border-t">
                    <Button 
                      onClick={handleSubmit} 
                      disabled={createBotMutation.isPending || updateBotMutation.isPending}
                      className="flex-1"
                    >
                      {updateBotMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setEditingBot(null);
                        setActiveTab("manage");
                      }}
                    >
                      Kembali ke Kelola Bot
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Keyboard className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Pilih bot dari tab "Kelola Bot" terlebih dahulu</p>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("manage")}
                  className="mt-4"
                >
                  Pergi ke Kelola Bot
                </Button>
              </CardContent>
            </Card>
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

      {/* Level 4 Selector Dialog */}
      <Dialog open={showLevel4Selector} onOpenChange={setShowLevel4Selector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5" />
              Tambah Menu Level 4
            </DialogTitle>
            <DialogDescription>
              Pilih sub-sub menu untuk menambahkan menu level 4 baru
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Sub-Sub Menu</Label>
              <Select value={selectedLevel3ForLevel4} onValueChange={setSelectedLevel3ForLevel4}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sub-sub menu..." />
                </SelectTrigger>
                <SelectContent>
                  {keyboardButtons
                    .filter(btn => (btn.level || 0) === 2)
                    .map(btn => (
                      <SelectItem key={btn.id} value={btn.id}>
                        {btn.text || 'Sub-sub menu tanpa nama'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowLevel4Selector(false);
              setSelectedLevel3ForLevel4("");
            }}>
              Batal
            </Button>
            <Button onClick={addLevel4ToParent} disabled={!selectedLevel3ForLevel4}>
              Tambah Level 4
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Level 5 Selector Dialog */}
      <Dialog open={showLevel5Selector} onOpenChange={setShowLevel5Selector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Menu className="w-5 h-5" />
              Tambah Menu Level 5
            </DialogTitle>
            <DialogDescription>
              Pilih menu level 4 untuk menambahkan menu level 5 baru
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pilih Menu Level 4</Label>
              <Select value={selectedLevel4ForLevel5} onValueChange={setSelectedLevel4ForLevel5}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih menu level 4..." />
                </SelectTrigger>
                <SelectContent>
                  {keyboardButtons
                    .filter(btn => (btn.level || 0) === 3)
                    .map(btn => (
                      <SelectItem key={btn.id} value={btn.id}>
                        {btn.text || 'Menu level 4 tanpa nama'}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowLevel5Selector(false);
              setSelectedLevel4ForLevel5("");
            }}>
              Batal
            </Button>
            <Button onClick={addLevel5ToParent} disabled={!selectedLevel4ForLevel5}>
              Tambah Level 5
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