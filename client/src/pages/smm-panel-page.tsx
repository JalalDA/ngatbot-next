import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Settings, Download, Trash2, Edit, ExternalLink } from "lucide-react";

interface SmmProvider {
  id: number;
  userId: number;
  name: string;
  apiKey: string;
  apiEndpoint: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SmmService {
  id: number;
  userId: number;
  providerId: number;
  mid: number;
  name: string;
  description: string;
  min: number;
  max: number;
  rate: string;
  category: string;
  serviceIdApi: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SmmPanelPage() {
  const { toast } = useToast();
  const [showProviderDialog, setShowProviderDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SmmProvider | null>(null);
  const [editingService, setEditingService] = useState<SmmService | null>(null);

  // Provider form state
  const [providerForm, setProviderForm] = useState({
    name: "",
    apiKey: "",
    apiEndpoint: "",
    isActive: true
  });

  // Service form state
  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    rate: "",
    isActive: true
  });

  // Fetch providers
  const { data: providers = [], isLoading: providersLoading } = useQuery<SmmProvider[]>({
    queryKey: ["/api/smm/providers"],
  });

  // Fetch services
  const { data: services = [], isLoading: servicesLoading } = useQuery<SmmService[]>({
    queryKey: ["/api/smm/services"],
  });

  // Create provider mutation
  const createProviderMutation = useMutation({
    mutationFn: async (data: typeof providerForm) => {
      const res = await apiRequest("POST", "/api/smm/providers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      setShowProviderDialog(false);
      setProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
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

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<typeof providerForm>) => {
      const res = await apiRequest("PUT", `/api/smm/providers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      setShowProviderDialog(false);
      setEditingProvider(null);
      setProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
      toast({
        title: "Provider Updated",
        description: "SMM provider has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update provider",
        variant: "destructive",
      });
    },
  });

  // Delete provider mutation
  const deleteProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/smm/providers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      toast({
        title: "Provider Deleted",
        description: "SMM provider has been successfully deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete provider",
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

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<typeof serviceForm>) => {
      const res = await apiRequest("PUT", `/api/smm/services/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      setShowServiceDialog(false);
      setEditingService(null);
      setServiceForm({ name: "", description: "", rate: "", isActive: true });
      toast({
        title: "Service Updated",
        description: "SMM service has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  const handleCreateProvider = () => {
    createProviderMutation.mutate(providerForm);
  };

  const handleUpdateProvider = () => {
    if (editingProvider) {
      updateProviderMutation.mutate({ id: editingProvider.id, ...providerForm });
    }
  };

  const handleEditProvider = (provider: SmmProvider) => {
    setEditingProvider(provider);
    setProviderForm({
      name: provider.name,
      apiKey: provider.apiKey,
      apiEndpoint: provider.apiEndpoint,
      isActive: provider.isActive
    });
    setShowProviderDialog(true);
  };

  const handleEditService = (service: SmmService) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description,
      rate: service.rate,
      isActive: service.isActive
    });
    setShowServiceDialog(true);
  };

  const handleUpdateService = () => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, ...serviceForm });
    }
  };

  const resetProviderForm = () => {
    setProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
    setEditingProvider(null);
  };

  const resetServiceForm = () => {
    setServiceForm({ name: "", description: "", rate: "", isActive: true });
    setEditingService(null);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">SMM Panel Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your SMM providers and services for your Telegram bots
        </p>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">SMM Providers</h2>
            <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetProviderForm}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingProvider ? "Edit Provider" : "Add New Provider"}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={providerForm.name}
                      onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                      className="col-span-3"
                      placeholder="Provider name"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="apiKey" className="text-right">
                      API Key
                    </Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={providerForm.apiKey}
                      onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                      className="col-span-3"
                      placeholder="Your API key"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="apiEndpoint" className="text-right">
                      API Endpoint
                    </Label>
                    <Input
                      id="apiEndpoint"
                      value={providerForm.apiEndpoint}
                      onChange={(e) => setProviderForm({ ...providerForm, apiEndpoint: e.target.value })}
                      className="col-span-3"
                      placeholder="https://example.com/api/v2"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="isActive" className="text-right">
                      Active
                    </Label>
                    <Switch
                      id="isActive"
                      checked={providerForm.isActive}
                      onCheckedChange={(checked) => setProviderForm({ ...providerForm, isActive: checked })}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowProviderDialog(false);
                      resetProviderForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={editingProvider ? handleUpdateProvider : handleCreateProvider}
                    disabled={createProviderMutation.isPending || updateProviderMutation.isPending}
                  >
                    {editingProvider ? "Update" : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {providersLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading providers...</p>
            </div>
          ) : providers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No SMM providers configured yet</p>
              <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetProviderForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Provider
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <Card key={provider.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={provider.isActive ? "default" : "secondary"}>
                          {provider.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {provider.apiEndpoint}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProvider(provider)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
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
                          onClick={() => deleteProviderMutation.mutate(provider.id)}
                          disabled={deleteProviderMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">SMM Services</h2>
            <p className="text-sm text-gray-500">
              Total services: {services.length}
            </p>
          </div>

          {servicesLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading services...</p>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No services imported yet</p>
              <p className="text-sm text-gray-400">
                Add a provider and import services to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {services.map((service) => (
                <Card key={service.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="font-mono">
                          ID {service.mid}
                        </Badge>
                        <CardTitle className="text-lg">{service.name}</CardTitle>
                        <Badge variant={service.isActive ? "default" : "secondary"}>
                          {service.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditService(service)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Category</p>
                        <p className="font-medium">{service.category}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Rate</p>
                        <p className="font-medium">Rp {service.rate}/1000</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Min Order</p>
                        <p className="font-medium">{service.min.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Max Order</p>
                        <p className="font-medium">{service.max.toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Service Edit Dialog */}
          <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Service</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceName" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="serviceName"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceDescription" className="text-right">
                    Description
                  </Label>
                  <Textarea
                    id="serviceDescription"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceRate" className="text-right">
                    Rate
                  </Label>
                  <Input
                    id="serviceRate"
                    value={serviceForm.rate}
                    onChange={(e) => setServiceForm({ ...serviceForm, rate: e.target.value })}
                    className="col-span-3"
                    placeholder="50"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="serviceActive" className="text-right">
                    Active
                  </Label>
                  <Switch
                    id="serviceActive"
                    checked={serviceForm.isActive}
                    onCheckedChange={(checked) => setServiceForm({ ...serviceForm, isActive: checked })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowServiceDialog(false);
                    resetServiceForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateService}
                  disabled={updateServiceMutation.isPending}
                >
                  Update
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}