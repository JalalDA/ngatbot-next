import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bot, Settings, Play, Trash2, Edit, MessageSquare, Menu } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface NonAiChatbot {
  id: number;
  userId: number;
  botToken: string;
  botUsername: string;
  botName: string;
  webhookUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BotFlow {
  id: number;
  chatbotId: number;
  command: string;
  type: "menu" | "text" | "inline";
  text: string;
  buttons: string[] | null;
  parentCommand: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MenuHierarchy {
  command: string;
  text: string;
  submenus: MenuHierarchy[];
}

export default function ChatbotBuilderPage() {
  const [selectedChatbot, setSelectedChatbot] = useState<NonAiChatbot | null>(null);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [showEditFlow, setShowEditFlow] = useState(false);
  const [showHierarchicalBuilder, setShowHierarchicalBuilder] = useState(false);
  const [showCreateInlineFlow, setShowCreateInlineFlow] = useState(false);
  const [editingFlow, setEditingFlow] = useState<BotFlow | null>(null);
  const [newBotToken, setNewBotToken] = useState("");
  const [flowForm, setFlowForm] = useState({
    command: "",
    type: "text" as "menu" | "text" | "inline",
    text: "",
    buttons: [""],
    parentCommand: ""
  });
  const [menuHierarchy, setMenuHierarchy] = useState<MenuHierarchy[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch chatbots
  const { data: chatbots = [], isLoading: loadingChatbots } = useQuery({
    queryKey: ["/api/nonai-chatbots"],
    queryFn: async () => {
      const res = await fetch("/api/nonai-chatbots");
      if (!res.ok) throw new Error("Failed to fetch chatbots");
      return res.json();
    },
  });

  // Fetch flows for selected chatbot
  const { data: flows = [], isLoading: loadingFlows } = useQuery({
    queryKey: ["/api/nonai-chatbots", selectedChatbot?.id, "flows"],
    queryFn: async () => {
      if (!selectedChatbot) return [];
      const res = await fetch(`/api/nonai-chatbots/${selectedChatbot.id}/flows`);
      if (!res.ok) throw new Error("Failed to fetch flows");
      return res.json();
    },
    enabled: !!selectedChatbot,
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (botToken: string) => {
      const res = await apiRequest("POST", "/api/nonai-chatbots", { botToken });
      return await res.json();
    },
    onSuccess: (newBot) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots"] });
      setShowCreateBot(false);
      setNewBotToken("");
      setSelectedChatbot(newBot);
      toast({
        title: "Success! 🎉",
        description: `Bot @${newBot.botUsername} created successfully!`,
      });
    },
    onError: (error: any) => {
      console.error("Create bot error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create bot",
        variant: "destructive",
      });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const res = await apiRequest("DELETE", `/api/nonai-chatbots/${botId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots"] });
      if (selectedChatbot) {
        setSelectedChatbot(null);
      }
      toast({
        title: "Success",
        description: "Bot deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bot",
        variant: "destructive",
      });
    },
  });

  // Create flow mutation
  const createFlowMutation = useMutation({
    mutationFn: async (flowData: any) => {
      const res = await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot?.id}/flows`, flowData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot?.id, "flows"] });
      setShowCreateFlow(false);
      setFlowForm({
        command: "",
        type: "text",
        text: "",
        buttons: [""],
        parentCommand: ""
      });
      toast({
        title: "Success",
        description: "Flow created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create flow",
        variant: "destructive",
      });
    },
  });

  // Update flow mutation
  const updateFlowMutation = useMutation({
    mutationFn: async ({ flowId, flowData }: { flowId: number; flowData: any }) => {
      const res = await apiRequest("PUT", `/api/nonai-chatbots/${selectedChatbot?.id}/flows/${flowId}`, flowData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot?.id, "flows"] });
      setShowEditFlow(false);
      setEditingFlow(null);
      setFlowForm({
        command: "",
        type: "text",
        text: "",
        buttons: [""],
        parentCommand: ""
      });
      toast({
        title: "Success",
        description: "Flow updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update flow",
        variant: "destructive",
      });
    },
  });

  // Delete flow mutation
  const deleteFlowMutation = useMutation({
    mutationFn: async (flowId: number) => {
      const res = await apiRequest("DELETE", `/api/nonai-chatbots/${selectedChatbot?.id}/flows/${flowId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot?.id, "flows"] });
      toast({
        title: "Success",
        description: "Flow deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete flow",
        variant: "destructive",
      });
    },
  });

  const createExampleFlowsMutation = useMutation({
    mutationFn: async (chatbotId: number) => {
      const res = await apiRequest("POST", `/api/nonai-chatbots/${chatbotId}/create-example`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot?.id, "flows"] });
      toast({
        title: "Success! 🎉",
        description: "Contoh menu bertingkat berhasil dibuat! Bot Anda siap digunakan.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create example flows",
        variant: "destructive",
      });
    },
  });

  const handleCreateBot = () => {
    if (!newBotToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a bot token",
        variant: "destructive",
      });
      return;
    }
    createBotMutation.mutate(newBotToken.trim());
  };

  const handleCreateFlow = () => {
    if (!flowForm.command || !flowForm.text) {
      toast({
        title: "Error",
        description: "Command and text are required",
        variant: "destructive",
      });
      return;
    }

    const flowData = {
      command: flowForm.command,
      type: flowForm.type,
      text: flowForm.text,
      buttons: flowForm.type === "menu" ? flowForm.buttons.filter(b => b.trim()) : undefined,
      parentCommand: flowForm.parentCommand || undefined
    };

    createFlowMutation.mutate(flowData);
  };

  const handleUpdateFlow = () => {
    if (!editingFlow || !flowForm.command || !flowForm.text) {
      toast({
        title: "Error",
        description: "Command and text are required",
        variant: "destructive",
      });
      return;
    }

    const flowData = {
      command: flowForm.command,
      type: flowForm.type,
      text: flowForm.text,
      buttons: flowForm.type === "menu" ? flowForm.buttons.filter(b => b.trim()) : undefined,
      parentCommand: flowForm.parentCommand || undefined
    };

    updateFlowMutation.mutate({ flowId: editingFlow.id, flowData });
  };

  const handleEditFlow = (flow: BotFlow) => {
    setEditingFlow(flow);
    setFlowForm({
      command: flow.command,
      type: flow.type,
      text: flow.text,
      buttons: flow.buttons || [""],
      parentCommand: flow.parentCommand || ""
    });
    setShowEditFlow(true);
  };

  const addButton = () => {
    setFlowForm(prev => ({
      ...prev,
      buttons: [...prev.buttons, ""]
    }));
  };

  const removeButton = (index: number) => {
    setFlowForm(prev => ({
      ...prev,
      buttons: prev.buttons.filter((_, i) => i !== index)
    }));
  };

  const updateButton = (index: number, value: string) => {
    setFlowForm(prev => ({
      ...prev,
      buttons: prev.buttons.map((button, i) => i === index ? value : button)
    }));
  };

  // Template creation functions
  const createBusinessMenuTemplate = async () => {
    if (!selectedChatbot) return;
    
    const businessFlows = [
      {
        command: "/start",
        type: "menu" as const,
        text: "🏢 Selamat datang di bisnis kami! Pilih menu di bawah:",
        buttons: ["🔧 Layanan", "💰 Harga", "📞 Kontak", "ℹ️ Tentang Kami"],
        parentCommand: null
      },
      {
        command: "🔧 Layanan",
        type: "menu" as const,
        text: "🔧 Berikut adalah layanan yang kami tawarkan:",
        buttons: ["⚡ Konsultasi", "🛠️ Implementasi", "🔄 Maintenance", "🔙 Kembali"],
        parentCommand: "/start"
      },
      {
        command: "💰 Harga",
        type: "menu" as const,
        text: "💰 Paket harga kami:",
        buttons: ["📦 Basic", "⭐ Premium", "💎 Enterprise", "🔙 Kembali"],
        parentCommand: "/start"
      },
      {
        command: "📞 Kontak",
        type: "text" as const,
        text: "📞 Hubungi kami:\n📧 Email: info@bisnis.com\n📱 WhatsApp: +62812345678\n🌐 Website: www.bisnis.com",
        buttons: null,
        parentCommand: "/start"
      },
      {
        command: "🔙 Kembali",
        type: "menu" as const,
        text: "🏢 Selamat datang di bisnis kami! Pilih menu di bawah:",
        buttons: ["🔧 Layanan", "💰 Harga", "📞 Kontak", "ℹ️ Tentang Kami"],
        parentCommand: null
      }
    ];

    try {
      for (const flow of businessFlows) {
        await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot.id}/flows`, flow);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot.id, "flows"] });
      setShowHierarchicalBuilder(false);
      toast({
        title: "Success! 🎉",
        description: "Business menu template created with 2x2 layout for main menu!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create business menu template",
        variant: "destructive",
      });
    }
  };

  const createEcommerceMenuTemplate = async () => {
    if (!selectedChatbot) return;
    
    const ecommerceFlows = [
      {
        command: "/start",
        type: "menu" as const,
        text: "🛒 Selamat datang di toko online kami! Pilih menu:",
        buttons: ["📱 Produk", "📦 Pesanan", "🎧 Support", "👤 Akun"],
        parentCommand: null
      },
      {
        command: "📱 Produk",
        type: "menu" as const,
        text: "📱 Kategori produk kami:",
        buttons: ["💻 Electronics", "👕 Fashion", "🏠 Home", "🔙 Kembali"],
        parentCommand: "/start"
      },
      {
        command: "📦 Pesanan",
        type: "menu" as const,
        text: "📦 Kelola pesanan Anda:",
        buttons: ["🔍 Cek Status", "📋 Riwayat", "❌ Batal", "🔙 Kembali"],
        parentCommand: "/start"
      },
      {
        command: "🔙 Kembali",
        type: "menu" as const,
        text: "🛒 Selamat datang di toko online kami! Pilih menu:",
        buttons: ["📱 Produk", "📦 Pesanan", "🎧 Support", "👤 Akun"],
        parentCommand: null
      }
    ];

    try {
      for (const flow of ecommerceFlows) {
        await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot.id}/flows`, flow);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot.id, "flows"] });
      setShowHierarchicalBuilder(false);
      toast({
        title: "Success! 🎉",
        description: "E-commerce menu template created with 2x2 layout!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create e-commerce menu template",
        variant: "destructive",
      });
    }
  };

  const createSocialMediaMenuTemplate = async () => {
    if (!selectedChatbot) return;
    
    const socialFlows = [
      {
        command: "/start",
        type: "menu" as const,
        text: "📱 Social Media Services - Pilih layanan:",
        buttons: ["👥 Followers", "❤️ Likes", "👁️ Views", "📊 Analytics"],
        parentCommand: null
      },
      {
        command: "👥 Followers",
        type: "menu" as const,
        text: "👥 Followers Services:",
        buttons: ["📸 Instagram", "📘 Facebook", "🐦 Twitter", "🔙 Kembali"],
        parentCommand: "/start"
      },
      {
        command: "❤️ Likes",
        type: "menu" as const,
        text: "❤️ Likes Services:",
        buttons: ["📸 Instagram", "📘 Facebook", "▶️ YouTube", "🔙 Kembali"],
        parentCommand: "/start"
      },
      {
        command: "🔙 Kembali",
        type: "menu" as const,
        text: "📱 Social Media Services - Pilih layanan:",
        buttons: ["👥 Followers", "❤️ Likes", "👁️ Views", "📊 Analytics"],
        parentCommand: null
      }
    ];

    try {
      for (const flow of socialFlows) {
        await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot.id}/flows`, flow);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot.id, "flows"] });
      setShowHierarchicalBuilder(false);
      toast({
        title: "Success! 🎉",
        description: "Social Media menu template created with 2x2 layout!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create social media menu template",
        variant: "destructive",
      });
    }
  };

  const createCustomMenuTemplate = () => {
    setShowHierarchicalBuilder(false);
    setShowCreateFlow(true);
    toast({
      title: "Custom Menu Builder",
      description: "Use 'Add Flow' to create your custom menu structure. Remember: 4 buttons = 2x2 layout!",
    });
  };

  // Inline Menu Template Functions
  const createInlineWebsiteTemplate = async () => {
    if (!selectedChatbot) return;
    
    const inlineFlows = [
      {
        command: "/start",
        type: "inline" as const,
        text: "🌐 Selamat datang di website kami! Pilih menu:",
        buttons: ["🔧 Fitur Bot", "📄 Panduan", "🌐 Website", "⬅️ Kembali"],
        parentCommand: null
      },
      {
        command: "🔧 Fitur Bot",
        type: "inline" as const,
        text: "🔧 Fitur-fitur yang tersedia di bot kami:",
        buttons: ["⚡ AI Chat", "📊 Analytics", "🛠️ Tools", "⬅️ Kembali"],
        parentCommand: "/start"
      },
      {
        command: "📄 Panduan",
        type: "text" as const,
        text: "📄 Panduan Penggunaan:\n\n1. Klik menu yang tersedia\n2. Gunakan tombol inline untuk navigasi\n3. Klik 'Kembali' untuk menu sebelumnya\n4. Semua fitur gratis untuk dicoba!",
        buttons: null,
        parentCommand: "/start"
      },
      {
        command: "⬅️ Kembali",
        type: "inline" as const,
        text: "🌐 Selamat datang di website kami! Pilih menu:",
        buttons: ["🔧 Fitur Bot", "📄 Panduan", "🌐 Website", "⬅️ Kembali"],
        parentCommand: null
      }
    ];

    try {
      for (const flow of inlineFlows) {
        await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot.id}/flows`, flow);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot.id, "flows"] });
      setShowCreateInlineFlow(false);
      toast({
        title: "Success! ⚡",
        description: "Website inline menu template created! Buttons appear under messages.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create inline website template",
        variant: "destructive",
      });
    }
  };

  const createInlineServicesTemplate = async () => {
    if (!selectedChatbot) return;
    
    const serviceFlows = [
      {
        command: "/start",
        type: "inline" as const,
        text: "🔧 Layanan Profesional Kami - Pilih kategori:",
        buttons: ["💬 Konsultasi", "🎧 Support", "💰 Pricing", "📞 Contact"],
        parentCommand: null
      },
      {
        command: "💬 Konsultasi",
        type: "text" as const,
        text: "💬 Konsultasi Gratis!\n\n✅ Analisis kebutuhan bisnis\n✅ Rekomendasi solusi terbaik\n✅ Estimasi timeline proyek\n\nHubungi: konsultasi@perusahaan.com",
        buttons: null,
        parentCommand: "/start"
      },
      {
        command: "🎧 Support",
        type: "inline" as const,
        text: "🎧 Customer Support 24/7:",
        buttons: ["📧 Email", "💬 Live Chat", "📱 WhatsApp", "⬅️ Kembali"],
        parentCommand: "/start"
      },
      {
        command: "⬅️ Kembali",
        type: "inline" as const,
        text: "🔧 Layanan Profesional Kami - Pilih kategori:",
        buttons: ["💬 Konsultasi", "🎧 Support", "💰 Pricing", "📞 Contact"],
        parentCommand: null
      }
    ];

    try {
      for (const flow of serviceFlows) {
        await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot.id}/flows`, flow);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot.id, "flows"] });
      setShowCreateInlineFlow(false);
      toast({
        title: "Success! 🔧",
        description: "Services inline menu template created with professional layout!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create inline services template",
        variant: "destructive",
      });
    }
  };

  const createInlineSocialTemplate = async () => {
    if (!selectedChatbot) return;
    
    const socialFlows = [
      {
        command: "/start",
        type: "inline" as const,
        text: "📱 Follow us on Social Media:",
        buttons: ["📸 Instagram", "📘 Facebook", "🐦 Twitter", "▶️ YouTube"],
        parentCommand: null
      },
      {
        command: "📸 Instagram",
        type: "text" as const,
        text: "📸 Follow us on Instagram!\n\n🔗 Link: https://instagram.com/yourcompany\n\n✨ Dapatkan update terbaru\n📷 Behind the scenes content\n🎁 Exclusive giveaways",
        buttons: null,
        parentCommand: "/start"
      },
      {
        command: "📘 Facebook",
        type: "text" as const,
        text: "📘 Like our Facebook Page!\n\n🔗 Link: https://facebook.com/yourcompany\n\n📰 Latest news & updates\n👥 Community discussions\n🎯 Targeted content",
        buttons: null,
        parentCommand: "/start"
      }
    ];

    try {
      for (const flow of socialFlows) {
        await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot.id}/flows`, flow);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot.id, "flows"] });
      setShowCreateInlineFlow(false);
      toast({
        title: "Success! 📱",
        description: "Social Media inline menu with links created!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create inline social template",
        variant: "destructive",
      });
    }
  };

  const createInlineNavigationTemplate = async () => {
    if (!selectedChatbot) return;
    
    const navFlows = [
      {
        command: "/start",
        type: "inline" as const,
        text: "🧭 Navigasi Utama - Pilih halaman:",
        buttons: ["🏠 Home", "🔧 Services", "ℹ️ About", "📞 Contact"],
        parentCommand: null
      },
      {
        command: "🏠 Home",
        type: "text" as const,
        text: "🏠 Welcome to our Home!\n\n🌟 Perusahaan teknologi terdepan\n💼 Solusi digital terpercaya\n🚀 Inovasi untuk masa depan\n\nTerima kasih telah mengunjungi kami!",
        buttons: null,
        parentCommand: "/start"
      },
      {
        command: "🔧 Services",
        type: "inline" as const,
        text: "🔧 Our Services:",
        buttons: ["💻 Web Dev", "📱 Mobile App", "☁️ Cloud", "⬅️ Kembali"],
        parentCommand: "/start"
      },
      {
        command: "ℹ️ About",
        type: "text" as const,
        text: "ℹ️ About Us:\n\n🏢 Didirikan tahun 2020\n👨‍💻 Tim ahli berpengalaman\n🌍 Melayani klien global\n🏆 Award-winning solutions\n\nVisi: Menjadi leader di bidang teknologi",
        buttons: null,
        parentCommand: "/start"
      },
      {
        command: "⬅️ Kembali",
        type: "inline" as const,
        text: "🧭 Navigasi Utama - Pilih halaman:",
        buttons: ["🏠 Home", "🔧 Services", "ℹ️ About", "📞 Contact"],
        parentCommand: null
      }
    ];

    try {
      for (const flow of navFlows) {
        await apiRequest("POST", `/api/nonai-chatbots/${selectedChatbot.id}/flows`, flow);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots", selectedChatbot.id, "flows"] });
      setShowCreateInlineFlow(false);
      toast({
        title: "Success! 🧭",
        description: "Navigation inline menu template created with website-style navigation!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create inline navigation template",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Non-AI Chatbot Builder</h1>
          <p className="text-muted-foreground">Create and manage menu-based Telegram bots</p>
        </div>
        
        <Dialog open={showCreateBot} onOpenChange={setShowCreateBot}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Bot
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Non-AI Bot</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter your bot token from @BotFather
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token" className="text-foreground">Bot Token</Label>
                <Input
                  id="token"
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  value={newBotToken}
                  onChange={(e) => setNewBotToken(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateBot} 
                  disabled={createBotMutation.isPending}
                  className="flex-1"
                >
                  {createBotMutation.isPending ? "Creating..." : "Create Bot"}
                </Button>
                <Button variant="outline" onClick={() => setShowCreateBot(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="bots" className="w-full">
        <TabsList className="bg-accent">
          <TabsTrigger value="bots" className="data-[state=active]:bg-background">My Bots</TabsTrigger>
          <TabsTrigger value="flows" className="data-[state=active]:bg-background" disabled={!selectedChatbot}>
            Bot Flows {selectedChatbot && `(${selectedChatbot.botName})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bots" className="space-y-4">
          {loadingChatbots ? (
            <div className="text-center py-8 text-muted-foreground">Loading chatbots...</div>
          ) : chatbots.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No chatbots yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first non-AI chatbot to get started
                </p>
                <Button onClick={() => setShowCreateBot(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Bot
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chatbots.map((chatbot: NonAiChatbot) => (
                <Card key={chatbot.id} className="bg-card border-border hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <Bot className="h-5 w-5" />
                        {chatbot.botName}
                      </CardTitle>
                      <Badge variant={chatbot.isActive ? "default" : "secondary"}>
                        {chatbot.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription className="text-muted-foreground">
                      @{chatbot.botUsername}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedChatbot(chatbot)}
                        className="flex-1"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Flows
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBotMutation.mutate(chatbot.id)}
                        disabled={deleteBotMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="flows" className="space-y-4">
          {selectedChatbot && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Bot Flows for @{selectedChatbot.botUsername}
                  </h2>
                  <p className="text-muted-foreground">Manage your bot's commands and responses</p>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => createExampleFlowsMutation.mutate(selectedChatbot.id)}
                    disabled={createExampleFlowsMutation.isPending}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 hover:from-blue-700 hover:to-purple-700"
                  >
                    <Menu className="h-4 w-4 mr-2" />
                    {createExampleFlowsMutation.isPending ? "Membuat..." : "🚀 Buat Contoh Menu"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowHierarchicalBuilder(true)}
                    className="bg-gradient-to-r from-green-600 to-teal-600 text-white border-0 hover:from-green-700 hover:to-teal-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    🌳 Menu Builder
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowCreateInlineFlow(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-0 hover:from-purple-700 hover:to-pink-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    ⚡ Inline Menu
                  </Button>
                  
                  <Dialog open={showCreateFlow} onOpenChange={setShowCreateFlow}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Flow
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border-border max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Create New Bot Flow</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Add a new command and response for your bot
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="command" className="text-foreground">Command</Label>
                            <Input
                              id="command"
                              placeholder="/start, Followers, Info, etc."
                              value={flowForm.command}
                              onChange={(e) => setFlowForm(prev => ({ ...prev, command: e.target.value }))}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="type" className="text-foreground">Type</Label>
                            <Select value={flowForm.type} onValueChange={(value: "menu" | "text" | "inline") => setFlowForm(prev => ({ ...prev, type: value as "menu" | "text" | "inline" }))}>
                              <SelectTrigger className="bg-background border-border text-foreground">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border">
                                <SelectItem value="text">Text Response</SelectItem>
                                <SelectItem value="menu">Menu with Buttons</SelectItem>
                                <SelectItem value="inline">⚡ Inline Keyboard</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="text" className="text-foreground">Response Text</Label>
                          <Textarea
                            id="text"
                            placeholder="Enter the response message..."
                            value={flowForm.text}
                            onChange={(e) => setFlowForm(prev => ({ ...prev, text: e.target.value }))}
                            className="bg-background border-border text-foreground"
                            rows={3}
                          />
                        </div>

                        {flowForm.type === "menu" && (
                          <div>
                            <Label className="text-foreground">Menu Buttons</Label>
                            <div className="space-y-2">
                              {flowForm.buttons.map((button, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    placeholder={`Button ${index + 1}`}
                                    value={button}
                                    onChange={(e) => updateButton(index, e.target.value)}
                                    className="bg-background border-border text-foreground"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeButton(index)}
                                    disabled={flowForm.buttons.length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addButton}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Button
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            onClick={handleCreateFlow}
                            disabled={createFlowMutation.isPending}
                            className="flex-1"
                          >
                            {createFlowMutation.isPending ? "Creating..." : "Create Flow"}
                          </Button>
                          <Button variant="outline" onClick={() => setShowCreateFlow(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Edit Flow Dialog */}
                  <Dialog open={showEditFlow} onOpenChange={setShowEditFlow}>
                    <DialogContent className="bg-background border-border max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">Edit Bot Flow</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Update the command and response for your bot
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-command" className="text-foreground">Command</Label>
                            <Input
                              id="edit-command"
                              placeholder="/start, Followers, Info, etc."
                              value={flowForm.command}
                              onChange={(e) => setFlowForm(prev => ({ ...prev, command: e.target.value }))}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-type" className="text-foreground">Type</Label>
                            <Select value={flowForm.type} onValueChange={(value: "menu" | "text") => setFlowForm(prev => ({ ...prev, type: value }))}>
                              <SelectTrigger className="bg-background border-border text-foreground">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-background border-border">
                                <SelectItem value="text">Text Response</SelectItem>
                                <SelectItem value="menu">Menu with Buttons</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="edit-text" className="text-foreground">Response Text</Label>
                          <Textarea
                            id="edit-text"
                            placeholder="Enter the response message..."
                            value={flowForm.text}
                            onChange={(e) => setFlowForm(prev => ({ ...prev, text: e.target.value }))}
                            className="bg-background border-border text-foreground"
                            rows={3}
                          />
                        </div>

                        {flowForm.type === "menu" && (
                          <div>
                            <Label className="text-foreground">Menu Buttons</Label>
                            <div className="space-y-2">
                              {flowForm.buttons.map((button, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    placeholder={`Button ${index + 1}`}
                                    value={button}
                                    onChange={(e) => updateButton(index, e.target.value)}
                                    className="bg-background border-border text-foreground"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeButton(index)}
                                    disabled={flowForm.buttons.length <= 1}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addButton}
                                className="w-full"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Button
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button 
                            onClick={handleUpdateFlow}
                            disabled={updateFlowMutation.isPending}
                            className="flex-1"
                          >
                            {updateFlowMutation.isPending ? "Updating..." : "Update Flow"}
                          </Button>
                          <Button variant="outline" onClick={() => setShowEditFlow(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Hierarchical Menu Builder Dialog */}
                  <Dialog open={showHierarchicalBuilder} onOpenChange={setShowHierarchicalBuilder}>
                    <DialogContent className="bg-background border-border max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">🌳 Hierarchical Menu Builder</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Create structured menu systems with multiple levels of submenus
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Preview Layout for 4 buttons */}
                        <div className="border border-border rounded-lg p-4 bg-accent/20">
                          <h3 className="text-sm font-medium text-foreground mb-3">📱 Layout Preview (4 buttons = 2x2 grid)</h3>
                          <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-2 rounded text-xs text-center">
                              Button 1
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-2 rounded text-xs text-center">
                              Button 2
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-2 rounded text-xs text-center">
                              Button 3
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-2 rounded text-xs text-center">
                              Button 4
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 text-center">
                            4 buttons will automatically arrange in 2x2 grid layout
                          </p>
                        </div>

                        {/* Quick Menu Templates */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-foreground">🚀 Quick Templates</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createBusinessMenuTemplate()}
                            >
                              <div className="font-medium">🏢 Business Menu</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Services → Pricing → Contact → About
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createEcommerceMenuTemplate()}
                            >
                              <div className="font-medium">🛒 E-commerce Menu</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Products → Orders → Support → Account
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createSocialMediaMenuTemplate()}
                            >
                              <div className="font-medium">📱 Social Media Menu</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Followers → Likes → Views → Analytics
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createCustomMenuTemplate()}
                            >
                              <div className="font-medium">⚡ Custom Menu</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Build your own menu structure
                              </div>
                            </Button>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setShowHierarchicalBuilder(false)} className="flex-1">
                            Close
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Inline Menu Builder Dialog */}
                  <Dialog open={showCreateInlineFlow} onOpenChange={setShowCreateInlineFlow}>
                    <DialogContent className="bg-background border-border max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="text-foreground">⚡ Inline Menu Builder</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                          Create inline keyboard menus that appear directly under messages
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {/* Preview Inline Menu */}
                        <div className="border border-border rounded-lg p-4 bg-accent/20">
                          <h3 className="text-sm font-medium text-foreground mb-3">📱 Inline Menu Preview</h3>
                          
                          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-3">
                            <div className="text-sm text-blue-900 dark:text-blue-100 mb-2">
                              🤖 <strong>Bot:</strong> Selamat datang di bot saya! Silakan pilih menu:
                            </div>
                            
                            <div className="grid grid-cols-2 gap-1 max-w-xs">
                              <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded text-xs text-center font-medium">
                                🔧 Fitur Bot
                              </div>
                              <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded text-xs text-center font-medium">
                                📄 Panduan
                              </div>
                              <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded text-xs text-center font-medium">
                                🌐 Website
                              </div>
                              <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-2 rounded text-xs text-center font-medium">
                                ⬅️ Kembali
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground text-center">
                            Inline buttons appear directly under the message, not in the keyboard area
                          </p>
                        </div>

                        {/* Quick Inline Templates */}
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold text-foreground">⚡ Quick Inline Templates</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createInlineWebsiteTemplate()}
                            >
                              <div className="font-medium">🌐 Website Menu</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Features → Guide → Website → Back
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createInlineServicesTemplate()}
                            >
                              <div className="font-medium">🔧 Services Menu</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Consultation → Support → Pricing → Contact
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createInlineSocialTemplate()}
                            >
                              <div className="font-medium">📱 Social Media</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Instagram → Facebook → Twitter → YouTube
                              </div>
                            </Button>

                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-start space-y-2"
                              onClick={() => createInlineNavigationTemplate()}
                            >
                              <div className="font-medium">🧭 Navigation Menu</div>
                              <div className="text-xs text-muted-foreground text-left">
                                Home → Services → About → Contact
                              </div>
                            </Button>
                          </div>
                        </div>

                        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className="text-yellow-600 dark:text-yellow-400">💡</div>
                            <div>
                              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                                Inline Menu Features:
                              </h4>
                              <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                                <li>• Buttons appear directly under messages</li>
                                <li>• Support for links to external websites</li>
                                <li>• Navigate to submenus with callback data</li>
                                <li>• Clean, professional appearance</li>
                                <li>• Works in both private chats and groups</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button 
                            variant="default" 
                            onClick={() => {
                              setShowCreateInlineFlow(false);
                              setShowCreateFlow(true);
                              toast({
                                title: "Manual Inline Menu",
                                description: "Use 'Add Flow' with type 'inline' to create custom inline keyboards manually.",
                              });
                            }}
                            className="flex-1"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Manually
                          </Button>
                          <Button variant="outline" onClick={() => setShowCreateInlineFlow(false)} className="flex-1">
                            Close
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {loadingFlows ? (
                <div className="text-center py-8 text-muted-foreground">Loading flows...</div>
              ) : flows.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No flows yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first bot flow to get started
                    </p>
                    <Button onClick={() => setShowCreateFlow(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Flow
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {flows.map((flow: BotFlow) => (
                    <Card key={flow.id} className="bg-card border-border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-foreground text-sm">{flow.command}</CardTitle>
                          <Badge variant={flow.type === "menu" ? "default" : "secondary"}>
                            {flow.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{flow.text}</p>
                        {flow.buttons && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {flow.buttons.slice(0, 3).map((button, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {button}
                              </Badge>
                            ))}
                            {flow.buttons.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{flow.buttons.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEditFlow(flow)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteFlowMutation.mutate(flow.id)}
                            disabled={deleteFlowMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}