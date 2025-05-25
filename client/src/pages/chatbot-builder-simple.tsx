import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Bot, MessageCircle, Menu as MenuIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChatbotBuilderSimple() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newBotToken, setNewBotToken] = useState("");
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [selectedChatbot, setSelectedChatbot] = useState<any>(null);
  const [editingFlow, setEditingFlow] = useState<any>(null);
  
  const [flowForm, setFlowForm] = useState({
    command: "",
    type: "text" as "text" | "menu",
    text: "",
    buttons: [""],
    parentCommand: ""
  });

  // Get all non-AI chatbots
  const { data: chatbots, isLoading: isLoadingChatbots } = useQuery({
    queryKey: ["/api/nonai-chatbots"],
  });

  // Get flows for selected chatbot
  const { data: flows } = useQuery({
    queryKey: ["/api/nonai-chatbots", selectedChatbot?.id, "flows"],
    enabled: !!selectedChatbot?.id,
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/nonai-chatbots", { token });
      return await res.json();
    },
    onSuccess: (bot) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots"] });
      setShowCreateBot(false);
      setNewBotToken("");
      setSelectedChatbot(bot);
      toast({
        title: "Success",
        description: "Bot created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create bot",
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

    // Additional validation for menu type
    if (flowForm.type === "menu") {
      const hasValidButtons = flowForm.buttons.some(button => button.trim() !== "");
      if (!hasValidButtons) {
        toast({
          title: "Error",
          description: "Please add at least one button",
          variant: "destructive",
        });
        return;
      }
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
                  className="bg-input border-border text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateBot} disabled={createBotMutation.isPending}>
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

      <Tabs defaultValue="bots" className="space-y-4">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="bots" className="text-foreground data-[state=active]:bg-background">
            <Bot className="h-4 w-4 mr-2" />
            My Bots
          </TabsTrigger>
          <TabsTrigger value="flows" className="text-foreground data-[state=active]:bg-background">
            <MessageCircle className="h-4 w-4 mr-2" />
            Bot Flows
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bots">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Your Non-AI Chatbots</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage your menu-based Telegram bots
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingChatbots ? (
                <div className="text-center py-8 text-muted-foreground">Loading bots...</div>
              ) : !chatbots || chatbots.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No bots found. Create your first bot to get started!
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {chatbots.map((bot: any) => (
                    <Card key={bot.id} className="bg-background border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedChatbot(bot)}>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <Bot className="h-8 w-8 text-primary" />
                          <div>
                            <h3 className="font-semibold text-foreground">{bot.name}</h3>
                            <p className="text-sm text-muted-foreground">@{bot.username}</p>
                            <div className="flex items-center mt-2">
                              <div className={`w-2 h-2 rounded-full mr-2 ${bot.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className="text-xs text-muted-foreground">
                                {bot.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flows">
          {selectedChatbot ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-foreground">
                      Flows for {selectedChatbot.name}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Manage commands and responses
                    </CardDescription>
                  </div>
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
                              placeholder="/start"
                              value={flowForm.command}
                              onChange={(e) => setFlowForm(prev => ({ ...prev, command: e.target.value }))}
                              className="bg-input border-border text-foreground"
                            />
                          </div>
                          <div>
                            <Label htmlFor="type" className="text-foreground">Type</Label>
                            <Select value={flowForm.type} onValueChange={(value: "text" | "menu") => setFlowForm(prev => ({ ...prev, type: value }))}>
                              <SelectTrigger className="bg-input border-border text-foreground">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-popover border-border">
                                <SelectItem value="text">Simple Text</SelectItem>
                                <SelectItem value="menu">Menu with Buttons</SelectItem>
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
                            className="bg-input border-border text-foreground min-h-[100px]"
                          />
                        </div>

                        {flowForm.type === "menu" && (
                          <div>
                            <Label className="text-foreground">Menu Buttons</Label>
                            <div className="space-y-2 mt-2">
                              {flowForm.buttons.map((button, index) => (
                                <div key={index} className="flex gap-2">
                                  <Input
                                    placeholder={`Button ${index + 1}`}
                                    value={button}
                                    onChange={(e) => updateButton(index, e.target.value)}
                                    className="bg-input border-border text-foreground"
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => removeButton(index)}
                                    className="border-border"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                onClick={addButton}
                                className="w-full border-border"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Button
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button onClick={handleCreateFlow} disabled={createFlowMutation.isPending}>
                            {createFlowMutation.isPending ? "Creating..." : "Create Flow"}
                          </Button>
                          <Button variant="outline" onClick={() => setShowCreateFlow(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {!flows || flows.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No flows found. Add your first flow to get started!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {flows.map((flow: any) => (
                      <Card key={flow.id} className="bg-background border-border">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-sm bg-secondary px-2 py-1 rounded text-secondary-foreground">
                                  {flow.command}
                                </span>
                                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                                  {flow.type}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                                {flow.text}
                              </p>
                              {flow.buttons && flow.buttons.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs text-muted-foreground mb-2">Buttons:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {flow.buttons.map((button: string, index: number) => (
                                      <span key={index} className="text-xs bg-secondary px-2 py-1 rounded text-secondary-foreground">
                                        {button}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex space-x-1 ml-4">
                              <Button size="sm" variant="outline" className="border-border">
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => deleteFlowMutation.mutate(flow.id)}
                                disabled={deleteFlowMutation.isPending}
                                className="border-border hover:border-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardContent className="p-8 text-center">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Select a bot from the "My Bots" tab to manage its flows
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}