import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Bot, Keyboard, Plus, Trash2, Edit, Eye, Square } from "lucide-react";

interface AutoBot {
  id: number;
  token: string;
  botName: string;
  botUsername: string;
  welcomeMessage: string;
  isActive: boolean;
  keyboardConfig: InlineKeyboard[] | null;
  createdAt: string;
}

interface InlineKeyboard {
  id: string;
  text: string;
  callbackData: string;
  url?: string;
}

interface KeyboardRow {
  id: string;
  buttons: InlineKeyboard[];
}

export default function AutoBotBuilderPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form states
  const [newBotToken, setNewBotToken] = useState("");
  const [botName, setBotName] = useState("");
  const [botUsername, setBotUsername] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("Selamat datang! Silakan pilih opsi di bawah ini:");
  const [keyboardRows, setKeyboardRows] = useState<KeyboardRow[]>([]);
  
  // UI states
  const [editingBot, setEditingBot] = useState<AutoBot | null>(null);
  const [viewingBot, setViewingBot] = useState<AutoBot | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  // Fetch auto bots
  const { data: autoBots = [], isLoading } = useQuery({
    queryKey: ["/api/autobots"],
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (data: {
      token: string;
      botName: string;
      botUsername: string;
      welcomeMessage: string;
      keyboardConfig: InlineKeyboard[];
    }) => {
      const response = await fetch("/api/autobots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
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

  // Update bot mutation
  const updateBotMutation = useMutation({
    mutationFn: async (data: {
      id: number;
      welcomeMessage: string;
      keyboardConfig: InlineKeyboard[];
    }) => {
      const response = await fetch(`/api/autobots/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          welcomeMessage: data.welcomeMessage,
          keyboardConfig: data.keyboardConfig,
        }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({ title: "Sukses!", description: "Bot berhasil diperbarui" });
      setEditingBot(null);
      resetForm();
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/autobots/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autobots"] });
      toast({ title: "Sukses!", description: "Bot berhasil dihapus" });
    },
  });

  // Keyboard row management functions
  const addKeyboardRow = () => {
    const newRow: KeyboardRow = {
      id: Date.now().toString(),
      buttons: []
    };
    setKeyboardRows(prev => [...prev, newRow]);
  };

  const removeKeyboardRow = (rowId: string) => {
    setKeyboardRows(rows => rows.filter(row => row.id !== rowId));
  };

  const addButtonToRow = (rowId: string) => {
    const newButton: InlineKeyboard = {
      id: Date.now().toString(),
      text: "",
      callbackData: "",
      url: ""
    };
    setKeyboardRows(rows => 
      rows.map(row => 
        row.id === rowId 
          ? { ...row, buttons: [...row.buttons, newButton] }
          : row
      )
    );
  };

  const updateButton = (rowId: string, buttonId: string, field: keyof InlineKeyboard, value: string) => {
    setKeyboardRows(rows => 
      rows.map(row => 
        row.id === rowId 
          ? {
              ...row,
              buttons: row.buttons.map(button => 
                button.id === buttonId ? { ...button, [field]: value } : button
              )
            }
          : row
      )
    );
  };

  const removeButtonFromRow = (rowId: string, buttonId: string) => {
    setKeyboardRows(rows => 
      rows.map(row => 
        row.id === rowId 
          ? { ...row, buttons: row.buttons.filter(button => button.id !== buttonId) }
          : row
      )
    );
  };

  // Token validation
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

  // Form management
  const resetForm = () => {
    setNewBotToken("");
    setBotName("");
    setBotUsername("");
    setWelcomeMessage("Selamat datang! Silakan pilih opsi di bawah ini:");
    setKeyboardRows([]);
    setEditingBot(null);
  };

  const startEditing = (bot: AutoBot) => {
    setEditingBot(bot);
    setWelcomeMessage(bot.welcomeMessage);
    
    // Convert flat keyboard config to rows
    if (bot.keyboardConfig) {
      const rows: KeyboardRow[] = [
        {
          id: "edit-row-1",
          buttons: bot.keyboardConfig
        }
      ];
      setKeyboardRows(rows);
    } else {
      setKeyboardRows([]);
    }
  };

  const handleSubmit = async () => {
    if (editingBot) {
      // Convert rows to flat array for API
      const flatButtons = keyboardRows.flatMap(row => row.buttons);
      updateBotMutation.mutate({
        id: editingBot.id,
        welcomeMessage,
        keyboardConfig: flatButtons,
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
      
      // Convert rows to flat array for API
      const flatButtons = keyboardRows.flatMap(row => row.buttons);
      createBotMutation.mutate({
        token: newBotToken,
        botName,
        botUsername,
        welcomeMessage,
        keyboardConfig: flatButtons,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Auto Bot Builder</h1>
        <p className="text-gray-600 mt-2">Buat dan kelola bot Telegram otomatis dengan keyboard inline</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Configuration Form */}
        <div className="space-y-6">
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

          {/* Inline Keyboard Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Keyboard className="w-5 h-5 mr-2 inline" />
                Keyboard Inline Configuration
              </CardTitle>
              <CardDescription>
                Konfigurasi tombol-tombol yang akan muncul di bawah pesan sambutan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {keyboardRows.map((row, rowIndex) => (
                <div key={row.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Row {rowIndex + 1}</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeKeyboardRow(row.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {row.buttons.map((button) => (
                    <div key={button.id} className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input
                        placeholder="Text Button"
                        value={button.text}
                        onChange={(e) => updateButton(row.id, button.id, "text", e.target.value)}
                      />
                      <Input
                        placeholder="Callback Data"
                        value={button.callbackData}
                        onChange={(e) => updateButton(row.id, button.id, "callbackData", e.target.value)}
                      />
                      <div className="flex gap-1">
                        <Input
                          placeholder="URL (optional)"
                          value={button.url || ""}
                          onChange={(e) => updateButton(row.id, button.id, "url", e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeButtonFromRow(row.id, button.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    onClick={() => addButtonToRow(row.id)}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Button to Row
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                onClick={addKeyboardRow}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Row
              </Button>

              <Separator />

              <Button
                onClick={handleSubmit}
                disabled={createBotMutation.isPending || updateBotMutation.isPending}
                className="w-full"
              >
                {createBotMutation.isPending || updateBotMutation.isPending
                  ? "Processing..."
                  : editingBot
                  ? "Update Bot"
                  : "Create Bot"}
              </Button>

              {editingBot && (
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="w-full"
                >
                  Cancel Edit
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bot Management List */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Kelola Bot</CardTitle>
              <CardDescription>Daftar bot yang telah dibuat dan opsi pengelolaan</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-4">Loading bots...</p>
              ) : (autoBots as AutoBot[]).length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  Belum ada bot yang dibuat. Buat bot pertama Anda!
                </p>
              ) : (
                <div className="space-y-4">
                  {(autoBots as AutoBot[]).map((bot) => (
                    <div key={bot.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h3 className="font-medium">{bot.botName}</h3>
                          <p className="text-sm text-muted-foreground">@{bot.botUsername}</p>
                        </div>
                        <Badge variant={bot.isActive ? "default" : "secondary"}>
                          {bot.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {bot.welcomeMessage.length > 60 
                          ? `${bot.welcomeMessage.substring(0, 60)}...` 
                          : bot.welcomeMessage}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditing(bot)}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingBot(bot)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm("Apakah Anda yakin ingin menghapus bot ini?")) {
                              deleteBotMutation.mutate(bot.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* View Bot Dialog */}
      <Dialog open={!!viewingBot} onOpenChange={() => setViewingBot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bot Details</DialogTitle>
            <DialogDescription>
              Informasi lengkap tentang bot {viewingBot?.botName}
            </DialogDescription>
          </DialogHeader>
          
          {viewingBot && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bot Name</Label>
                  <p className="text-sm">{viewingBot.botName}</p>
                </div>
                <div>
                  <Label>Username</Label>
                  <p className="text-sm">@{viewingBot.botUsername}</p>
                </div>
              </div>
              
              <div>
                <Label>Welcome Message</Label>
                <p className="text-sm">{viewingBot.welcomeMessage}</p>
              </div>
              
              <div>
                <Label>Status</Label>
                <Badge variant={viewingBot.isActive ? "default" : "secondary"}>
                  {viewingBot.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              
              {viewingBot.keyboardConfig && viewingBot.keyboardConfig.length > 0 && (
                <div>
                  <Label>Keyboard Configuration</Label>
                  <div className="space-y-2 mt-2">
                    {viewingBot.keyboardConfig.map((button, index) => (
                      <div key={index} className="flex gap-2 text-sm">
                        <span className="font-medium">{button.text}</span>
                        <span className="text-muted-foreground">({button.callbackData})</span>
                        {button.url && <span className="text-blue-600">{button.url}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setViewingBot(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}