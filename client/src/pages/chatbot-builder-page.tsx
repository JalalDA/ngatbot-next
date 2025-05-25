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
  type: "menu" | "text";
  text: string;
  buttons: string[] | null;
  parentCommand: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ChatbotBuilderPage() {
  const [selectedChatbot, setSelectedChatbot] = useState<NonAiChatbot | null>(null);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [newBotToken, setNewBotToken] = useState("");
  const [flowForm, setFlowForm] = useState({
    command: "",
    type: "text" as "menu" | "text",
    text: "",
    buttons: [""],
    parentCommand: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all non-AI chatbots
  const { data: chatbots = [], isLoading: loadingChatbots } = useQuery<NonAiChatbot[]>({
    queryKey: ["/api/nonai-chatbots"],
  });

  // Fetch flows for selected chatbot
  const { data: flows = [], isLoading: loadingFlows } = useQuery<BotFlow[]>({
    queryKey: ["/api/nonai-chatbots", selectedChatbot?.id, "flows"],
    enabled: !!selectedChatbot,
  });

  // Create new chatbot mutation
  const createBotMutation = useMutation({
    mutationFn: async (botToken: string) => {
      const res = await apiRequest("POST", "/api/nonai-chatbots", { botToken });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots"] });
      setShowCreateBot(false);
      setNewBotToken("");
      toast({
        title: "Success",
        description: "Non-AI chatbot created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create chatbot",
        variant: "destructive",
      });
    },
  });

  // Delete chatbot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (chatbotId: number) => {
      const res = await apiRequest("DELETE", `/api/nonai-chatbots/${chatbotId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nonai-chatbots"] });
      setSelectedChatbot(null);
      toast({
        title: "Success",
        description: "Chatbot deleted successfully!",
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
        description: "Bot flow created successfully!",
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
    <div className="container mx-auto p-6 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Non-AI Chatbot Builder</h1>
          <p className="text-muted-foreground">Create and manage menu-based Telegram bots without AI</p>
        </div>
        
        <Dialog open={showCreateBot} onOpenChange={setShowCreateBot}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create New Bot
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Non-AI Chatbot</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Enter your bot token from @BotFather to create a new non-AI chatbot
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="botToken" className="text-foreground">Bot Token</Label>
                <Input
                  id="botToken"
                  placeholder="1234567890:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
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
              {chatbots.map((chatbot) => (
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
                  <CardContent className="space-y-3">
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
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Bot Flows for @{selectedChatbot.botUsername}
                  </h2>
                  <p className="text-muted-foreground">Manage your bot's commands and responses</p>
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
                            placeholder="/start, Followers, Info, etc."
                            value={flowForm.command}
                            onChange={(e) => setFlowForm(prev => ({ ...prev, command: e.target.value }))}
                            className="bg-background border-border text-foreground"
                          />
                        </div>
                        <div>
                          <Label htmlFor="type" className="text-foreground">Type</Label>
                          <Select 
                            value={flowForm.type} 
                            onValueChange={(value: "menu" | "text") => setFlowForm(prev => ({ ...prev, type: value }))}
                          >
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
                        <Label htmlFor="text" className="text-foreground">Response Text</Label>
                        <Textarea
                          id="text"
                          placeholder="Enter the message your bot will send"
                          value={flowForm.text}
                          onChange={(e) => setFlowForm(prev => ({ ...prev, text: e.target.value }))}
                          className="bg-background border-border text-foreground"
                          rows={3}
                        />
                      </div>

                      {flowForm.type === "menu" && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-foreground">Menu Buttons</Label>
                            <Button type="button" variant="outline" size="sm" onClick={addButton}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Button
                            </Button>
                          </div>
                          <div className="space-y-2">
                            {flowForm.buttons.map((button, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  placeholder={`Button ${index + 1}`}
                                  value={button}
                                  onChange={(e) => updateButton(index, e.target.value)}
                                  className="bg-background border-border text-foreground"
                                />
                                {flowForm.buttons.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeButton(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            ))}
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
              </div>

              {loadingFlows ? (
                <div className="text-center py-8 text-muted-foreground">Loading flows...</div>
              ) : flows.length === 0 ? (
                <Card className="bg-card border-border">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No flows configured</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Add your first flow to start building your bot's conversation
                    </p>
                    <Button onClick={() => setShowCreateFlow(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Flow
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {flows.map((flow) => (
                    <Card key={flow.id} className="bg-card border-border">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-foreground flex items-center gap-2">
                            {flow.type === "menu" ? <Menu className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                            {flow.command}
                          </CardTitle>
                          <Badge variant={flow.type === "menu" ? "default" : "secondary"}>
                            {flow.type}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-muted-foreground text-sm">{flow.text}</p>
                        {flow.type === "menu" && flow.buttons && (
                          <div className="flex flex-wrap gap-1">
                            {flow.buttons.map((button, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {button}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}