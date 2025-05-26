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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ShoppingCart,
  Server,
  Globe,
  Coins,
  Edit,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  Settings,
  Activity,
  Download,
  Info,
  X,
  Loader2,
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  DollarSign,
  Link as LinkIcon,
  Package,
  MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SmmServicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showSmmProviderModal, setShowSmmProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any>(null);
  const [importingProvider, setImportingProvider] = useState<any>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [showEditServiceModal, setShowEditServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [selectedServicesForDelete, setSelectedServicesForDelete] = useState<Set<number>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const [providerServices, setProviderServices] = useState<any[]>([]);
  const [loadingProviderServices, setLoadingProviderServices] = useState(false);
  const [serviceFilter, setServiceFilter] = useState("all");
  
  // State untuk mengelola visibilitas kategori services
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const [smmProviderForm, setSmmProviderForm] = useState({
    name: "",
    apiKey: "",
    apiEndpoint: "",
    isActive: true
  });

  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    category: "",
    rate: "",
    min: "",
    max: "",
    syncMinMax: false,
    customRate: "",
    useCustomRate: false
  });

  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<any>(null);

  // Fetch SMM Providers
  const { data: smmProviders, isLoading: providersLoading } = useQuery({
    queryKey: ["/api/smm/providers"],
    queryFn: () => fetch("/api/smm/providers").then((res) => res.json()),
  });

  // Fetch SMM Services
  const { data: smmServices, isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/smm/services"],
    queryFn: () => fetch("/api/smm/services").then((res) => res.json()),
  });

  // Create SMM Provider mutation
  const createSmmProviderMutation = useMutation({
    mutationFn: async (providerData: any) => {
      const res = await apiRequest("POST", "/api/smm/providers", providerData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      setShowSmmProviderModal(false);
      setSmmProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
      toast({
        title: "Provider added successfully",
        description: "Your SMM provider has been added and is ready to use.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add provider",
        description: error.message || "An error occurred while adding the provider.",
        variant: "destructive",
      });
    },
  });

  // Delete SMM Provider mutation
  const deleteSmmProviderMutation = useMutation({
    mutationFn: async (providerId: number) => {
      const res = await apiRequest("DELETE", `/api/smm/providers/${providerId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      toast({
        title: "Provider deleted",
        description: "SMM provider has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete provider.",
        variant: "destructive",
      });
    },
  });

  // Update provider balance mutation
  const updateProviderBalanceMutation = useMutation({
    mutationFn: async (providerId: number) => {
      const res = await apiRequest("POST", `/api/smm/providers/${providerId}/update-balance`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      toast({
        title: "Balance Updated",
        description: "Provider balance has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update provider balance.",
        variant: "destructive",
      });
    },
  });

  // Delete services mutation
  const deleteSmmServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const res = await apiRequest("DELETE", `/api/smm/services/${serviceId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      toast({
        title: "Service deleted",
        description: "Service has been removed successfully.",
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

  // Bulk delete services mutation
  const bulkDeleteSmmServicesMutation = useMutation({
    mutationFn: async (serviceIds: number[]) => {
      const res = await apiRequest("DELETE", "/api/smm/services/bulk", { serviceIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      setSelectedServicesForDelete(new Set());
      toast({
        title: "Services deleted",
        description: "Selected services have been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete services.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteProvider = (provider: any) => {
    if (confirm(`Are you sure you want to delete provider "${provider.name}"? This action cannot be undone.`)) {
      deleteSmmProviderMutation.mutate(provider.id);
    }
  };

  const filteredServices = Array.isArray(smmServices) 
    ? serviceFilter === "all" 
      ? smmServices 
      : smmServices.filter((service: any) => service.category === serviceFilter)
    : [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SMM Services</h1>
          <p className="text-muted-foreground mt-2">Manage your social media marketing services and providers</p>
        </div>
      </div>

      <Tabs defaultValue="services" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="services">Services Dashboard</TabsTrigger>
          <TabsTrigger value="providers">Manage Providers</TabsTrigger>
          <TabsTrigger value="orders">Order History</TabsTrigger>
        </TabsList>

        {/* Services Dashboard Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <span>Services Dashboard</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Services</p>
                      <p className="text-2xl font-bold">{Array.isArray(smmServices) ? smmServices.length : 0}</p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-blue-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Active Providers</p>
                      <p className="text-2xl font-bold">{Array.isArray(smmProviders) ? smmProviders.filter((p: any) => p.isActive).length : 0}</p>
                    </div>
                    <Server className="w-8 h-8 text-green-200" />
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Categories</p>
                      <p className="text-2xl font-bold">
                        {Array.isArray(smmServices) ? [...new Set(smmServices.map((s: any) => s.category))].filter(Boolean).length : 0}
                      </p>
                    </div>
                    <Package className="w-8 h-8 text-purple-200" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          {/* Providers Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center space-x-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  <span>SMM Providers</span>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">{Array.isArray(smmProviders) ? smmProviders.length : 0} providers</Badge>
                </div>
                <Button onClick={() => setShowSmmProviderModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Provider
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {providersLoading ? (
                <div className="text-center py-8">Loading providers...</div>
              ) : Array.isArray(smmProviders) && smmProviders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {smmProviders.map((provider: any) => (
                    <div key={provider.id} className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                      {/* Provider Status */}
                      <div className="flex items-center justify-between mb-3">
                        <Badge 
                          variant={provider.isActive ? "default" : "secondary"}
                          className={provider.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {provider.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateProviderBalanceMutation.mutate(provider.id)}
                            disabled={updateProviderBalanceMutation.isPending}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            {updateProviderBalanceMutation.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Provider Info */}
                      <div className="mb-4">
                        <h3 className="font-semibold text-lg text-foreground mb-2">{provider.name}</h3>
                        
                        {/* Balance Display */}
                        <div className="bg-muted rounded-lg p-3 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Balance:</span>
                            <div className="text-right">
                              <div className="font-bold text-lg text-green-600">
                                ${provider.balance || "0.00"}
                              </div>
                            </div>
                          </div>
                        </div>
                        {provider.balanceUpdatedAt && (
                          <div className="text-xs text-slate-400 mt-1">
                            Updated: {new Date(provider.balanceUpdatedAt).toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Provider Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-xs text-slate-500">
                          <Globe className="w-3 h-3 mr-1" />
                          <span className="truncate">{provider.apiEndpoint}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDeleteProvider(provider)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Server className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No providers yet</h3>
                  <p className="text-slate-600 mb-6">Add your first SMM provider to get started</p>
                  <Button onClick={() => setShowSmmProviderModal(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Provider
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services Section */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-green-500" />
                  <span>Available Services</span>
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">{Array.isArray(smmServices) ? smmServices.length : 0} services available</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  {Array.isArray(smmProviders) && smmProviders.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-600"
                      onClick={() => setShowImportModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Import Services
                    </Button>
                  )}
                  {selectedServicesForDelete.size > 0 && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => bulkDeleteSmmServicesMutation.mutate(Array.from(selectedServicesForDelete))}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Selected ({selectedServicesForDelete.size})
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {servicesLoading ? (
                <div className="text-center py-8">Loading services...</div>
              ) : Array.isArray(smmServices) && smmServices.length > 0 ? (
                <div className="space-y-4">
                  {/* Select All Checkbox */}
                  <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                    <Checkbox
                      checked={smmServices.length > 0 && selectedServicesForDelete.size === smmServices.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedServicesForDelete(new Set(smmServices.map((s: any) => s.id)));
                        } else {
                          setSelectedServicesForDelete(new Set());
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">Select All Services</span>
                  </div>

                  {/* Services Grouped by Category */}
                  <div className="space-y-4">
                    {Array.isArray(smmServices) && [...new Set(smmServices.map((s: any) => s.category))]
                      .filter(Boolean)
                      .map((category: string) => {
                        const categoryServices = smmServices.filter((s: any) => s.category === category);
                        const isCollapsed = collapsedCategories.has(category);
                        
                        return (
                          <div key={category} className="bg-card border border-border rounded-lg">
                            {/* Category Header */}
                            <div className="flex items-center justify-between p-4 border-b border-border">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-blue-600 font-semibold text-sm">
                                    {category.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-foreground">{category}</h3>
                                  <p className="text-sm text-muted-foreground">{categoryServices.length} services</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newCollapsed = new Set(collapsedCategories);
                                  if (isCollapsed) {
                                    newCollapsed.delete(category);
                                  } else {
                                    newCollapsed.add(category);
                                  }
                                  setCollapsedCategories(newCollapsed);
                                }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                {isCollapsed ? 'Show' : 'Hide'}
                              </Button>
                            </div>

                            {/* Category Services */}
                            {!isCollapsed && (
                              <div className="p-0">
                                {categoryServices.map((service: any) => (
                                  <div key={service.id} className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                                    {/* Left Side - Checkbox and Service Info */}
                                    <div className="flex items-center space-x-3 flex-1">
                                      <Checkbox
                                        checked={selectedServicesForDelete.has(service.id)}
                                        onCheckedChange={(checked) => {
                                          const newSelected = new Set(selectedServicesForDelete);
                                          if (checked) {
                                            newSelected.add(service.id);
                                          } else {
                                            newSelected.delete(service.id);
                                          }
                                          setSelectedServicesForDelete(newSelected);
                                        }}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                          <span className="text-sm font-medium text-muted-foreground">#{service.mid}</span>
                                          <span className="w-1 h-1 bg-muted-foreground rounded-full"></span>
                                          <span className="text-sm text-blue-600 font-medium">{service.providerName || 'Provider'}</span>
                                        </div>
                                        <h4 className="font-medium text-foreground mb-1">{service.name}</h4>
                                        {service.description && (
                                          <p className="text-sm text-muted-foreground line-clamp-1">
                                            {service.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* Right Side - Price and Actions */}
                                    <div className="flex items-center space-x-4">
                                      <div className="text-right">
                                        <div className="font-bold text-lg text-foreground">Rp {service.rate}</div>
                                        <div className="text-xs text-muted-foreground">per 1000</div>
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingService(service);
                                            setServiceForm({
                                              name: service.name,
                                              description: service.description || "",
                                              category: service.category || "",
                                              rate: service.rate.toString(),
                                              min: service.min.toString(),
                                              max: service.max.toString(),
                                              syncMinMax: false,
                                              useCustomRate: false,
                                              customRate: service.rate.toString()
                                            });
                                            setShowEditServiceModal(true);
                                          }}
                                          className="text-muted-foreground hover:text-foreground"
                                        >
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No services available</h3>
                  <p className="text-slate-600 mb-6">Import services from your SMM providers to get started</p>
                  {Array.isArray(smmProviders) && smmProviders.length > 0 && (
                    <Button onClick={() => setShowImportModal(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Import Services
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order History Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-foreground">
                <Clock className="w-5 h-5 text-purple-500" />
                <span>Order History</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Order History Coming Soon</h3>
                <p>This feature will show your complete order history and status tracking.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Provider Modal */}
      {showSmmProviderModal && (
        <Dialog open={showSmmProviderModal} onOpenChange={setShowSmmProviderModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New SMM Provider</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="providerName" className="text-gray-900 font-medium">Provider Name</Label>
                <Input
                  id="providerName"
                  value={smmProviderForm.name}
                  onChange={(e) => setSmmProviderForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., BestSMM, SocialBoost"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                />
              </div>
              
              <div>
                <Label htmlFor="apiKey" className="text-gray-900 font-medium">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={smmProviderForm.apiKey}
                  onChange={(e) => setSmmProviderForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Your provider API key"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                />
              </div>
              
              <div>
                <Label htmlFor="apiEndpoint" className="text-gray-900 font-medium">API Endpoint</Label>
                <Input
                  id="apiEndpoint"
                  value={smmProviderForm.apiEndpoint}
                  onChange={(e) => setSmmProviderForm(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                  placeholder="https://provider.com/api/v2"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={smmProviderForm.isActive}
                  onCheckedChange={(checked) => setSmmProviderForm(prev => ({ ...prev, isActive: checked }))}
                />
                <Label htmlFor="isActive" className="text-gray-900 font-medium">Active Provider</Label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowSmmProviderModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => createSmmProviderMutation.mutate(smmProviderForm)}
                disabled={createSmmProviderMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createSmmProviderMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Provider"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}