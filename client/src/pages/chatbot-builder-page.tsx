import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Bot, Settings, Trash2, Edit, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ChatBot {
  id: number;
  token: string;
  botName: string;
  botUsername: string;
  welcomeMessage: string;
  isActive: boolean;
  createdAt: string;
}

interface MenuItem {
  id: number;
  chatBotId: number;
  parentId?: number;
  title: string;
  description?: string;
  buttonText: string;
  responseType: 'text' | 'image' | 'payment' | 'form' | 'submenu';
  responseContent?: string;
  price?: string;
  order: number;
  isActive: boolean;
}

export default function ChatBotBuilderPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState<ChatBot | null>(null);
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch chatbots
  const { data: chatBots = [], isLoading } = useQuery<ChatBot[]>({
    queryKey: ["/api/chatbots"],
  });

  // Create chatbot mutation
  const createChatBotMutation = useMutation({
    mutationFn: async (data: { token: string; welcomeMessage: string }) => {
      console.log("Sending ChatBot data:", data);
      
      // Bypass apiRequest and use direct fetch to avoid error handling interference
      const res = await fetch("/api/chatbots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      console.log("Response status:", res.status);
      console.log("Response headers:", Object.fromEntries(res.headers.entries()));
      
      const responseText = await res.text();
      console.log("Response text:", responseText);
      
      if (!res.ok) {
        let errorMessage = "Failed to create ChatBot";
        
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = responseText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Response was:", responseText);
        throw new Error("Invalid JSON response from server");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "ChatBot created successfully!",
      });
    },
    onError: (error: any) => {
      console.error("ChatBot creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create chatbot",
        variant: "destructive",
      });
    },
  });

  // Delete chatbot mutation
  const deleteChatBotMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/chatbots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      toast({
        title: "Success",
        description: "ChatBot deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete chatbot",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/chatbots/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots"] });
      toast({
        title: "Success",
        description: "ChatBot status updated!",
      });
    },
  });

  const handleCreateBot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const token = formData.get("token") as string;
    const welcomeMessage = formData.get("welcomeMessage") as string;

    // Validasi sederhana di frontend
    if (!token || token.trim().length === 0) {
      toast({
        title: "Error",
        description: "Bot token is required",
        variant: "destructive",
      });
      return;
    }

    createChatBotMutation.mutate({ 
      token: token.trim(), 
      welcomeMessage: welcomeMessage || "Selamat datang! Pilih menu di bawah ini:" 
    });
  };

  const handleDeleteBot = (id: number) => {
    if (confirm("Are you sure you want to delete this ChatBot?")) {
      deleteChatBotMutation.mutate(id);
    }
  };

  const handleToggleActive = (bot: ChatBot) => {
    toggleActiveMutation.mutate({ 
      id: bot.id, 
      isActive: !bot.isActive 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ChatBot Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create interactive menu-based chatbots with payment integration
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create ChatBot
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New ChatBot</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateBot} className="space-y-4">
              <div>
                <Label htmlFor="token">Bot Token</Label>
                <Input
                  id="token"
                  name="token"
                  placeholder="Enter your Telegram bot token"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Get your bot token from @BotFather on Telegram
                </p>
              </div>
              <div>
                <Label htmlFor="welcomeMessage">Welcome Message</Label>
                <Textarea
                  id="welcomeMessage"
                  name="welcomeMessage"
                  placeholder="Selamat datang! Pilih menu di bawah ini:"
                  rows={3}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full"
                disabled={createChatBotMutation.isPending}
              >
                {createChatBotMutation.isPending ? "Creating..." : "Create ChatBot"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {chatBots.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Bot className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No ChatBots Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first interactive menu-based chatbot to get started.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First ChatBot
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatBots.map((bot) => (
            <Card key={bot.id} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{bot.botName}</CardTitle>
                  <Badge variant={bot.isActive ? "default" : "secondary"}>
                    {bot.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">@{bot.botUsername}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-1">Welcome Message:</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {bot.welcomeMessage}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBot(bot);
                      setIsMenuDialogOpen(true);
                    }}
                  >
                    <Settings className="mr-1 h-3 w-3" />
                    Menu Builder
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(bot)}
                    disabled={toggleActiveMutation.isPending}
                  >
                    {bot.isActive ? (
                      <Pause className="mr-1 h-3 w-3" />
                    ) : (
                      <Play className="mr-1 h-3 w-3" />
                    )}
                    {bot.isActive ? "Pause" : "Start"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteBot(bot.id)}
                    disabled={deleteChatBotMutation.isPending}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Menu Builder Dialog */}
      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Menu Builder - {selectedBot?.botName}
            </DialogTitle>
          </DialogHeader>
          <MenuBuilder chatBot={selectedBot} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Menu Builder Component
function MenuBuilder({ chatBot }: { chatBot: ChatBot | null }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const { toast } = useToast();

  // Fetch menu items
  const { data: fetchedMenuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ["/api/chatbots", chatBot?.id, "menu-items"],
    enabled: !!chatBot?.id,
  });

  // Create menu item mutation
  const createMenuMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/chatbots/${chatBot?.id}/menu-items`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbots", chatBot?.id, "menu-items"] });
      setIsCreateMenuOpen(false);
      toast({
        title: "Success",
        description: "Menu item created successfully!",
      });
    },
  });

  const handleCreateMenu = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const menuData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      buttonText: formData.get("buttonText") as string,
      responseType: formData.get("responseType") as string,
      responseContent: formData.get("responseContent") as string,
      price: formData.get("price") ? formData.get("price") as string : undefined,
      order: fetchedMenuItems.length + 1,
      isActive: true,
    };

    createMenuMutation.mutate(menuData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Menu Items</h3>
        <Button size="sm" onClick={() => setIsCreateMenuOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Menu Item
        </Button>
      </div>

      {fetchedMenuItems.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
          <Bot className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No menu items yet. Create your first menu!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {fetchedMenuItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.buttonText}</p>
                  <Badge variant="outline" className="mt-1">
                    {item.responseType}
                  </Badge>
                  {item.price && (
                    <Badge variant="secondary" className="ml-2">
                      Rp {item.price}
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="destructive">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Menu Item Dialog */}
      <Dialog open={isCreateMenuOpen} onOpenChange={setIsCreateMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Menu Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMenu} className="space-y-4">
            <div>
              <Label htmlFor="title">Menu Title</Label>
              <Input id="title" name="title" placeholder="Menu title" required />
            </div>
            <div>
              <Label htmlFor="buttonText">Button Text</Label>
              <Input id="buttonText" name="buttonText" placeholder="Button text" required />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" placeholder="Menu description" rows={2} />
            </div>
            <div>
              <Label htmlFor="responseType">Response Type</Label>
              <select id="responseType" name="responseType" className="w-full p-2 border rounded" required>
                <option value="text">Text Response</option>
                <option value="image">Image</option>
                <option value="payment">Payment</option>
                <option value="form">Form</option>
                <option value="submenu">Sub Menu</option>
              </select>
            </div>
            <div>
              <Label htmlFor="responseContent">Response Content</Label>
              <Textarea id="responseContent" name="responseContent" placeholder="Response content" rows={3} />
            </div>
            <div>
              <Label htmlFor="price">Price (Optional)</Label>
              <Input id="price" name="price" type="number" placeholder="0" />
            </div>
            <Button type="submit" className="w-full" disabled={createMenuMutation.isPending}>
              {createMenuMutation.isPending ? "Creating..." : "Create Menu Item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}