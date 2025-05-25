import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { KnowledgeModal } from "@/components/knowledge-modal";
import { UpgradeModal } from "@/components/upgrade-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBotSchema } from "@shared/schema";
import type { Bot, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Settings, Trash2, Coins, Bot as BotIcon, MessageSquare, Crown, ShoppingCart, Download, Edit } from "lucide-react";
import { z } from "zod";

type BotFormData = z.infer<typeof insertBotSchema>;

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSmmProviderModal, setShowSmmProviderModal] = useState(false);
  const [smmProviderForm, setSmmProviderForm] = useState({
    name: "",
    apiKey: "",
    apiEndpoint: "",
    isActive: true
  });

  const botForm = useForm<BotFormData>({
    resolver: zodResolver(insertBotSchema),
    defaultValues: { token: "" },
  });

  // Fetch user profile
  const { data: profile } = useQuery<User>({
    queryKey: ["/api/profile"],
  });

  // Fetch user bots
  const { data: bots, isLoading: botsLoading } = useQuery<Bot[]>({
    queryKey: ["/api/bots"],
  });

  // Fetch SMM providers
  const { data: smmProviders = [] } = useQuery({
    queryKey: ["/api/smm/providers"],
  });

  // Fetch SMM services
  const { data: smmServices = [] } = useQuery({
    queryKey: ["/api/smm/services"],
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (data: BotFormData) => {
      const res = await apiRequest("POST", "/api/bots", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      botForm.reset();
      toast({
        title: "Bot created successfully!",
        description: "Your Telegram bot is now active and ready to respond to messages.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create bot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const res = await apiRequest("DELETE", `/api/bots/${botId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
      toast({
        title: "Bot deleted",
        description: "Your bot has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete bot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create SMM Provider mutation
  const createSmmProviderMutation = useMutation({
    mutationFn: async (data: typeof smmProviderForm) => {
      const res = await apiRequest("POST", "/api/smm/providers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      setShowSmmProviderModal(false);
      setSmmProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
      toast({
        title: "Provider Created",
        description: "SMM provider has been successfully added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create provider",
        variant: "destructive",
      });
    },
  });

  // Import services mutation
  const importServicesMutation = useMutation({
    mutationFn: async (providerId: number) => {
      const res = await apiRequest("POST", `/api/smm/providers/${providerId}/import-services`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      toast({
        title: "Services Imported",
        description: data.message || `Successfully imported ${data.importedCount} services`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import services",
        variant: "destructive",
      });
    },
  });

  const onCreateBot = async (data: BotFormData) => {
    createBotMutation.mutate(data);
  };

  const handleDeleteBot = async (botId: number) => {
    if (confirm("Are you sure you want to delete this bot? This action cannot be undone.")) {
      deleteBotMutation.mutate(botId);
    }
  };

  const handleManageKnowledge = (botId: number) => {
    setSelectedBotId(botId);
    setShowKnowledgeModal(true);
  };

  return (
    <>
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Account Status Card - Mobile Responsive */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Account Status</h3>
                <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 w-fit">
                    {profile?.level || 'Basic'} Plan
                  </Badge>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Coins className="h-4 w-4 text-amber-600" />
                    <span className="text-sm sm:text-base">{profile?.credits || 0} credits remaining</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 w-full sm:w-auto"
              >
                <Crown className="mr-2 h-4 w-4" />
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Create New Bot Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="h-5 w-5" />
              <span>Create New Bot</span>
            </CardTitle>
            <CardDescription>
              Add your Telegram bot token from @BotFather to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={botForm.handleSubmit(onCreateBot)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token">
                  Telegram Bot Token
                  <span className="text-slate-500 ml-1">(from @BotFather)</span>
                </Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  {...botForm.register("token")}
                  disabled={createBotMutation.isPending}
                />
                {botForm.formState.errors.token && (
                  <p className="text-sm text-destructive">
                    {botForm.formState.errors.token.message}
                  </p>
                )}
                <p className="text-sm text-slate-500">
                  Get your bot token from{" "}
                  <a 
                    href="https://t.me/botfather" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 underline"
                  >
                    @BotFather
                  </a>
                  {" "}on Telegram
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={createBotMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {createBotMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Bot...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Bot
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* SMM Panel Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>SMM Panel Services</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-slate-500">
                  {smmServices?.length || 0} services available
                </span>
                <Button 
                  size="sm"
                  onClick={() => setShowSmmProviderModal(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </div>
            </div>
            <CardDescription>
              Manage your social media marketing services and providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {smmProviders.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="mb-4">No SMM providers configured yet</p>
                <Button 
                  onClick={() => setShowSmmProviderModal(true)}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Provider
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Providers List */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {smmProviders.map((provider: any) => (
                    <div key={provider.id} className="border border-slate-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900">{provider.name}</h4>
                        <Badge variant={provider.isActive ? "default" : "secondary"}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mb-3 truncate">
                        {provider.apiEndpoint}
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => importServicesMutation.mutate(provider.id)}
                          disabled={importServicesMutation.isPending}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Services Preview */}
                {smmServices.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-medium text-slate-900 mb-3">Available Services</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {smmServices.slice(0, 5).map((service: any) => (
                        <div key={service.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="font-mono">
                              ID {service.mid}
                            </Badge>
                            <span className="font-medium">{service.name}</span>
                          </div>
                          <div className="text-sm text-slate-500">
                            Rp {service.rate}/1000
                          </div>
                        </div>
                      ))}
                      {smmServices.length > 5 && (
                        <div className="text-center py-2">
                          <span className="text-sm text-slate-500">
                            +{smmServices.length - 5} more services
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Bots Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <BotIcon className="h-5 w-5" />
                <span>My Bots</span>
              </CardTitle>
              <span className="text-sm text-slate-500">
                {bots?.length || 0} bots created
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {botsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : !bots || bots.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <BotIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No bots created yet. Create your first bot above!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {bots.map((bot) => (
                  <div key={bot.id} className="border border-slate-200 rounded-lg p-4">
                    {/* Mobile-first responsive layout */}
                    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                      {/* Bot Info Section */}
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <BotIcon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-slate-900 truncate">{bot.botName}</h4>
                          <p className="text-sm text-slate-500 truncate">@{bot.botUsername}</p>
                          {/* Status badges - responsive layout */}
                          <div className="flex flex-col space-y-1 mt-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-2">
                            <Badge 
                              variant={bot.isActive ? "default" : "secondary"}
                              className={`w-fit ${bot.isActive ? "bg-emerald-100 text-emerald-800" : ""}`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full mr-1 ${bot.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {bot.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <MessageSquare className="h-3 w-3" />
                              <span>{bot.messageCount} messages</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons - responsive */}
                      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 md:flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageKnowledge(bot.id)}
                          className="text-primary border-primary hover:bg-primary/5 w-full sm:w-auto"
                        >
                          <Settings className="mr-1 h-4 w-4" />
                          <span className="sm:hidden md:inline">Manage Knowledge</span>
                          <span className="hidden sm:inline md:hidden">Knowledge</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBot(bot.id)}
                          disabled={deleteBotMutation.isPending}
                          className="text-destructive border-destructive hover:bg-destructive/5 w-full sm:w-auto"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Knowledge Modal */}
      {showKnowledgeModal && selectedBotId && (
        <KnowledgeModal
          botId={selectedBotId}
          onClose={() => {
            setShowKnowledgeModal(false);
            setSelectedBotId(null);
          }}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}
