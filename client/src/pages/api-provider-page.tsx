import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Copy, Eye, EyeOff, Plus, Key, DollarSign, Activity, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ApiKey {
  id: number;
  keyName: string;
  apiKey: string;
  isActive: boolean;
  lastUsed: string | null;
  totalRequests: number;
  totalOrders: number;
  totalRevenue: string;
  createdAt: string;
}

export default function ApiProviderPage() {
  const [showApiKey, setShowApiKey] = useState<{ [key: number]: boolean }>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [testResults, setTestResults] = useState<{ [key: number]: any }>({});
  const [testingApiKey, setTestingApiKey] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeys, isLoading } = useQuery<ApiKey[]>({
    queryKey: ["/api/api-keys"],
    select: (data) => {
      console.log("Raw API keys data:", data);
      return data;
    }
  });

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (keyName: string) => {
      const response = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keyName }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create API key");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setIsCreateModalOpen(false);
      setNewKeyName("");
      toast({
        title: "API Key Created",
        description: "Your new API key has been generated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create API key. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Toggle API key status
  const toggleApiKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/api-keys/${id}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update API key");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Updated",
        description: "API key status has been updated successfully.",
      });
    },
  });

  // Delete API key
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete API key");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "API key has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete API key. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const toggleApiKeyVisibility = (id: number) => {
    setShowApiKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for your API key.",
        variant: "destructive",
      });
      return;
    }
    createApiKeyMutation.mutate(newKeyName);
  };

  const testApiKey = async (apiKey: ApiKey) => {
    setTestingApiKey(apiKey.id);
    try {
      const response = await fetch('/api/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${apiKey.apiKey}`
        },
        body: 'action=services'
      });
      
      const result = await response.json();
      setTestResults(prev => ({
        ...prev,
        [apiKey.id]: {
          success: response.ok,
          data: result,
          servicesCount: Array.isArray(result) ? result.length : 0
        }
      }));
      
      toast({
        title: response.ok ? "API Test Berhasil!" : "API Test Gagal",
        description: response.ok 
          ? `Ditemukan ${Array.isArray(result) ? result.length : 0} layanan tersedia` 
          : "Gagal mengambil layanan",
        variant: response.ok ? "default" : "destructive"
      });
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [apiKey.id]: {
          success: false,
          error: error.message
        }
      }));
      
      toast({
        title: "API Test Gagal",
        description: "Terjadi kesalahan jaringan",
        variant: "destructive"
      });
    } finally {
      setTestingApiKey(null);
    }
  };

  // Calculate total statistics
  const totalStats = apiKeys?.reduce(
    (acc, key) => ({
      totalRequests: acc.totalRequests + (key.totalRequests || 0),
      totalOrders: acc.totalOrders + (key.totalOrders || 0),
      totalRevenue: acc.totalRevenue + parseFloat(key.totalRevenue || "0"),
    }),
    { totalRequests: 0, totalOrders: 0, totalRevenue: 0 }
  ) || { totalRequests: 0, totalOrders: 0, totalRevenue: 0 };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Provider Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Kelola API keys dan monitor transaksi customer Anda
          </p>
        </div>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">API Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production Key, Development Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateApiKey}
                  disabled={createApiKeyMutation.isPending}
                >
                  {createApiKeyMutation.isPending ? "Creating..." : "Create API Key"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total API Keys</p>
                <p className="text-2xl font-bold">{apiKeys?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{(totalStats?.totalRequests || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{(totalStats?.totalOrders || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${(totalStats?.totalRevenue || 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="api-keys" className="space-y-6">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="documentation">API Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Loading API keys...</div>
          ) : apiKeys?.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Key className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No API Keys Found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first API key to start providing services to customers.
                </p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First API Key
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {apiKeys?.map((apiKey) => (
                <Card key={apiKey.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{apiKey.keyName}</CardTitle>
                        <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                          {apiKey.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Switch
                        checked={apiKey.isActive}
                        onCheckedChange={(checked) =>
                          toggleApiKeyMutation.mutate({
                            id: apiKey.id,
                            isActive: checked,
                          })
                        }
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">API Key</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          type={showApiKey[apiKey.id] ? "text" : "password"}
                          value={apiKey.apiKey}
                          readOnly
                          className="font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleApiKeyVisibility(apiKey.id)}
                        >
                          {showApiKey[apiKey.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey.apiKey, "API Key")}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Requests</p>
                        <p className="font-semibold">{(apiKey.totalRequests || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Orders</p>
                        <p className="font-semibold">{(apiKey.totalOrders || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-semibold">${parseFloat(apiKey.totalRevenue || "0").toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Used</p>
                        <p className="font-semibold">
                          {apiKey.lastUsed
                            ? new Date(apiKey.lastUsed).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                          {apiKey.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(apiKey.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testApiKey(apiKey)}
                          disabled={testingApiKey === apiKey.id || !apiKey.isActive}
                        >
                          {testingApiKey === apiKey.id ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                          ) : (
                            "Test API"
                          )}
                        </Button>
                        <Switch
                          checked={apiKey.isActive}
                          onCheckedChange={(checked) =>
                            toggleApiKeyMutation.mutate({ id: apiKey.id, isActive: checked })
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteApiKeyMutation.mutate(apiKey.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documentation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <p className="text-muted-foreground">
                API Anda kompatibel dengan format standar SMM Panel (idcdigitals.com/SocPanel)
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Base URL</h3>
                <div className="flex items-center space-x-2">
                  <Input
                    value={`${window.location.origin}/api/v2`}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      copyToClipboard(`${window.location.origin}/api/v2`, "Base URL")
                    }
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Available Endpoints</h3>
                
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Get Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Method:</strong> POST</p>
                        <p><strong>Action:</strong> balance</p>
                        <div>
                          <strong>Parameters:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            key=YOUR_API_KEY<br />
                            action=balance
                          </div>
                        </div>
                        <div>
                          <strong>Response:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            {`{
  "balance": "100.50",
  "currency": "USD"
}`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Get Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Method:</strong> POST</p>
                        <p><strong>Action:</strong> services</p>
                        <div>
                          <strong>Parameters:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            key=YOUR_API_KEY<br />
                            action=services
                          </div>
                        </div>
                        <div>
                          <strong>Response:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            {`[
  {
    "service": 1,
    "name": "Instagram Followers",
    "type": "Default",
    "rate": "0.50",
    "min": 100,
    "max": 10000,
    "category": "Instagram",
    "refill": true,
    "cancel": true
  }
]`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Create Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Method:</strong> POST</p>
                        <p><strong>Action:</strong> add</p>
                        <div>
                          <strong>Parameters:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            key=YOUR_API_KEY<br />
                            action=add<br />
                            service=1<br />
                            link=https://instagram.com/username<br />
                            quantity=1000
                          </div>
                        </div>
                        <div>
                          <strong>Response:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            {`{
  "order": "12345"
}`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Check Order Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p><strong>Method:</strong> POST</p>
                        <p><strong>Action:</strong> status</p>
                        <div>
                          <strong>Parameters:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            key=YOUR_API_KEY<br />
                            action=status<br />
                            order=12345
                          </div>
                        </div>
                        <div>
                          <strong>Response:</strong>
                          <div className="bg-muted p-3 rounded-md mt-2 font-mono text-sm">
                            {`{
  "charge": "5.00",
  "start_count": "1000",
  "status": "Completed",
  "remains": "0",
  "currency": "USD"
}`}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}