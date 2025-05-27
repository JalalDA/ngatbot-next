import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Key, Plus, Copy, Trash2, Eye, EyeOff, Globe, Code, FileText, BarChart3 } from "lucide-react";

interface ApiKey {
  id: number;
  keyName: string;
  apiKey: string;
  isActive: boolean;
  allowedDomains: string[];
  requestCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiManagementPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newAllowedDomains, setNewAllowedDomains] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState("keys");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ["/api/api-keys"],
  }) as { data: ApiKey[]; isLoading: boolean };

  // Create API key mutation
  const createApiKeyMutation = useMutation({
    mutationFn: async (data: { keyName: string; allowedDomains: string[] }) => {
      return apiRequest("/api/api-keys", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      setShowCreateDialog(false);
      setNewKeyName("");
      setNewAllowedDomains("");
      toast({
        title: "API Key Created",
        description: "Your new API key has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create API key",
        variant: "destructive",
      });
    },
  });

  // Delete API key mutation
  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/api-keys/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Deleted",
        description: "API key has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete API key",
        variant: "destructive",
      });
    },
  });

  // Toggle API key mutation
  const toggleApiKeyMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest(`/api/api-keys/${id}`, "PATCH", { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key Updated",
        description: "API key status has been updated.",
      });
    },
  });

  const handleCreateApiKey = () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a key name",
        variant: "destructive",
      });
      return;
    }

    const domains = newAllowedDomains
      .split("\n")
      .map(domain => domain.trim())
      .filter(domain => domain.length > 0);

    createApiKeyMutation.mutate({
      keyName: newKeyName,
      allowedDomains: domains,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  const toggleKeyVisibility = (keyId: number) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const baseUrl = window.location.origin;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">API Management</h1>
          <p className="text-muted-foreground">
            Kelola API keys dan akses programatis ke layanan Digital Product
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Usage Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Your API Keys</h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create API Key
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                  <DialogDescription>
                    Generate a new API key to access your Digital Product services programmatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production Bot API"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="allowedDomains">Allowed Domains (Optional)</Label>
                    <Textarea
                      id="allowedDomains"
                      placeholder="example.com&#10;api.example.com&#10;(one domain per line)"
                      value={newAllowedDomains}
                      onChange={(e) => setNewAllowedDomains(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave empty to allow all domains
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateApiKey}
                    disabled={createApiKeyMutation.isPending}
                  >
                    {createApiKeyMutation.isPending ? "Creating..." : "Create API Key"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid gap-4">
              {apiKeys.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Key className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No API Keys</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first API key to start accessing our services programmatically.
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First API Key
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                apiKeys.map((key: ApiKey) => (
                  <Card key={key.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{key.keyName}</CardTitle>
                          <CardDescription>
                            Created: {new Date(key.createdAt).toLocaleDateString()}
                            {key.lastUsedAt && (
                              <span className="ml-2">
                                • Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                              </span>
                            )}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={key.isActive ? "default" : "secondary"}>
                            {key.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleApiKeyMutation.mutate({
                              id: key.id,
                              isActive: !key.isActive
                            })}
                          >
                            {key.isActive ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteApiKeyMutation.mutate(key.id)}
                            disabled={deleteApiKeyMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>API Key</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            value={visibleKeys.has(key.id) ? key.apiKey : "dp_" + "•".repeat(32)}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {visibleKeys.has(key.id) ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => copyToClipboard(key.apiKey)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Total Requests</Label>
                          <p className="font-semibold">{key.requestCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Allowed Domains</Label>
                          <p className="font-semibold">
                            {key.allowedDomains.length === 0 ? "All domains" : `${key.allowedDomains.length} domain(s)`}
                          </p>
                        </div>
                      </div>

                      {key.allowedDomains.length > 0 && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Domain Restrictions</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {key.allowedDomains.map((domain, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                <Globe className="h-3 w-3 mr-1" />
                                {domain}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                API Documentation
              </CardTitle>
              <CardDescription>
                Complete guide untuk mengintegrasikan Digital Product API ke aplikasi Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Base URL</h3>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  {baseUrl}/api/public
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Semua request harus menyertakan API key dalam header:
                </p>
                <div className="bg-muted p-3 rounded-md font-mono text-sm">
                  X-API-Key: your_api_key_here
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Available Endpoints</h3>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-100 text-green-800">GET</Badge>
                      <code className="font-mono text-sm">/services</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Mendapatkan daftar semua layanan digital yang tersedia
                    </p>
                    <div className="bg-muted p-3 rounded-md text-xs">
                      <strong>Query Parameters:</strong><br />
                      - page: number (default: 1)<br />
                      - limit: number (default: 50)<br />
                      - category: string (optional)
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-100 text-green-800">GET</Badge>
                      <code className="font-mono text-sm">/services/categories</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mendapatkan daftar semua kategori layanan
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-blue-100 text-blue-800">POST</Badge>
                      <code className="font-mono text-sm">/order</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Membuat order baru untuk layanan digital
                    </p>
                    <div className="bg-muted p-3 rounded-md text-xs">
                      <strong>Request Body:</strong><br />
                      {`{
  "service": 123,
  "link": "https://instagram.com/username",
  "quantity": 1000
}`}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-100 text-green-800">GET</Badge>
                      <code className="font-mono text-sm">/order/status/:orderId</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mengecek status order berdasarkan order ID
                    </p>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-100 text-green-800">GET</Badge>
                      <code className="font-mono text-sm">/balance</code>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Mengecek saldo akun untuk pembelian layanan
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Example Usage (cURL)</h3>
                <div className="bg-muted p-4 rounded-md text-xs font-mono overflow-x-auto">
                  {`# Get all services
curl -X GET "${baseUrl}/api/public/services" \\
  -H "X-API-Key: your_api_key_here"

# Create order
curl -X POST "${baseUrl}/api/public/order" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your_api_key_here" \\
  -d '{
    "service": 123,
    "link": "https://instagram.com/username",
    "quantity": 1000
  }'

# Check order status
curl -X GET "${baseUrl}/api/public/order/status/ORDER_ID" \\
  -H "X-API-Key: your_api_key_here"`}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Rate Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-3 text-center">
                    <div className="font-semibold text-lg">1,000</div>
                    <div className="text-sm text-muted-foreground">requests/hour</div>
                    <div className="text-xs text-muted-foreground">Services & Status</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="font-semibold text-lg">500</div>
                    <div className="text-sm text-muted-foreground">requests/hour</div>
                    <div className="text-xs text-muted-foreground">Create Orders</div>
                  </div>
                  <div className="border rounded-lg p-3 text-center">
                    <div className="font-semibold text-lg">100</div>
                    <div className="text-sm text-muted-foreground">requests/hour</div>
                    <div className="text-xs text-muted-foreground">Balance & Categories</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Usage Analytics
              </CardTitle>
              <CardDescription>
                Monitor API usage and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">
                  Detailed usage analytics and performance metrics will be available soon.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}