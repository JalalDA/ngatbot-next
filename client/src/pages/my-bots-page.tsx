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
  BookOpen
} from "lucide-react";
import { KnowledgeModal } from "@/components/knowledge-modal";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function MyBotsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [newBot, setNewBot] = useState({
    botToken: "",
    botName: "",
    botUsername: "",
    description: "",
    systemPrompt: "You are a helpful assistant that can answer questions and provide information."
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
        description: "",
        systemPrompt: "You are a helpful assistant that can answer questions and provide information."
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
    createBotMutation.mutate(newBot);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Bots</h1>
            <p className="text-slate-600">Manage your Telegram bots and their AI capabilities</p>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what your bot does..."
                    value={newBot.description}
                    onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Bots</p>
                  <p className="text-2xl font-bold text-slate-900">{Array.isArray(bots) ? bots.length : 0}</p>
                </div>
                <Bot className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Bots</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Array.isArray(bots) ? bots.filter((bot: any) => bot.isActive).length : 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Available Credits</p>
                  <p className="text-2xl font-bold text-amber-600">{user?.credits || 0}</p>
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
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-slate-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : Array.isArray(bots) && bots.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot: any) => (
              <Card key={bot.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{bot.botName}</CardTitle>
                        <p className="text-sm text-slate-500">{bot.botUsername}</p>
                      </div>
                    </div>
                    <Badge variant={bot.isActive ? "default" : "secondary"}>
                      {bot.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-600 mb-4">
                    {bot.description || "No description available"}
                  </p>
                  
                  {/* Bot Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <MessageSquare className="w-4 h-4 mx-auto text-slate-600 mb-1" />
                      <p className="text-xs text-slate-500">Messages</p>
                      <p className="text-sm font-semibold">{bot.messageCount || 0}</p>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <Users className="w-4 h-4 mx-auto text-slate-600 mb-1" />
                      <p className="text-xs text-slate-500">Users</p>
                      <p className="text-sm font-semibold">{bot.userCount || 0}</p>
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
      </div>

      {/* Knowledge Modal */}
      {selectedBot && (
        <KnowledgeModal
          isOpen={showKnowledgeModal}
          onClose={() => {
            setShowKnowledgeModal(false);
            setSelectedBot(null);
          }}
          botId={selectedBot.id}
          botName={selectedBot.botName}
        />
      )}
    </div>
  );
}