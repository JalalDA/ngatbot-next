import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { KnowledgeModal } from "@/components/knowledge-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBotSchema } from "@shared/schema";
import type { Bot, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Settings, Trash2, Coins, Bot as BotIcon, MessageSquare } from "lucide-react";
import { z } from "zod";

type BotFormData = z.infer<typeof insertBotSchema>;

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);

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

  // Upgrade plan (mock)
  const upgradePlanMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/payments/upgrade", { plan });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Redirecting to payment",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Payment error",
        description: error.message,
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

  const handleUpgrade = (plan: string) => {
    upgradePlanMutation.mutate(plan);
  };

  return (
    <>
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Account Status Card */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Account Status</h3>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                    {profile?.level || 'Basic'} Plan
                  </Badge>
                  <div className="flex items-center space-x-2 text-slate-600">
                    <Coins className="h-4 w-4 text-amber-600" />
                    <span>{profile?.credits || 0} credits remaining</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={() => handleUpgrade("pro")}
                disabled={upgradePlanMutation.isPending}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {upgradePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Upgrade Plan"
                )}
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
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <BotIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900">{bot.botName}</h4>
                          <p className="text-sm text-slate-500">@{bot.botUsername}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge 
                              variant={bot.isActive ? "default" : "secondary"}
                              className={bot.isActive ? "bg-emerald-100 text-emerald-800" : ""}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full mr-1 ${bot.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {bot.isActive ? "Active" : "Inactive"}
                            </Badge>
                            <div className="flex items-center space-x-1 text-xs text-slate-500">
                              <MessageSquare className="h-3 w-3" />
                              <span>{bot.messageCount} messages handled</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageKnowledge(bot.id)}
                          className="text-primary border-primary hover:bg-primary/5"
                        >
                          <Settings className="mr-1 h-4 w-4" />
                          Manage Knowledge
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBot(bot.id)}
                          disabled={deleteBotMutation.isPending}
                          className="text-destructive border-destructive hover:bg-destructive/5"
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
    </>
  );
}
