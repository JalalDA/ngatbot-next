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
  Activity
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
    syncMinMax: true,
    customRate: "",
    useCustomRate: false
  });

  // Fetch SMM providers
  const { data: smmProviders = [], isLoading: providersLoading } = useQuery({
    queryKey: ["/api/smm/providers"],
  });

  // Fetch SMM services
  const { data: smmServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/smm/services"],
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
      setEditingProvider(null);
      setSmmProviderForm({
        name: "",
        apiKey: "",
        apiEndpoint: "",
        isActive: true
      });
      toast({
        title: "Provider Created",
        description: "SMM provider has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create provider.",
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

  // Delete provider mutation
  const deleteSmmProviderMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/smm/providers/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      toast({
        title: "Provider Deleted",
        description: "SMM provider has been deleted successfully.",
      });
    },
  });

  // Delete service mutation
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
  });

  // Bulk delete services mutation
  const bulkDeleteSmmServicesMutation = useMutation({
    mutationFn: async (serviceIds: number[]) => {
      const res = await apiRequest("POST", "/api/smm/services/bulk-delete", { serviceIds });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      setSelectedServicesForDelete(new Set());
      toast({
        title: "Services Deleted",
        description: `Successfully deleted ${data.deletedCount} services.`,
      });
    },
  });

  const handleCreateProvider = () => {
    if (!smmProviderForm.name || !smmProviderForm.apiKey || !smmProviderForm.apiEndpoint) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createSmmProviderMutation.mutate(smmProviderForm);
  };

  const handleDeleteProvider = (provider: any) => {
    if (confirm(`Are you sure you want to delete "${provider.name}"?`)) {
      deleteSmmProviderMutation.mutate(provider.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">SMM Services</h1>
            <p className="text-slate-600">Manage your social media marketing services and providers</p>
          </div>
          <Dialog open={showSmmProviderModal} onOpenChange={setShowSmmProviderModal}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 mt-4 sm:mt-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add SMM Provider</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="providerName">Provider Name *</Label>
                  <Input
                    id="providerName"
                    placeholder="Provider name"
                    value={smmProviderForm.name}
                    onChange={(e) => setSmmProviderForm({ ...smmProviderForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="apiKey">API Key *</Label>
                  <Input
                    id="apiKey"
                    placeholder="Your API key"
                    value={smmProviderForm.apiKey}
                    onChange={(e) => setSmmProviderForm({ ...smmProviderForm, apiKey: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="apiEndpoint">API Endpoint *</Label>
                  <Input
                    id="apiEndpoint"
                    placeholder="https://api.example.com"
                    value={smmProviderForm.apiEndpoint}
                    onChange={(e) => setSmmProviderForm({ ...smmProviderForm, apiEndpoint: e.target.value })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={smmProviderForm.isActive}
                    onCheckedChange={(checked) => setSmmProviderForm({ ...smmProviderForm, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Active</Label>
                </div>
                <Button 
                  onClick={handleCreateProvider} 
                  disabled={createSmmProviderMutation.isPending}
                  className="w-full"
                >
                  {createSmmProviderMutation.isPending ? "Adding..." : "Add Provider"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Providers</p>
                  <p className="text-2xl font-bold text-slate-900">{Array.isArray(smmProviders) ? smmProviders.length : 0}</p>
                </div>
                <Server className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Providers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {Array.isArray(smmProviders) ? smmProviders.filter((p: any) => p.isActive).length : 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Services</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Array.isArray(smmServices) ? smmServices.length : 0}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Selected</p>
                  <p className="text-2xl font-bold text-amber-600">{selectedServicesForDelete.size}</p>
                </div>
                <Eye className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Providers Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-blue-600" />
              <span>SMM Providers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providersLoading ? (
              <div className="text-center py-8">Loading providers...</div>
            ) : Array.isArray(smmProviders) && smmProviders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {smmProviders.map((provider: any) => (
                  <div key={provider.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    {/* Provider Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                          <Server className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{provider.name}</h3>
                          <Badge variant={provider.isActive ? "default" : "secondary"}>
                            {provider.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Provider Balance */}
                    <div className="bg-slate-100 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-600">Provider Balance</span>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => updateProviderBalanceMutation.mutate(provider.id)}
                            disabled={updateProviderBalanceMutation.isPending}
                            className="h-6 w-6 p-0"
                          >
                            <RefreshCw className={`w-3 h-3 ${updateProviderBalanceMutation.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                          <Coins className="w-4 h-4 text-slate-500" />
                        </div>
                      </div>
                      <div className="mt-1">
                        {provider.balance !== undefined && provider.balance !== null ? (
                          <span className="text-xl font-bold text-slate-900">
                            {provider.currency === 'IDR' && 'Rp '}
                            {provider.currency === 'USD' && '$'}
                            {provider.currency === 'EUR' && '€'}
                            {provider.currency === 'GBP' && '£'}
                            {(!provider.currency || !['IDR', 'USD', 'EUR', 'GBP'].includes(provider.currency)) && ''}
                            {parseFloat(provider.balance)?.toLocaleString() || '0'}
                            {provider.currency && !['IDR', 'USD', 'EUR', 'GBP'].includes(provider.currency) && ` ${provider.currency}`}
                          </span>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-slate-500">Click refresh to load balance</span>
                          </div>
                        )}
                        {provider.balanceUpdatedAt && (
                          <div className="text-xs text-slate-400 mt-1">
                            Updated: {new Date(provider.balanceUpdatedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                <span>Available Services</span>
                <Badge variant="secondary">{Array.isArray(smmServices) ? smmServices.length : 0} services available</Badge>
              </div>
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
            </CardTitle>
          </CardHeader>
          <CardContent>
            {servicesLoading ? (
              <div className="text-center py-8">Loading services...</div>
            ) : Array.isArray(smmServices) && smmServices.length > 0 ? (
              <div className="space-y-4">
                {/* Select All Checkbox */}
                <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
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
                  <span className="text-sm font-medium">Select All Services</span>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {smmServices.map((service: any) => (
                    <div key={service.id} className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
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
                          <div>
                            <h4 className="font-medium text-slate-900">{service.name}</h4>
                            <p className="text-sm text-slate-500">{service.category}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteSmmServiceMutation.mutate(service.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Rate:</span>
                          <span className="font-medium">${service.rate}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Min:</span>
                          <span className="font-medium">{service.min}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Max:</span>
                          <span className="font-medium">{service.max}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No services available</h3>
                <p className="text-slate-600 mb-6">Add a provider and import services to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}