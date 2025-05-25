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
import { Plus, Bot, Settings, Play, Trash2, Edit, MessageSquare, Menu, X } from "lucide-react";
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

interface InlineButton {
  text: string;
  callback?: string;
  url?: string;
}

interface BotFlow {
  id: number;
  chatbotId: number;
  command: string;
  type: "menu" | "text";
  text: string;
  buttons: string[] | null;
  inlineButtons: string | null; // JSON string
  parentCommand: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function ChatbotBuilderPage() {
  const [selectedChatbot, setSelectedChatbot] = useState<NonAiChatbot | null>(null);
  const [showCreateBot, setShowCreateBot] = useState(false);
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [showEditFlow, setShowEditFlow] = useState(false);
  const [editingFlow, setEditingFlow] = useState<BotFlow | null>(null);
  const [newBotToken, setNewBotToken] = useState("");
  const [flowForm, setFlowForm] = useState({
    command: "",
    type: "text" as "menu" | "text",
    text: "",
    buttons: [""],
    inlineButtons: [[{ text: "", callback: "", url: "" }]] as InlineButton[][],
    parentCommand: ""
  });

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
        inlineButtons: [[{ text: "", callback: "", url: "" }]],
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
        inlineButtons: [[{ text: "", callback: "", url: "" }]],
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

    // Filter out empty inline buttons
    const filteredInlineButtons = flowForm.inlineButtons
      .map(row => row.filter(btn => btn.text.trim()))
      .filter(row => row.length > 0);

    const flowData = {
      command: flowForm.command,
      type: flowForm.type,
      text: flowForm.text,
      buttons: flowForm.type === "menu" ? flowForm.buttons.filter(b => b.trim()) : undefined,
      inlineButtons: filteredInlineButtons.length > 0 ? JSON.stringify(filteredInlineButtons) : undefined,
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

    // Filter out empty inline buttons
    const filteredInlineButtons = flowForm.inlineButtons
      .map(row => row.filter(btn => btn.text.trim()))
      .filter(row => row.length > 0);

    const flowData = {
      command: flowForm.command,
      type: flowForm.type,
      text: flowForm.text,
      buttons: flowForm.type === "menu" ? flowForm.buttons.filter(b => b.trim()) : undefined,
      inlineButtons: filteredInlineButtons.length > 0 ? JSON.stringify(filteredInlineButtons) : undefined,
      parentCommand: flowForm.parentCommand || undefined
    };

    updateFlowMutation.mutate({ flowId: editingFlow.id, flowData });
  };

  const handleEditFlow = (flow: BotFlow) => {
    setEditingFlow(flow);
    
    // Parse inline buttons from JSON string
    let parsedInlineButtons: InlineButton[][] = [[{ text: "", callback: "", url: "" }]];
    if (flow.inlineButtons) {
      try {
        parsedInlineButtons = JSON.parse(flow.inlineButtons);
      } catch (e) {
        console.error('Error parsing inline buttons:', e);
      }
    }
    
    setFlowForm({
      command: flow.command,
      type: flow.type,
      text: flow.text,
      buttons: flow.buttons || [""],
      inlineButtons: parsedInlineButtons,
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

  // Inline keyboard management functions
  const addInlineButtonRow = () => {
    setFlowForm(prev => ({
      ...prev,
      inlineButtons: [...prev.inlineButtons, [{ text: "", callback: "", url: "" }]]
    }));
  };

  const addInlineButtonToRow = (rowIndex: number) => {
    setFlowForm(prev => ({
      ...prev,
      inlineButtons: prev.inlineButtons.map((row, i) => 
        i === rowIndex ? [...row, { text: "", callback: "", url: "" }] : row
      )
    }));
  };

  const removeInlineButtonRow = (rowIndex: number) => {
    setFlowForm(prev => ({
      ...prev,
      inlineButtons: prev.inlineButtons.filter((_, i) => i !== rowIndex)
    }));
  };

  const removeInlineButton = (rowIndex: number, buttonIndex: number) => {
    setFlowForm(prev => ({
      ...prev,
      inlineButtons: prev.inlineButtons.map((row, i) => 
        i === rowIndex ? row.filter((_, j) => j !== buttonIndex) : row
      )
    }));
  };

  const updateInlineButton = (rowIndex: number, buttonIndex: number, field: keyof InlineButton, value: string) => {
    setFlowForm(prev => ({
      ...prev,
      inlineButtons: prev.inlineButtons.map((row, i) => 
        i === rowIndex ? row.map((button, j) => 
          j === buttonIndex ? { ...button, [field]: value } : button
        ) : row
      )
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

                        {/* Inline Keyboard Section */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-foreground">Inline Keyboard Buttons</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addInlineButtonRow}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Row
                            </Button>
                          </div>
                          <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/30">
                            {flowForm.inlineButtons.map((row, rowIndex) => (
                              <div key={rowIndex} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-muted-foreground">Row {rowIndex + 1}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addInlineButtonToRow(rowIndex)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    {flowForm.inlineButtons.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeInlineButtonRow(rowIndex)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  {row.map((button, buttonIndex) => (
                                    <div key={buttonIndex} className="grid grid-cols-12 gap-2 p-2 border border-border rounded bg-background">
                                      <div className="col-span-4">
                                        <Input
                                          placeholder="Button text"
                                          value={button.text}
                                          onChange={(e) => updateInlineButton(rowIndex, buttonIndex, 'text', e.target.value)}
                                          className="text-xs"
                                        />
                                      </div>
                                      <div className="col-span-3">
                                        <Input
                                          placeholder="Command (e.g., followers)"
                                          value={button.callback || ''}
                                          onChange={(e) => updateInlineButton(rowIndex, buttonIndex, 'callback', e.target.value)}
                                          className="text-xs"
                                        />
                                      </div>
                                      <div className="col-span-4">
                                        <Input
                                          placeholder="URL (optional)"
                                          value={button.url || ''}
                                          onChange={(e) => updateInlineButton(rowIndex, buttonIndex, 'url', e.target.value)}
                                          className="text-xs"
                                        />
                                      </div>
                                      <div className="col-span-1">
                                        {row.length > 1 && (
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeInlineButton(rowIndex, buttonIndex)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {flowForm.inlineButtons.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                No inline keyboard buttons yet. Click "Add Row" to create interactive buttons.
                              </div>
                            )}
                          </div>
                        </div>

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

                        {/* Inline Keyboard Section - Edit Form */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-foreground">Inline Keyboard Buttons</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addInlineButtonRow}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Row
                            </Button>
                          </div>
                          <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/30">
                            {flowForm.inlineButtons.map((row, rowIndex) => (
                              <div key={rowIndex} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-muted-foreground">Row {rowIndex + 1}</span>
                                  <div className="flex gap-1">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => addInlineButtonToRow(rowIndex)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    {flowForm.inlineButtons.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeInlineButtonRow(rowIndex)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  {row.map((button, buttonIndex) => (
                                    <div key={buttonIndex} className="grid grid-cols-12 gap-2 p-2 border border-border rounded bg-background">
                                      <div className="col-span-4">
                                        <Input
                                          placeholder="Button text"
                                          value={button.text}
                                          onChange={(e) => updateInlineButton(rowIndex, buttonIndex, 'text', e.target.value)}
                                          className="text-xs"
                                        />
                                      </div>
                                      <div className="col-span-3">
                                        <Input
                                          placeholder="Command (e.g., followers)"
                                          value={button.callback || ''}
                                          onChange={(e) => updateInlineButton(rowIndex, buttonIndex, 'callback', e.target.value)}
                                          className="text-xs"
                                        />
                                      </div>
                                      <div className="col-span-4">
                                        <Input
                                          placeholder="URL (optional)"
                                          value={button.url || ''}
                                          onChange={(e) => updateInlineButton(rowIndex, buttonIndex, 'url', e.target.value)}
                                          className="text-xs"
                                        />
                                      </div>
                                      <div className="col-span-1">
                                        {row.length > 1 && (
                                          <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => removeInlineButton(rowIndex, buttonIndex)}
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {flowForm.inlineButtons.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                No inline keyboard buttons yet. Click "Add Row" to create interactive buttons.
                              </div>
                            )}
                          </div>
                        </div>

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