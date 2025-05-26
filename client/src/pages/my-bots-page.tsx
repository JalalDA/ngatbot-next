import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bot, 
  Plus, 
  Settings, 
  Play, 
  Pause, 
  Trash2, 
  Eye,
  MessageSquare,
  Users,
  Activity,
  Zap,
  BookOpen,
  Keyboard,
  Layers,
  Layers2,
  Menu,
  Grid3X3,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { KnowledgeModal } from "@/components/knowledge-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Keyboard interface for inline keyboard management
interface InlineKeyboard {
  id: string;
  text: string;
  callbackData: string;
  url?: string;
  level?: number;
  parentId?: string;
  responseText?: string;
  isAllShow?: boolean;
}

export default function MyBotsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [selectedBotForKeyboard, setSelectedBotForKeyboard] = useState<any>(null);
  const [keyboardButtons, setKeyboardButtons] = useState<InlineKeyboard[]>([]);
  const [collapsedMenus, setCollapsedMenus] = useState<Set<string>>(new Set());
  const [newBot, setNewBot] = useState({
    botToken: "",
    botName: "",
    botUsername: "",
    systemPrompt: "Aku adalah asisten AI Telegram Bot"
  });

  // Fetch bots data
  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["/api/bots"],
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (botData: any) => {
      const res = await apiRequest("POST", "/api/bots", botData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      setShowCreateModal(false);
      setNewBot({
        botToken: "",
        botName: "",
        botUsername: "",
        systemPrompt: "Aku adalah asisten AI Telegram Bot"
      });
      toast({
        title: "Success",
        description: "Bot has been created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bot.",
        variant: "destructive",
      });
    },
  });

  // Toggle bot status mutation
  const toggleBotMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/bots/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({
        title: "Success",
        description: "Bot status updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bot status.",
        variant: "destructive",
      });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/bots/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({
        title: "Success",
        description: "Bot deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bot.",
        variant: "destructive",
      });
    },
  });

  const handleCreateBot = () => {
    if (!newBot.botToken || !newBot.botName) {
      toast({
        title: "Error",
        description: "Please fill in required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Map form data to API expected format
    const botData = {
      token: newBot.botToken,
      botName: newBot.botName,
      botUsername: newBot.botUsername,
      systemPrompt: newBot.systemPrompt
    };
    
    createBotMutation.mutate(botData);
  };

  const handleToggleBot = (bot: any) => {
    toggleBotMutation.mutate({ id: bot.id, isActive: !bot.isActive });
  };

  const handleDeleteBot = (bot: any) => {
    if (confirm(`Are you sure you want to delete "${bot.botName}"?`)) {
      deleteBotMutation.mutate(bot.id);
    }
  };

  const handleManageKnowledge = (bot: any) => {
    setSelectedBot(bot);
    setShowKnowledgeModal(true);
  };

  // Keyboard management functions
  const handleSelectBotForKeyboard = (botId: string) => {
    const bot = bots.find((b: any) => b.id.toString() === botId);
    if (bot) {
      setSelectedBotForKeyboard(bot);
      // Load existing keyboard config
      if (bot.keyboardConfig) {
        setKeyboardButtons(bot.keyboardConfig);
      } else {
        setKeyboardButtons([]);
      }
    }
  };

  const addKeyboardButton = (level: number, parentId?: string) => {
    const newButton: InlineKeyboard = {
      id: Date.now().toString(),
      text: "",
      callbackData: "",
      level,
      parentId
    };
    setKeyboardButtons([...keyboardButtons, newButton]);
  };

  const updateKeyboardButton = (id: string, field: keyof InlineKeyboard, value: any) => {
    setKeyboardButtons(prev => 
      prev.map(btn => btn.id === id ? { ...btn, [field]: value } : btn)
    );
  };

  const removeKeyboardButton = (id: string) => {
    setKeyboardButtons(prev => prev.filter(btn => btn.id !== id));
  };

  const getMenuChildren = (parentId: string): InlineKeyboard[] => {
    const children: InlineKeyboard[] = [];
    
    const findChildren = (pid: string, level: number) => {
      const directChildren = keyboardButtons.filter(btn => btn.parentId === pid && (btn.level || 0) === level);
      children.push(...directChildren);
      
      directChildren.forEach(child => {
        if (level < 4) {
          findChildren(child.id, level + 1);
        }
      });
    };
    
    findChildren(parentId, 1);
    return children;
  };

  const toggleMenuCollapse = (menuId: string) => {
    const newCollapsed = new Set(collapsedMenus);
    if (newCollapsed.has(menuId)) {
      newCollapsed.delete(menuId);
    } else {
      newCollapsed.add(menuId);
    }
    setCollapsedMenus(newCollapsed);
  };

  // Save keyboard configuration
  const saveKeyboardConfig = async () => {
    if (!selectedBotForKeyboard) return;
    
    try {
      await apiRequest("PUT", `/api/autobots/${selectedBotForKeyboard.id}`, {
        keyboardConfig: keyboardButtons
      });
      
      toast({
        title: "Success",
        description: "Keyboard configuration saved successfully!",
      });
      
      // Refresh bots data
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message || "Failed to save keyboard configuration.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Kelola Bot</h1>
            <p className="text-muted-foreground">Manage your Telegram bots, keyboard configurations, and AI capabilities</p>
          </div>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 mt-4 sm:mt-0">
                <Plus className="w-4 h-4 mr-2" />
                Create New Bot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Bot</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="botToken">Bot Token *</Label>
                  <Input
                    id="botToken"
                    placeholder="Your Telegram bot token"
                    value={newBot.botToken}
                    onChange={(e) => setNewBot({ ...newBot, botToken: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="botName">Bot Name *</Label>
                  <Input
                    id="botName"
                    placeholder="My Awesome Bot"
                    value={newBot.botName}
                    onChange={(e) => setNewBot({ ...newBot, botName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="botUsername">Bot Username</Label>
                  <Input
                    id="botUsername"
                    placeholder="@myawesomebot"
                    value={newBot.botUsername}
                    onChange={(e) => setNewBot({ ...newBot, botUsername: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    placeholder="Define how your bot should behave..."
                    value={newBot.systemPrompt}
                    onChange={(e) => setNewBot({ ...newBot, systemPrompt: e.target.value })}
                  />
                </div>
                <Button 
                  onClick={handleCreateBot} 
                  disabled={createBotMutation.isPending}
                  className="w-full"
                >
                  {createBotMutation.isPending ? "Creating..." : "Create Bot"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs Navigation */}
        <Tabs defaultValue="bots" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="bots" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              My Bots
            </TabsTrigger>
            <TabsTrigger value="keyboard" className="flex items-center gap-2">
              <Keyboard className="w-4 h-4" />
              Keyboard Inline Bertingkat
            </TabsTrigger>
          </TabsList>

          {/* My Bots Tab */}
          <TabsContent value="bots" className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Bots</p>
                      <p className="text-2xl font-bold text-foreground">{Array.isArray(bots) ? bots.length : 0}</p>
                    </div>
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Bots</p>
                      <p className="text-2xl font-bold text-green-500">
                        {Array.isArray(bots) ? bots.filter((bot: any) => bot.isActive).length : 0}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Available Credits</p>
                      <p className="text-2xl font-bold text-amber-500">{user?.credits || 0}</p>
                    </div>
                    <Zap className="h-8 w-8 text-amber-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bots Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse bg-card border-border">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2 mb-4"></div>
                      <div className="h-8 bg-muted rounded w-full"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : Array.isArray(bots) && bots.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(bots as any[]).map((bot: any) => (
                  <Card key={bot.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary bg-card border-border">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5 text-primary-foreground" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold text-foreground">{bot.botName}</CardTitle>
                            <p className="text-sm text-muted-foreground">@{bot.botUsername}</p>
                          </div>
                        </div>
                        <Badge variant={bot.isActive ? "default" : "secondary"} className="text-foreground border-border">
                          {bot.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">
                        {bot.description || "No description available"}
                      </p>
                      
                      {/* Bot Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-2 bg-muted rounded-lg">
                          <MessageSquare className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">Messages</p>
                          <p className="text-sm font-semibold text-foreground">{bot.messageCount || 0}</p>
                        </div>
                        <div className="text-center p-2 bg-muted rounded-lg">
                          <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                          <p className="text-xs text-muted-foreground">Users</p>
                          <p className="text-sm font-semibold text-foreground">{bot.userCount || 0}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Status</span>
                          <Switch
                            checked={bot.isActive}
                            onCheckedChange={() => handleToggleBot(bot)}
                            disabled={toggleBotMutation.isPending}
                          />
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleManageKnowledge(bot)}
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            Knowledge
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBot(bot)}
                            disabled={deleteBotMutation.isPending}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Bot className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No bots yet</h3>
                  <p className="text-slate-600 mb-6">Create your first Telegram bot to get started</p>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Bot
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Keyboard Management Tab */}
          <TabsContent value="keyboard" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Keyboard className="w-6 h-6 text-blue-600" />
                  <div>
                    <CardTitle className="text-xl">Keyboard Inline Bertingkat</CardTitle>
                    <p className="text-sm text-muted-foreground">Konfigurasi menu hierarkis dengan struktur Menu Utama → Sub Menu</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bot Selector */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Pilih Bot untuk Konfigurasi Keyboard:</Label>
                  <Select value={selectedBotForKeyboard?.id?.toString() || ""} onValueChange={handleSelectBotForKeyboard}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih bot yang akan dikonfigurasi" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(bots) && (bots as any[]).map((bot: any) => (
                        <SelectItem key={bot.id} value={bot.id.toString()}>
                          <div className="flex items-center gap-2">
                            <Bot className="w-4 h-4" />
                            <span>{bot.botName} (@{bot.botUsername})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Keyboard Configuration */}
                {selectedBotForKeyboard && (
                  <div className="space-y-6">
                    {/* Quick Actions */}
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
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Menu Utama
                      </Button>
                    </div>

                    {/* Menu Groups Management */}
                    <div className="space-y-4">
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
                                  className="h-8 w-8 p-0"
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
                                  <h3 className="font-semibold text-lg">
                                    {mainMenu.isAllShow ? '📋 All Show Button' : `Menu Utama ${index + 1}`}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {mainMenu.text || 'Untitled Menu'} 
                                    {totalChildren > 0 && (
                                      <span className="ml-1">• {totalChildren} sub-menu</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeKeyboardButton(mainMenu.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Main Menu Configuration */}
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs font-medium">Teks Tombol</Label>
                                  <Input
                                    placeholder="Nama menu utama"
                                    value={mainMenu.text}
                                    onChange={(e) => updateKeyboardButton(mainMenu.id, "text", e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs font-medium">Callback Data</Label>
                                  <Input
                                    placeholder="callback_data"
                                    value={mainMenu.callbackData}
                                    onChange={(e) => updateKeyboardButton(mainMenu.id, "callbackData", e.target.value)}
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              {/* Quick Actions for this group */}
                              {!mainMenu.isAllShow && (
                                <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => addKeyboardButton(1, mainMenu.id)}
                                    className="flex items-center gap-2"
                                  >
                                    <Layers className="w-3 h-3" />
                                    Sub Menu
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                      <Button onClick={saveKeyboardConfig} className="bg-blue-600 hover:bg-blue-700">
                        <Settings className="w-4 h-4 mr-2" />
                        Simpan Konfigurasi
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Knowledge Modal */}
      {selectedBot && (
        <KnowledgeModal
          open={showKnowledgeModal}
          onOpenChange={(open) => {
            setShowKnowledgeModal(open);
            if (!open) setSelectedBot(null);
          }}
          botId={selectedBot.id}
          botName={selectedBot.botName}
        />
      )}
    </div>
  );
}