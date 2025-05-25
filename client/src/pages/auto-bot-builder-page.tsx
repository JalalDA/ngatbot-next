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
import { Plus, Trash2, Bot, Keyboard, Settings, Play, Square, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

  // Fetch auto bots
  const { data: autoBots = [], isLoading } = useQuery({
    queryKey: ["/api/autobots"],
    enabled: true,
  });

  // Toggle bot status mutation
  const toggleBotMutation = useMutation({
    mutationFn: async (data: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/autobots/${data.id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: data.isActive }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({ title: "Sukses!", description: "Status bot berhasil diperbarui" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const response = await fetch(`/api/autobots/${botId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({ title: "Sukses!", description: "Bot berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update bot mutation
  const updateBotMutation = useMutation({
    mutationFn: async (data: { id: number; welcomeMessage: string; keyboardConfig: InlineKeyboard[] }) => {
      const response = await fetch(`/api/autobots/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcomeMessage: data.welcomeMessage,
          keyboardConfig: data.keyboardConfig,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({ title: "Sukses!", description: "Bot berhasil diperbarui" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });


  // Create auto bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (data: { token: string; botName: string; botUsername: string; welcomeMessage: string; keyboardConfig: InlineKeyboard[] }) => {
      console.log('🚀 Creating bot with data:', data);
      
      const response = await fetch("/api/autobots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        // Try to parse as JSON for better error message
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || errorText);
        } catch {
          throw new Error(errorText);
        }
      }

      const responseText = await response.text();
      console.log('📜 Success response:', responseText.substring(0, 200));

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid response format from server');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({ title: "Sukses!", description: "Bot berhasil dibuat dan diaktifkan" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });



  const addKeyboardButton = () => {
    const newButton: InlineKeyboard = {
      id: Date.now().toString(),
      text: "",
      callbackData: "",
    };
    setKeyboardButtons([...keyboardButtons, newButton]);
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

  const validateToken = async (token: string) => {
    if (!token.trim()) return false;
    
    setIsValidatingToken(true);
    try {
      const response = await fetch('/api/autobots/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        toast({ title: "Error", description: "Gagal memvalidasi token", variant: "destructive" });
        return false;
      }

      const result = await response.json();
      
      if (result.valid && result.botInfo) {
        setBotName(result.botInfo.first_name);
        setBotUsername(result.botInfo.username);
        toast({ title: "Sukses!", description: "Token bot valid!" });
        return true;
      } else {
        toast({ title: "Error", description: result.error || "Token tidak valid", variant: "destructive" });
        return false;
      }
    } catch (error) {
      toast({ title: "Error", description: "Gagal memvalidasi token", variant: "destructive" });
      return false;
    } finally {
      setIsValidatingToken(false);
    }
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
    setActiveTab("create"); // Switch to the edit tab
    // Scroll to top to show edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (editingBot) {
      updateBotMutation.mutate({
        id: editingBot.id,
        welcomeMessage,
        keyboardConfig: keyboardButtons,
      });
    } else {
      if (!newBotToken.trim()) {
        toast({ title: "Error", description: "Token bot harus diisi", variant: "destructive" });
        return;
      }
      
      // Validate token first if botName and botUsername are not set
      if (!botName || !botUsername) {
        const isValid = await validateToken(newBotToken);
        if (!isValid) {
          return;
        }
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
        <p className="text-muted-foreground">Buat bot Telegram otomatis dengan keyboard inline</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">
            <Plus className="w-4 h-4 mr-2" />
            {editingBot ? "Edit Bot" : "Buat Bot"}
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
                {editingBot ? "Edit Bot" : "Konfigurasi Bot Baru"}
              </CardTitle>
              <CardDescription>
                {editingBot ? "Edit pengaturan bot Telegram Anda" : "Masukkan token bot Telegram dan konfigurasikan keyboard inline"}
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
                        className="flex-1"
                      />
                      <Button 
                        type="button"
                        variant="outline"
                        onClick={() => validateToken(newBotToken)}
                        disabled={!newBotToken.trim() || isValidatingToken}
                      >
                        {isValidatingToken ? "Validating..." : "Validate"}
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
                Keyboard Inline
              </CardTitle>
              <CardDescription>
                Konfigurasi tombol-tombol yang akan muncul di bawah pesan sambutan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {keyboardButtons.map((button, index) => (
                <div key={button.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-sm font-medium">Tombol {index + 1}</Label>
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
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addKeyboardButton}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tambah Tombol
              </Button>

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
                      <p className="text-sm text-muted-foreground">{bot.welcomeMessage}</p>
                    </div>
                    
                    {bot.keyboardConfig && bot.keyboardConfig.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Keyboard Buttons:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {bot.keyboardConfig.map((button, index) => (
                            <Badge key={index} variant="outline">
                              {button.text}
                            </Badge>
                          ))}
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
    </div>
  );
}