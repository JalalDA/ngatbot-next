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
import { Loader2, Plus, Settings, Trash2, Coins, Bot as BotIcon, MessageSquare, Crown, ShoppingCart, Download, Edit, Search, Check, X, Package, RefreshCw, HelpCircle, Star, AlertTriangle } from "lucide-react";
import { z } from "zod";

type BotFormData = z.infer<typeof insertBotSchema>;

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null);
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showSmmProviderModal, setShowSmmProviderModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [importingProvider, setImportingProvider] = useState<any>(null);
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [smmProviderForm, setSmmProviderForm] = useState({
    name: "",
    apiKey: "",
    apiEndpoint: "",
    isActive: true
  });

  // Service edit modal states
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [showAllServicesModal, setShowAllServicesModal] = useState(false);
  const [selectedServicesForDelete, setSelectedServicesForDelete] = useState<Set<number>>(new Set());
  const [serviceEditForm, setServiceEditForm] = useState({
    name: "",
    description: "",
    min: 0,
    max: 0,
    rate: "",
    syncProvider: true,
    priceType: "percentage", // "percentage" or "fixed"
    priceValue: 0,
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

  // Update SMM Provider mutation
  const updateSmmProviderMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<typeof smmProviderForm>) => {
      const res = await apiRequest("PUT", `/api/smm/providers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      setShowSmmProviderModal(false);
      setEditingProvider(null);
      setSmmProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
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

  // Fetch services from provider mutation
  const fetchServicesMutation = useMutation({
    mutationFn: async (providerId: number) => {
      const res = await apiRequest("GET", `/api/smm/providers/${providerId}/services`);
      return res.json();
    },
    onSuccess: (data) => {
      setAvailableServices(data.services || []);
      setSelectedServices(new Set());
      setShowImportModal(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Load Services",
        description: error.message || "Could not fetch services from provider",
        variant: "destructive",
      });
    },
  });

  // Import selected services mutation
  const importServicesMutation = useMutation({
    mutationFn: async ({ providerId, serviceIds }: { providerId: number; serviceIds: string[] }) => {
      const res = await apiRequest("POST", `/api/smm/providers/${providerId}/import-services`, {
        serviceIds
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      setShowImportModal(false);
      setAvailableServices([]);
      setSelectedServices(new Set());
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

  // Handler functions
  const handleCreateProvider = () => {
    if (editingProvider) {
      updateSmmProviderMutation.mutate({ id: editingProvider.id, ...smmProviderForm });
    } else {
      createSmmProviderMutation.mutate(smmProviderForm);
    }
  };

  const handleEditProvider = (provider: any) => {
    setEditingProvider(provider);
    setSmmProviderForm({
      name: provider.name,
      apiKey: provider.apiKey,
      apiEndpoint: provider.apiEndpoint,
      isActive: provider.isActive
    });
    setShowSmmProviderModal(true);
  };

  const handleImportServices = (provider: any) => {
    setImportingProvider(provider);
    fetchServicesMutation.mutate(provider.id);
  };

  const handleImportSelected = () => {
    if (importingProvider && selectedServices.size > 0) {
      importServicesMutation.mutate({
        providerId: importingProvider.id,
        serviceIds: Array.from(selectedServices)
      });
    }
  };

  // Update SMM Service mutation
  const updateSmmServiceMutation = useMutation({
    mutationFn: async ({ serviceId, data }: { serviceId: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/smm/services/${serviceId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      setShowEditServiceModal(false);
      toast({
        title: "Service Updated",
        description: "SMM service has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update service.",
        variant: "destructive",
      });
    },
  });

  // Delete SMM Service mutation
  const deleteSmmServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await apiRequest("DELETE", `/api/smm/services/${serviceId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      toast({
        title: "Service Deleted",
        description: "SMM service has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete service.",
        variant: "destructive",
      });
    },
  });

  // Bulk delete SMM Services mutation
  const bulkDeleteSmmServicesMutation = useMutation({
    mutationFn: async (serviceIds: number[]) => {
      const res = await apiRequest("POST", "/api/smm/services/bulk-delete", { serviceIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      setSelectedServicesForDelete(new Set());
      toast({
        title: "Services Deleted",
        description: "Selected SMM services have been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Delete Failed",
        description: error.message || "Failed to delete services.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteService = (serviceId: number) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteSmmServiceMutation.mutate(serviceId);
    }
  };

  const handleBulkDelete = () => {
    if (selectedServicesForDelete.size === 0) {
      toast({
        title: "No Services Selected",
        description: "Please select services to delete.",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to delete ${selectedServicesForDelete.size} selected services?`)) {
      bulkDeleteSmmServicesMutation.mutate(Array.from(selectedServicesForDelete));
    }
  };

  const handleServiceCheckbox = (serviceId: number, checked: boolean) => {
    const newSelected = new Set(selectedServicesForDelete);
    if (checked) {
      newSelected.add(serviceId);
    } else {
      newSelected.delete(serviceId);
    }
    setSelectedServicesForDelete(newSelected);
  };

  const handleSelectAllServices = (checked: boolean) => {
    if (checked && smmServices) {
      setSelectedServicesForDelete(new Set(smmServices.map((s: any) => s.id)));
    } else {
      setSelectedServicesForDelete(new Set());
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    
    // Find provider info
    const provider = (smmProviders as any[]).find(p => p.id === service.providerId);
    
    setServiceEditForm({
      name: service.name,
      description: service.description || "",
      min: service.min,
      max: service.max,
      rate: service.rate,
      syncProvider: true, // Default to sync
      priceType: "percentage",
      priceValue: 0,
      isActive: service.isActive
    });
    setShowEditServiceModal(true);
  };

  const handleUpdateService = () => {
    if (editingService) {
      updateSmmServiceMutation.mutate({
        serviceId: editingService.id,
        data: serviceEditForm
      });
    }
  };

  const calculateProviderPrice = () => {
    if (!editingService) return 0;
    return parseFloat(editingService.rate) || 0;
  };

  const calculateYourPrice = () => {
    const providerPrice = calculateProviderPrice();
    if (serviceEditForm.priceType === "percentage") {
      return providerPrice * (1 + serviceEditForm.priceValue / 100);
    } else {
      return serviceEditForm.priceValue;
    }
  };

  const resetProviderForm = () => {
    setSmmProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
    setEditingProvider(null);
  };

  const filteredServices = availableServices.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.service.toString().includes(searchQuery)
  );

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
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {smmProviders.map((provider: any) => (
                    <div key={provider.id} className="border border-slate-200 rounded-xl p-6 bg-gradient-to-br from-white to-slate-50 hover:shadow-lg transition-shadow">
                      {/* Provider Header with Logo */}
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          {provider.logo ? (
                            <img 
                              src={provider.logo} 
                              alt={provider.name}
                              className="w-8 h-8 rounded"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-slate-900">{provider.name}</h3>
                          <Badge variant={provider.isActive ? "default" : "secondary"} className="mt-1">
                            {provider.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>

                      {/* Provider Balance */}
                      <div className="bg-slate-100 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-600">Provider Balance</span>
                          <Coins className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="mt-1">
                          {provider.balance !== undefined ? (
                            <span className="text-xl font-bold text-slate-900">
                              {provider.currency === 'IDR' && 'Rp '}
                              {provider.currency === 'USD' && '$'}
                              {provider.currency === 'EUR' && '€'}
                              {provider.currency === 'GBP' && '£'}
                              {(!provider.currency || !['IDR', 'USD', 'EUR', 'GBP'].includes(provider.currency)) && ''}
                              {provider.balance?.toLocaleString() || '0'}
                              {provider.currency && !['IDR', 'USD', 'EUR', 'GBP'].includes(provider.currency) && ` ${provider.currency}`}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">Loading...</span>
                          )}
                        </div>
                      </div>

                      {/* Provider Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-xs text-slate-500">
                          <span className="font-medium mr-2">Endpoint:</span>
                          <span className="truncate">{provider.apiEndpoint}</span>
                        </div>
                        <div className="flex items-center text-xs text-slate-500">
                          <span className="font-medium mr-2">Services:</span>
                          <span>{provider.serviceCount || 0} available</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleImportServices(provider)}
                          disabled={fetchServicesMutation.isPending}
                          className="flex-1"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Import Services
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditProvider(provider)}
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
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-slate-900">Available Services</h4>
                      {selectedServicesForDelete.size > 0 && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={handleBulkDelete}
                          disabled={bulkDeleteSmmServicesMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete Selected ({selectedServicesForDelete.size})
                        </Button>
                      )}
                    </div>
                    
                    {/* Select All Checkbox */}
                    <div className="flex items-center space-x-2 mb-2 p-2 bg-slate-100 rounded">
                      <input
                        type="checkbox"
                        id="select-all-services"
                        checked={smmServices.length > 0 && selectedServicesForDelete.size === smmServices.length}
                        onChange={(e) => handleSelectAllServices(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      <label htmlFor="select-all-services" className="text-sm font-medium text-slate-700">
                        Select All Services
                      </label>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {smmServices.slice(0, 5).map((service: any) => (
                        <div key={service.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedServicesForDelete.has(service.id)}
                              onChange={(e) => handleServiceCheckbox(service.id, e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            <Badge variant="outline" className="font-mono">
                              ID {service.mid}
                            </Badge>
                            <span className="font-medium">{service.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm text-slate-500">
                              Rp {service.rate}/1000
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditService(service)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteService(service.id)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deleteSmmServiceMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      {smmServices.length > 5 && (
                        <div className="text-center py-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllServicesModal(true)}
                            className="text-sm"
                          >
                            See All Services ({smmServices.length} total)
                          </Button>
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

      {/* SMM Provider Modal */}
      <Dialog open={showSmmProviderModal} onOpenChange={setShowSmmProviderModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add SMM Provider</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="providerName" className="text-right">
                Provider Name
              </Label>
              <Input
                id="providerName"
                value={smmProviderForm.name}
                onChange={(e) => setSmmProviderForm({ ...smmProviderForm, name: e.target.value })}
                className="col-span-3"
                placeholder="SMM Panel Provider"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="providerApiKey" className="text-right">
                API Key
              </Label>
              <Input
                id="providerApiKey"
                type="password"
                value={smmProviderForm.apiKey}
                onChange={(e) => setSmmProviderForm({ ...smmProviderForm, apiKey: e.target.value })}
                className="col-span-3"
                placeholder="Your API key"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="providerEndpoint" className="text-right">
                API Endpoint
              </Label>
              <Input
                id="providerEndpoint"
                value={smmProviderForm.apiEndpoint}
                onChange={(e) => setSmmProviderForm({ ...smmProviderForm, apiEndpoint: e.target.value })}
                className="col-span-3"
                placeholder="https://panel.example.com/api/v2"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="providerActive" className="text-right">
                Active
              </Label>
              <Switch
                id="providerActive"
                checked={smmProviderForm.isActive}
                onCheckedChange={(checked) => setSmmProviderForm({ ...smmProviderForm, isActive: checked })}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSmmProviderModal(false);
                setSmmProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                console.log("Form data being sent:", smmProviderForm);
                createSmmProviderMutation.mutate(smmProviderForm);
              }}
              disabled={createSmmProviderMutation.isPending || !smmProviderForm.name || !smmProviderForm.apiKey || !smmProviderForm.apiEndpoint}
            >
              {createSmmProviderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Provider
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Services Modal */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Import Services from {importingProvider?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Provider Info */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{importingProvider?.name}</h3>
                  <p className="text-sm text-slate-500">{importingProvider?.apiEndpoint}</p>
                </div>
                <Badge variant="secondary">
                  {availableServices.length} services
                </Badge>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by service ID or name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Select All */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedServices.size === filteredServices.length && filteredServices.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedServices(new Set(filteredServices.map(s => s.service.toString())));
                    } else {
                      setSelectedServices(new Set());
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="select-all" className="font-medium">
                  Select all
                </Label>
              </div>
              <span className="text-sm text-slate-500">
                {filteredServices.length} services
              </span>
            </div>

            {/* Services List */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {fetchServicesMutation.isPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading services...</span>
                </div>
              ) : filteredServices.length > 0 ? (
                filteredServices.map((service: any) => (
                  <div key={service.service} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      id={`service-${service.service}`}
                      checked={selectedServices.has(service.service.toString())}
                      onChange={(e) => {
                        const newSelected = new Set(selectedServices);
                        if (e.target.checked) {
                          newSelected.add(service.service.toString());
                        } else {
                          newSelected.delete(service.service.toString());
                        }
                        setSelectedServices(newSelected);
                      }}
                      className="h-4 w-4 rounded border-slate-300 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-600">ID {service.service}</span>
                        <Badge variant="outline" className="text-xs">
                          {service.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-900 font-medium mt-1">
                        {service.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Min: {service.min} | Max: {service.max} | Rate: {service.rate}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  {searchQuery ? "No services found matching your search." : "No services available."}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-slate-500">
                {selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setAvailableServices([]);
                    setSelectedServices(new Set());
                    setSearchQuery("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportSelected}
                  disabled={selectedServices.size === 0 || importServicesMutation.isPending}
                >
                  {importServicesMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Import Selected Services
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={showEditServiceModal} onOpenChange={setShowEditServiceModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Service Type */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Service type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-slate-600">Provider</Label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-lg border flex items-center">
                    <Package className="h-4 w-4 mr-2 text-slate-500" />
                    <span className="text-sm">
                      {editingService ? (smmProviders as any[]).find(p => p.id === editingService.providerId)?.name : 'Unknown'}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-slate-600">Service Id</Label>
                  <div className="mt-1 p-3 bg-slate-50 rounded-lg border">
                    <span className="text-sm font-mono">
                      {editingService?.serviceIdApi || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Description</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="service-name">Service name</Label>
                  <Input
                    id="service-name"
                    value={serviceEditForm.name}
                    onChange={(e) => setServiceEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter service name"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="service-description">Description</Label>
                  <textarea
                    id="service-description"
                    value={serviceEditForm.description}
                    onChange={(e) => setServiceEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter service description for AI bot knowledge"
                    className="mt-1 w-full p-3 border border-slate-300 rounded-lg resize-none h-24"
                  />
                </div>
              </div>
            </div>

            {/* Options Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Options</h3>
              
              <div className="space-y-4">
                {/* Min Max Sync Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Min Max parsed from provider</span>
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-slate-400">
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceEditForm.syncProvider}
                      onChange={(e) => setServiceEditForm(prev => ({ ...prev, syncProvider: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Min Max Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-order">Minimal order</Label>
                    <Input
                      id="min-order"
                      type="number"
                      value={serviceEditForm.min}
                      onChange={(e) => setServiceEditForm(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                      disabled={serviceEditForm.syncProvider}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max-order">Max order</Label>
                    <Input
                      id="max-order"
                      type="number"
                      value={serviceEditForm.max}
                      onChange={(e) => setServiceEditForm(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                      disabled={serviceEditForm.syncProvider}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Price Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Price</h3>
              
              <div className="space-y-4">
                {/* Provider Price Display */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium">Provider price for 1000 completions</span>
                  <span className="text-lg font-semibold">
                    ${calculateProviderPrice().toFixed(2)}
                  </span>
                </div>

                {/* Percentage Price Input */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Your extra price in %</span>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={serviceEditForm.priceValue}
                      onChange={(e) => setServiceEditForm(prev => ({ ...prev, priceValue: parseFloat(e.target.value) }))}
                      disabled={serviceEditForm.priceType !== "percentage"}
                      className="w-20 text-center"
                    />
                    <span className="text-sm font-medium">%</span>
                  </div>
                </div>

                {/* Your Final Price Display */}
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm font-medium">Your price on panel</span>
                  <span className="text-lg font-semibold text-green-600">
                    Rp {calculateYourPrice().toLocaleString()}
                  </span>
                </div>

                {/* Fixed Price Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Fixed price</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={serviceEditForm.priceType === "fixed"}
                      onChange={(e) => setServiceEditForm(prev => ({ 
                        ...prev, 
                        priceType: e.target.checked ? "fixed" : "percentage" 
                      }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                {/* Fixed Price Input */}
                {serviceEditForm.priceType === "fixed" && (
                  <div>
                    <Label htmlFor="fixed-price">Fixed Price (Rp)</Label>
                    <Input
                      id="fixed-price"
                      type="number"
                      value={serviceEditForm.priceValue}
                      onChange={(e) => setServiceEditForm(prev => ({ ...prev, priceValue: parseFloat(e.target.value) }))}
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Price Info */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      Now the price is updated from the provider and multiplied by your percentage. 
                      This protects you from price increases.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditServiceModal(false);
                  setEditingService(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateService}
                disabled={updateSmmServiceMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {updateSmmServiceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* See All Services Modal */}
      <Dialog open={showAllServicesModal} onOpenChange={setShowAllServicesModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>All SMM Panel Services ({smmServices?.length || 0} total)</DialogTitle>
              {selectedServicesForDelete.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteSmmServicesMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected ({selectedServicesForDelete.size})
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Services */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Select All Checkbox */}
            <div className="flex items-center space-x-2 p-3 bg-slate-100 rounded-lg">
              <input
                type="checkbox"
                id="select-all-services-modal"
                checked={smmServices?.length > 0 && selectedServicesForDelete.size === smmServices?.length}
                onChange={(e) => handleSelectAllServices(e.target.checked)}
                className="rounded border-slate-300"
              />
              <label htmlFor="select-all-services-modal" className="text-sm font-medium text-slate-700">
                Select All Services ({smmServices?.length || 0} items)
              </label>
            </div>

            {/* Services List */}
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {smmServices
                ?.filter((service: any) => 
                  service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  service.mid.toString().includes(searchQuery)
                )
                .map((service: any) => (
                  <div key={service.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors">
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedServicesForDelete.has(service.id)}
                        onChange={(e) => handleServiceCheckbox(service.id, e.target.checked)}
                        className="rounded border-slate-300 shrink-0"
                      />
                      <Badge variant="outline" className="font-mono shrink-0">
                        ID {service.mid}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{service.name}</div>
                        {service.description && (
                          <div className="text-sm text-slate-500 truncate">{service.description}</div>
                        )}
                        <div className="text-xs text-slate-400 mt-1">
                          Min: {service.min} | Max: {service.max}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <div className="font-semibold text-slate-900">
                          Rp {service.rate}/1000
                        </div>
                        <div className="text-xs text-slate-500">
                          {service.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          handleEditService(service);
                          setShowAllServicesModal(false);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteService(service.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={deleteSmmServiceMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              }
              
              {smmServices
                ?.filter((service: any) => 
                  service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  service.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  service.mid.toString().includes(searchQuery)
                ).length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  {searchQuery ? 'No services found matching your search.' : 'No services available.'}
                </div>
              )}
            </div>

            {/* Statistics */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-slate-900">
                    {smmServices?.length || 0}
                  </div>
                  <div className="text-sm text-slate-500">Total Services</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {smmServices?.filter((s: any) => s.isActive).length || 0}
                  </div>
                  <div className="text-sm text-slate-500">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-400">
                    {smmServices?.filter((s: any) => !s.isActive).length || 0}
                  </div>
                  <div className="text-sm text-slate-500">Inactive</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {new Set(smmServices?.map((s: any) => s.providerId)).size || 0}
                  </div>
                  <div className="text-sm text-slate-500">Providers</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
