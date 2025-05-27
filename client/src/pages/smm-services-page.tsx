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
  RefreshCw,
  Edit,
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
  TrendingUp,
  Target,
  ChevronRight,
  ChevronDown
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

  // State untuk New Order dan Riwayat Order
  const [orderForm, setOrderForm] = useState({
    serviceId: "",
    link: "",
    quantity: "",
  });
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderSearchTerm, setOrderSearchTerm] = useState("");
  const [selectedOrderService, setSelectedOrderService] = useState<any>(null);
  const [orderCharge, setOrderCharge] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(20);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // State untuk filter service saat create order
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  
  // State untuk edit kategori
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string>("");
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    isDisabled: false,
    sortBy: "default" // default, price-low, price-high
  });
  const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());
  const [categorySortSettings, setCategorySortSettings] = useState<{[key: string]: string}>({});
  const [disabledServices, setDisabledServices] = useState<Set<number>>(new Set());

  // State untuk mengkalkulasi charge berdasarkan quantity
  const calculateCharge = (service: any, quantity: number) => {
    if (!service || !quantity) return 0;
    const rate = parseFloat(service.rate) || 0;
    return (rate * quantity / 1000).toFixed(2);
  };

  // Fetch SMM providers
  const { data: smmProviders = [], isLoading: providersLoading } = useQuery({
    queryKey: ["/api/smm/providers"],
  });

  // Fetch SMM services
  const { data: smmServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/smm/services"],
  });

  // Get unique categories from services
  const categories = Array.isArray(smmServices) 
    ? [...new Set(smmServices.map((service: any) => service.category).filter(Boolean))]
    : [];

  // Toggle category collapse
  const toggleCategoryCollapse = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  // Fungsi untuk menangani edit kategori
  const handleEditCategory = (category: string) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category,
      isDisabled: disabledCategories.has(category),
      sortBy: categorySortSettings[category] || "default"
    });
    setShowEditCategoryModal(true);
  };

  // Fungsi untuk menyimpan perubahan kategori
  const handleSaveCategory = () => {
    if (categoryForm.name && categoryForm.name !== editingCategory) {
      // Update nama kategori di semua services
      const updatedServices = smmServices.map((service: any) => {
        if (service.category === editingCategory) {
          return { ...service, category: categoryForm.name };
        }
        return service;
      });
      // Di sini nanti bisa ditambahkan API call untuk update database
    }

    // Update disabled categories
    const newDisabledCategories = new Set(disabledCategories);
    if (categoryForm.isDisabled) {
      newDisabledCategories.add(categoryForm.name);
    } else {
      newDisabledCategories.delete(editingCategory);
      newDisabledCategories.delete(categoryForm.name);
    }
    setDisabledCategories(newDisabledCategories);

    // Update sort settings
    const newSortSettings = { ...categorySortSettings };
    newSortSettings[categoryForm.name] = categoryForm.sortBy;
    setCategorySortSettings(newSortSettings);

    setShowEditCategoryModal(false);
    setEditingCategory("");
    
    toast({
      title: "Kategori berhasil diupdate",
      description: "Pengaturan kategori telah disimpan.",
    });
  };

  // Fungsi untuk delete kategori (menghapus semua services dalam kategori)
  const handleDeleteCategory = () => {
    const servicesToDelete = smmServices.filter((service: any) => service.category === editingCategory);
    const serviceIds = servicesToDelete.map((service: any) => service.id);
    
    if (serviceIds.length > 0) {
      // Delete semua services dalam kategori
      serviceIds.forEach(id => {
        deleteSmmServiceMutation.mutate(id);
      });
    }

    setShowEditCategoryModal(false);
    setEditingCategory("");
    
    toast({
      title: "Kategori berhasil dihapus",
      description: `${servicesToDelete.length} services dalam kategori "${editingCategory}" telah dihapus.`,
    });
  };

  // Fungsi untuk toggle service enable/disable
  const handleToggleService = (serviceId: number, isEnabled: boolean) => {
    const newDisabledServices = new Set(disabledServices);
    if (isEnabled) {
      newDisabledServices.delete(serviceId);
    } else {
      newDisabledServices.add(serviceId);
    }
    setDisabledServices(newDisabledServices);
    
    toast({
      title: isEnabled ? "Service diaktifkan" : "Service dinonaktifkan",
      description: `Service berhasil ${isEnabled ? "diaktifkan" : "dinonaktifkan"}.`,
    });
  };

  // Fungsi untuk sort services dalam kategori
  const sortServicesInCategory = (services: any[], sortBy: string) => {
    if (sortBy === "price-low") {
      return [...services].sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
    } else if (sortBy === "price-high") {
      return [...services].sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
    }
    return services; // default order
  };

  // Group services by category dengan sorting dan filtering
  const servicesByCategory = Array.isArray(smmServices) 
    ? smmServices.reduce((acc: any, service: any) => {
        const category = service.category || 'Uncategorized';
        
        // Skip jika kategori di-disable
        if (disabledCategories.has(category)) {
          return acc;
        }
        
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(service);
        return acc;
      }, {})
    : {};

  // Apply sorting untuk setiap kategori
  Object.keys(servicesByCategory).forEach(category => {
    const sortBy = categorySortSettings[category] || "default";
    servicesByCategory[category] = sortServicesInCategory(servicesByCategory[category], sortBy);
  });

  // Filter services based on search term and category for order form
  const filteredOrderServices = Array.isArray(smmServices) 
    ? smmServices.filter((service: any) => {
        const matchesSearch = service.name.toLowerCase().includes(serviceSearchTerm.toLowerCase()) ||
                            service.category.toLowerCase().includes(serviceSearchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "all" || service.category === selectedCategory;
        const isNotDisabled = !disabledServices.has(service.id); // Filter out disabled services
        return matchesSearch && matchesCategory && isNotDisabled;
      })
    : [];

  // Fetch SMM orders with pagination and auto sync status
  const { data: smmOrders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ["/api/smm/orders", currentPage],
    queryFn: async () => {
      const response = await fetch(`/api/smm/orders?page=${currentPage}&limit=${ordersPerPage}`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
    refetchOnWindowFocus: true, // Auto refetch saat window focus
    refetchInterval: 30000, // Auto refetch setiap 30 detik
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

  // Manual sync status mutation
  const syncOrderStatusMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/smm/orders/sync", { 
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to sync orders: ${errorData}`);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({ 
        title: "✅ Sinkronisasi berhasil!", 
        description: data.message || `${data.updatedCount || 0} order diperbarui`
      });
      queryClient.invalidateQueries({ queryKey: ["/api/smm/orders"] });
      setIsSyncing(false);
    },
    onError: (error) => {
      console.error("Sync error:", error);
      toast({ 
        title: "❌ Gagal sinkronisasi status order!", 
        description: "Periksa koneksi provider atau coba lagi nanti",
        variant: "destructive" 
      });
      setIsSyncing(false);
    }
  });

  // Handle manual sync
  const handleManualSync = () => {
    setIsSyncing(true);
    syncOrderStatusMutation.mutate();
  };

  // Handle batch import for large service imports with client-side batching
  const handleBatchImport = async () => {
    if (!importingProvider || selectedServices.size === 0) return;

    setIsImporting(true);
    
    try {
      // Convert selected services to array
      const selectedServicesList = providerServices.filter(service => 
        selectedServices.has(service.service || service.id)
      );

      console.log(`Starting client-side batch import of ${selectedServicesList.length} services`);
      
      // Client-side batching with ultra small batches (1 service per request)
      const BATCH_SIZE = 1;
      const batches = [];
      for (let i = 0; i < selectedServicesList.length; i += BATCH_SIZE) {
        batches.push(selectedServicesList.slice(i, i + BATCH_SIZE));
      }

      setImportProgress({ current: 0, total: selectedServicesList.length });
      
      let totalImported = 0;
      let allErrors = [];

      // Process each batch sequentially with delays
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`Processing client batch ${batchIndex + 1}/${batches.length} with ${batch.length} services`);

        try {
          // Send only essential data to minimize request size
          const minimalBatch = batch.map(service => ({
            service: service.service || service.id,
            name: service.name?.substring(0, 100) || "Unknown Service", // Truncate long names
            category: service.category?.substring(0, 50) || "General",
            rate: service.rate,
            min: service.min,
            max: service.max,
            type: service.type || "Default",
            refill: service.refill || false,
            cancel: service.cancel || false
          }));

          const response = await apiRequest("POST", `/api/smm/providers/${importingProvider.id}/import-services`, {
            services: minimalBatch,
            batchSize: BATCH_SIZE
          });

          const result = await response.json();

          if (response.ok) {
            totalImported += result.importedCount || 0;
            if (result.errors && result.errors.length > 0) {
              allErrors.push(...result.errors);
            }
            
            // Update progress
            setImportProgress({ 
              current: Math.min((batchIndex + 1) * BATCH_SIZE, selectedServicesList.length), 
              total: selectedServicesList.length 
            });
          } else {
            throw new Error(result.message || `Batch ${batchIndex + 1} failed`);
          }

          // Add small delay between requests to prevent overwhelming the server
          if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

        } catch (error: any) {
          console.error(`Client batch ${batchIndex + 1} error:`, error);
          allErrors.push(`Batch ${batchIndex + 1}: ${error.message}`);
        }
      }

      // Show final results
      if (totalImported > 0) {
        toast({
          title: "✅ Import berhasil!",
          description: `${totalImported} services berhasil diimpor dari ${selectedServicesList.length} yang dipilih dalam ${batches.length} batch`,
        });

        // Reset states
        setSelectedServices(new Set());
        setShowImportModal(false);
        setImportingProvider(null);
        
        // Refresh services list
        queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
      }

      // Show errors if any
      if (allErrors.length > 0) {
        console.warn("Import errors:", allErrors);
        toast({
          title: "⚠️ Beberapa batch mengalami error",
          description: `${allErrors.length} batch atau service gagal diimpor. Total berhasil: ${totalImported}`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error("Overall batch import error:", error);
      
      toast({
        title: "❌ Import gagal!",
        description: error.message || "Gagal memproses import services",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/smm/orders", orderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/orders"] });
      setOrderForm({
        serviceId: "",
        link: "",
        quantity: "",
      });
      setSelectedOrderService(null);
      setOrderCharge("");
      toast({
        title: "Order Created",
        description: "Your SMM order has been placed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to create order.",
        variant: "destructive",
      });
    },
  });

  // Handler functions untuk order
  const handleCreateOrder = () => {
    if (!orderForm.serviceId || !orderForm.link || !orderForm.quantity) {
      toast({
        title: "Error",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }

    const service = Array.isArray(smmServices) ? smmServices.find((s: any) => s.id === parseInt(orderForm.serviceId)) : null;
    if (!service) {
      toast({
        title: "Error",
        description: "Selected service not found.",
        variant: "destructive",
      });
      return;
    }

    const quantity = parseInt(orderForm.quantity);
    if (quantity < service.min || quantity > service.max) {
      toast({
        title: "Error",
        description: `Quantity must be between ${service.min} and ${service.max}.`,
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      serviceId: parseInt(orderForm.serviceId),
      link: orderForm.link,
      quantity: quantity,
    });
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = Array.isArray(smmServices) ? smmServices.find((s: any) => s.id === parseInt(serviceId)) : null;
    setSelectedOrderService(service);
    setOrderForm({ ...orderForm, serviceId });
    
    if (service && orderForm.quantity) {
      const charge = calculateCharge(service, parseInt(orderForm.quantity));
      setOrderCharge(charge.toString());
    }
  };

  const handleQuantityChange = (quantity: string) => {
    setOrderForm({ ...orderForm, quantity });
    
    if (selectedOrderService && quantity) {
      const charge = calculateCharge(selectedOrderService, parseInt(quantity));
      setOrderCharge(charge.toString());
    } else {
      setOrderCharge("");
    }
  };

  // Filter orders berdasarkan status dan search
  const filteredOrders = Array.isArray(smmOrders) ? smmOrders.filter((order: any) => {
    const matchesStatus = orderStatusFilter === "all" || order.status.toLowerCase() === orderStatusFilter.toLowerCase();
    const matchesSearch = orderSearchTerm === "" || 
      order.id.toString().includes(orderSearchTerm) ||
      order.link.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      order.service?.name.toLowerCase().includes(orderSearchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
  }) : [];

  // Filter services berdasarkan kategori
  const filteredServices = Array.isArray(smmServices) ? smmServices.filter((service: any) => {
    return serviceFilter === "all" || service.category === serviceFilter;
  }) : [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'default';
      case 'processing': return 'secondary';
      case 'pending': return 'outline';
      case 'canceled': return 'destructive';
      case 'partial': return 'secondary';
      default: return 'outline';
    }
  };

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
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Digital Product</h1>
            <p className="text-muted-foreground">Manage your digital products and service providers</p>
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
                <DialogTitle>Add Digital Product Provider</DialogTitle>
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
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Providers</p>
                  <p className="text-2xl font-bold text-foreground">{Array.isArray(smmProviders) ? smmProviders.length : 0}</p>
                </div>
                <Server className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Providers</p>
                  <p className="text-2xl font-bold text-green-500">
                    {Array.isArray(smmProviders) ? smmProviders.filter((p: any) => p.isActive).length : 0}
                  </p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-purple-500">
                    {Array.isArray(smmServices) ? smmServices.length : 0}
                  </p>
                </div>
                <ShoppingCart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Selected</p>
                  <p className="text-2xl font-bold text-amber-500">{selectedServicesForDelete.size}</p>
                </div>
                <Eye className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Management Tabs */}
        <div className="mb-8">
          <Tabs defaultValue="new-order" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new-order" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Order
              </TabsTrigger>
              <TabsTrigger value="order-history" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Riwayat Order
              </TabsTrigger>
            </TabsList>

            {/* New Order Tab */}
            <TabsContent value="new-order" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Create New Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Search and Filter Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Search Bar */}
                    <div className="space-y-2">
                      <Label htmlFor="service-search">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="service-search"
                          placeholder="Search products..."
                          value={serviceSearchTerm}
                          onChange={(e) => setServiceSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="category-select">Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories.map((category: string) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Service Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="service-select">Select Service</Label>
                      <Select value={orderForm.serviceId} onValueChange={handleServiceSelect}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a service..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredOrderServices.map((service: any) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{service.name}</span>
                                <span className="text-sm text-muted-foreground">
                                  ${service.rate}/1K • {service.category}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filteredOrderServices.length === 0 && serviceSearchTerm && (
                        <p className="text-sm text-muted-foreground">
                          No services found matching "{serviceSearchTerm}"
                        </p>
                      )}
                    </div>

                    {/* Link Input */}
                    <div className="space-y-2">
                      <Label htmlFor="link">Link</Label>
                      <Input
                        id="link"
                        placeholder="Enter target link..."
                        value={orderForm.link}
                        onChange={(e) => setOrderForm({ ...orderForm, link: e.target.value })}
                      />
                    </div>

                    {/* Quantity Input */}
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Enter quantity..."
                        value={orderForm.quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        min={selectedOrderService?.min || 1}
                        max={selectedOrderService?.max || 10000}
                      />
                      {selectedOrderService && (
                        <p className="text-sm text-muted-foreground">
                          Min: {selectedOrderService.min} - Max: {selectedOrderService.max}
                        </p>
                      )}
                    </div>

                    {/* Charge Display */}
                    <div className="space-y-2">
                      <Label>Total Charge</Label>
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <span className="font-medium text-lg">
                            ${orderCharge || "0.00"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  {selectedOrderService && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Service Details</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Category:</span>
                          <p className="font-medium">{selectedOrderService.category}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rate:</span>
                          <p className="font-medium">${selectedOrderService.rate}/1K</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Min:</span>
                          <p className="font-medium">{selectedOrderService.min}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max:</span>
                          <p className="font-medium">{selectedOrderService.max}</p>
                        </div>
                      </div>
                      {selectedOrderService.description && (
                        <div className="mt-3">
                          <span className="text-muted-foreground">Description:</span>
                          <p className="text-sm mt-1">{selectedOrderService.description}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button 
                    onClick={handleCreateOrder}
                    disabled={createOrderMutation.isPending || !orderForm.serviceId || !orderForm.link || !orderForm.quantity}
                    className="w-full"
                  >
                    {createOrderMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Order...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Create Order
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Order History Tab */}
            <TabsContent value="order-history" className="mt-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order History
                    </div>
                    <Button
                      onClick={handleManualSync}
                      disabled={isSyncing || syncOrderStatusMutation.isPending}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {isSyncing || syncOrderStatusMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Sinkronisasi...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Sync Status
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by Order ID, Link, or Service..."
                          value={orderSearchTerm}
                          onChange={(e) => setOrderSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Orders Table */}
                  {ordersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No orders found</p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Link</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Charge</TableHead>
                            <TableHead>Start Count</TableHead>
                            <TableHead>Remains</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredOrders.map((order: any) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-medium">{order.id}</TableCell>
                              <TableCell>{order.service?.name || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate max-w-32">{order.link}</span>
                                </div>
                              </TableCell>
                              <TableCell>{order.quantity?.toLocaleString()}</TableCell>
                              <TableCell>${order.amount || '0.00'}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4 text-blue-500" />
                                  <span>{order.startCount ? order.startCount.toLocaleString() : '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-orange-500" />
                                  <span>{order.remains !== null && order.remains !== undefined ? order.remains.toLocaleString() : '-'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadgeVariant(order.status)}>
                                  {order.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  {new Date(order.createdAt).toLocaleDateString()}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  {/* Pagination - Always show if there are orders */}
                  {smmOrders.length > 0 && (
                    <div className="flex justify-end mt-6">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Sebelumnya
                        </Button>
                        
                        {/* Page Numbers */}
                        {[1, 2, 3, 4, 5].map((pageNum) => (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="min-w-[40px]"
                          >
                            {pageNum}
                          </Button>
                        ))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => prev + 1)}
                          disabled={smmOrders.length < ordersPerPage}
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Providers Section */}
        <Card className="mb-8 bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-foreground">
              <Server className="w-5 h-5 text-primary" />
              <span>SMM Providers</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {providersLoading ? (
              <div className="text-center py-8">Loading providers...</div>
            ) : Array.isArray(smmProviders) && smmProviders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {smmProviders.map((provider: any) => (
                  <div key={provider.id} className="bg-card border border-border p-6 rounded-lg">
                    {/* Provider Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                          <Server className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{provider.name}</h3>
                          <Badge variant={provider.isActive ? "default" : "secondary"}>
                            {provider.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Provider Balance */}
                    <div className="bg-muted rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Provider Balance</span>
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
                          <span className="text-xl font-bold text-[#00c237]">
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

                {/* Category Filter */}
                <div className="mb-6">
                  <Label className="text-sm font-medium mb-2 block">Filter by Category</Label>
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {Array.isArray(smmServices) && [...new Set(smmServices.map((s: any) => s.category))]
                        .filter(Boolean)
                        .map((category: string) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Categorized Services List with Collapsible Categories */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {Object.entries(servicesByCategory).map(([category, services]: [string, any]) => (
                    <div key={category} className="border rounded-lg">
                      {/* Category Header */}
                      <div 
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-t-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCategoryCollapse(category)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {collapsedCategories.has(category) ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                            <h3 className="font-medium text-foreground">{category}</h3>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {services.length} services
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(category);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Checkbox
                            checked={services.every((service: any) => selectedServicesForDelete.has(service.id))}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedServicesForDelete);
                              services.forEach((service: any) => {
                                if (checked) {
                                  newSelected.add(service.id);
                                } else {
                                  newSelected.delete(service.id);
                                }
                              });
                              setSelectedServicesForDelete(newSelected);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="text-xs text-muted-foreground">Select All</span>
                        </div>
                      </div>

                      {/* Services List (Collapsible) */}
                      {!collapsedCategories.has(category) && (
                        <div className="space-y-1 p-2">
                          {services.map((service: any) => {
                            const isServiceDisabled = disabledServices.has(service.id);
                            return (
                              <div 
                                key={service.id} 
                                className={`bg-card p-2 rounded border border-border hover:bg-muted/20 transition-colors ${
                                  isServiceDisabled ? 'opacity-50 bg-gray-100' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
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
                                    
                                    {/* Switch On/Off */}
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={!isServiceDisabled}
                                        onCheckedChange={(checked) => handleToggleService(service.id, checked)}
                                        className="scale-75"
                                      />
                                      <span className={`text-xs font-medium ${
                                        isServiceDisabled ? 'text-red-600' : 'text-green-600'
                                      }`}>
                                        {isServiceDisabled ? 'OFF' : 'ON'}
                                      </span>
                                    </div>
                                    
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className={`font-medium text-sm truncate pr-2 ${
                                          isServiceDisabled ? 'text-gray-500' : 'text-foreground'
                                        }`}>
                                          {service.name}
                                        </h4>
                                        <span className="text-xs text-muted-foreground">ID: {service.service}</span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <div className="flex items-center space-x-4">
                                          <span className={`font-medium ${
                                            isServiceDisabled ? 'text-gray-400' : 'text-green-600'
                                          }`}>
                                            ${service.rate}/1K
                                          </span>
                                          <span>Min: {service.min?.toLocaleString()}</span>
                                          <span>Max: {service.max?.toLocaleString()}</span>
                                          {service.refill && <span className="text-blue-600">♻️</span>}
                                          {service.cancel && <span className="text-red-600">❌</span>}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-1 ml-3">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingService(service);
                                        setServiceForm({
                                          name: service.name || "",
                                          description: service.description || "",
                                          category: service.category || "",
                                          rate: service.rate || "",
                                          min: service.min || "",
                                          max: service.max || "",
                                          syncMinMax: true,
                                          customRate: service.customRate || "",
                                          useCustomRate: false
                                        });
                                        setShowEditServiceModal(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                      disabled={isServiceDisabled}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteSmmServiceMutation.mutate(service.id)}
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredServices.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No services found</p>
                      <p className="text-sm mt-1">
                        {serviceFilter === "all" 
                          ? "Import services from a provider to get started" 
                          : `No services available in "${serviceFilter}" category`}
                      </p>
                    </div>
                  )}
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
      {/* Import Services Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg p-3 sm:p-6 w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-2xl font-semibold text-gray-800">Import Services</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportingProvider(null);
                  setSelectedServices(new Set());
                  setProviderServices([]);
                }}
                className="text-gray-500 hover:text-gray-700 p-1 sm:p-2 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {!importingProvider ? (
              // Step 1: Provider Selection
              (<div>
                <h4 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-gray-700">Step 1: Select Provider</h4>
                <div className="grid gap-3 sm:gap-4">
                  {Array.isArray(smmProviders) && smmProviders.length > 0 ? (
                    smmProviders.map((provider: any) => (
                      <div
                        key={provider.id}
                        onClick={async () => {
                          setImportingProvider(provider);
                          // Auto load services when provider is selected
                          try {
                            setLoadingProviderServices(true);
                            toast({
                              title: "Loading services...",
                              description: `Fetching available services from ${provider.name}`,
                            });
                            
                            const response = await apiRequest("GET", `/api/smm/providers/${provider.id}/services`);
                            const data = await response.json();
                            
                            const services = data.services || data;
                            
                            if (Array.isArray(services)) {
                              setProviderServices(services);
                              toast({
                                title: "Services loaded successfully",
                                description: `Found ${services.length} services from ${provider.name}`,
                              });
                            } else {
                              throw new Error("Invalid response format");
                            }
                            
                          } catch (error: any) {
                            toast({
                              title: "Failed to load services",
                              description: error.message || "Could not fetch services from provider",
                              variant: "destructive",
                            });
                            setProviderServices([]);
                          } finally {
                            setLoadingProviderServices(false);
                          }
                        }}
                        className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all duration-200"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-800 text-sm sm:text-base truncate">{provider.name}</h5>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">{provider.apiEndpoint}</p>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-4 mt-2">
                              <span className={`px-2 py-1 text-xs rounded-full inline-block w-fit ${
                                provider.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {provider.isActive ? 'Active' : 'Inactive'}
                              </span>
                              {provider.balance && (
                                <span className="text-xs sm:text-sm text-gray-600">
                                  Balance: ${provider.balance} {provider.currency || 'USD'}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-blue-600 flex-shrink-0 ml-2">
                            <Plus className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Server className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">No providers available. Please add a provider first.</p>
                    </div>
                  )}
                </div>
              </div>)
            ) : (
              // Step 2: Service Selection
              (<div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
                  <div>
                    <h4 className="text-base sm:text-lg font-medium text-gray-700">
                      Step 2: Select Services from {importingProvider.name}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Choose which services you want to import to your panel
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportingProvider(null);
                      setSelectedServices(new Set());
                      setProviderServices([]);
                    }}
                    className="text-gray-600 w-fit"
                    size="sm"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Back to Providers</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                </div>
                <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Server className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-medium text-blue-900 text-sm sm:text-base truncate">{importingProvider.name}</h5>
                        <p className="text-xs sm:text-sm text-blue-700 truncate">{importingProvider.apiEndpoint}</p>
                      </div>
                    </div>
                    <div className="text-center sm:text-right">
                      <p className="text-xs sm:text-sm text-blue-700">Services to import:</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-900">{selectedServices.size}</p>
                    </div>
                  </div>
                </div>
                {loadingProviderServices ? (
                  <div className="mb-4 flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 mr-2 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600">Loading services from provider...</span>
                  </div>
                ) : (
                  <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                      Available Services: <span className="font-medium">{providerServices.length}</span>
                    </div>
                    
                    {selectedServices.size > 0 && (
                      <Button
                        onClick={async () => {
                          try {
                            // Get selected service objects - PERBAIKAN MASALAH 2
                            const selectedServiceObjects = providerServices.filter(service => 
                              selectedServices.has(service.service || service.id)
                            );

                            console.log('Selected services:', selectedServiceObjects);
                            console.log('Selected IDs:', Array.from(selectedServices));

                            const response = await apiRequest("POST", `/api/smm/providers/${importingProvider.id}/import-services`, {
                              services: selectedServiceObjects
                            });
                            const result = await response.json();
                            
                            if (response.ok) {
                              toast({
                                title: "Services imported successfully",
                                description: `Imported ${selectedServiceObjects.length} services from ${importingProvider.name}`,
                              });
                              // Refresh services list
                              window.location.reload();
                              setShowImportModal(false);
                              setImportingProvider(null);
                              setSelectedServices(new Set());
                              setProviderServices([]);
                            } else {
                              throw new Error(result.message || "Failed to import services");
                            }
                          } catch (error: any) {
                            toast({
                              title: "Import failed",
                              description: error.message || "Failed to import selected services",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 w-full sm:w-auto"
                        size="sm"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        <span className="hidden sm:inline">Import Selected ({selectedServices.size})</span>
                        <span className="sm:hidden">Import ({selectedServices.size})</span>
                      </Button>
                    )}
                  </div>
                )}
                {/* Services Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Desktop Header */}
                  <div className="hidden sm:block bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-1">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={providerServices.length > 0 && selectedServices.size === providerServices.length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                // Select all services
                                const allServiceIds = new Set(providerServices.map(service => service.service || service.id));
                                setSelectedServices(allServiceIds);
                              } else {
                                // Deselect all
                                setSelectedServices(new Set());
                              }
                            }}
                          />
                          <span className="text-xs font-medium text-gray-700">All</span>
                        </label>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700">Service ID</span>
                      </div>
                      <div className="col-span-4">
                        <span className="text-sm font-medium text-gray-700">Service Name</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700">Category</span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-sm font-medium text-gray-700">Rate</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium text-gray-700">Min/Max</span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Header */}
                  <div className="sm:hidden bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={providerServices.length > 0 && selectedServices.size === providerServices.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const allServiceIds = new Set(providerServices.map(service => service.service || service.id));
                            setSelectedServices(allServiceIds);
                          } else {
                            setSelectedServices(new Set());
                          }
                        }}
                      />
                      <span className="text-sm font-medium text-gray-700">Select All ({providerServices.length})</span>
                    </label>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {providerServices.length > 0 ? (
                      providerServices.map((service: any) => {
                        const serviceId = service.service || service.id;
                        const isSelected = selectedServices.has(serviceId);
                        
                        return (
                          <div
                            key={serviceId}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              isSelected ? 'bg-blue-50 border-blue-200' : ''
                            }`}
                          >
                            {/* Desktop Layout */}
                            <div className="hidden sm:block px-4 py-3">
                              <div className="grid grid-cols-12 gap-4 items-center">
                                <div className="col-span-1">
                                  <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newSelected = new Set(selectedServices);
                                      if (e.target.checked) {
                                        newSelected.add(serviceId);
                                      } else {
                                        newSelected.delete(serviceId);
                                      }
                                      setSelectedServices(newSelected);
                                    }}
                                  />
                                </div>
                                <div className="col-span-2">
                                  <span className="text-sm font-mono text-gray-600">{serviceId}</span>
                                </div>
                                <div className="col-span-4">
                                  <span className="text-sm font-medium text-gray-800">{service.name}</span>
                                  {service.type && (
                                    <div className="text-xs text-gray-500 mt-1">Type: {service.type}</div>
                                  )}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-sm text-gray-600">{service.category || 'General'}</span>
                                </div>
                                <div className="col-span-1">
                                  <span className="text-sm text-green-600 font-medium">
                                    ${parseFloat(service.rate || '0').toFixed(4)}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <div className="text-xs text-gray-600">
                                    <div>Min: {service.min || 'N/A'}</div>
                                    <div>Max: {service.max || 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Mobile Layout */}
                            <div className="sm:hidden px-3 py-3">
                              <div className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedServices);
                                    if (e.target.checked) {
                                      newSelected.add(serviceId);
                                    } else {
                                      newSelected.delete(serviceId);
                                    }
                                    setSelectedServices(newSelected);
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="text-sm font-medium text-gray-800 truncate">{service.name}</h4>
                                    <span className="text-xs font-mono text-gray-500 ml-2">#{serviceId}</span>
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <div>Category: {service.category || 'General'}</div>
                                    <div className="flex items-center justify-between">
                                      <span>Rate: <span className="text-green-600 font-medium">${parseFloat(service.rate || '0').toFixed(4)}</span></span>
                                      <span>Min: {service.min || 'N/A'} | Max: {service.max || 'N/A'}</span>
                                    </div>
                                    {service.type && (
                                      <div>Type: {service.type}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No services loaded yet</p>
                        <p className="text-sm">Click "Load Services from Provider" to fetch available services</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>)
            )}

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Selected: <span className="font-semibold text-blue-600">{selectedServices.size}</span> services
                {selectedServices.size > 50 && (
                  <span className="ml-2 text-orange-600 font-medium">
                    (Will be processed in batches of 10)
                  </span>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowImportModal(false);
                    setImportingProvider(null);
                    setSelectedServices(new Set());
                    setIsImporting(false);
                    setImportProgress({ current: 0, total: 0 });
                  }}
                  disabled={isImporting}
                >
                  Cancel
                </Button>
                
                <Button
                  onClick={handleBatchImport}
                  disabled={selectedServices.size === 0 || isImporting}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  {isImporting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Importing... ({importProgress.current}/{importProgress.total})</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Download className="w-4 h-4" />
                      <span>Import Selected ({selectedServices.size})</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            {isImporting && importProgress.total > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Importing services...</span>
                  <span>{Math.round((importProgress.current / importProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Enhanced Edit Service Modal - MASALAH 3 */}
      {showEditServiceModal && editingService && (
        <Dialog open={showEditServiceModal} onOpenChange={setShowEditServiceModal}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <span>Edit Service</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Service Type (Provider Info) */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-3">Service Type</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">Provider:</span>
                    <span className="font-semibold text-blue-900 bg-white px-2 py-1 rounded">{editingService.provider?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">Provider Service ID:</span>
                    <span className="font-mono text-blue-900 bg-white px-2 py-1 rounded">{editingService.serviceId || editingService.mid}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 font-medium">Original Rate:</span>
                    <span className="font-semibold text-green-700 bg-white px-2 py-1 rounded">Rp {editingService.originalRate || editingService.rate}/1000</span>
                  </div>
                </div>
              </div>

              {/* Service Name */}
              <div>
                <Label htmlFor="serviceName" className="text-gray-900 font-medium">Service Name</Label>
                <Input
                  id="serviceName"
                  value={serviceForm.name}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter custom service name"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Service Description */}
              <div>
                <Label htmlFor="serviceDescription" className="text-gray-900 font-medium">Service Description</Label>
                <textarea
                  id="serviceDescription"
                  value={serviceForm.description}
                  onChange={(e) => setServiceForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this service does (for AI bot information)"
                  className="mt-2 w-full p-3 border border-gray-300 rounded-md resize-none h-24 focus:border-blue-500 focus:ring-blue-500 text-gray-900"
                />
                <p className="text-sm text-gray-600 mt-2">This description helps the AI bot provide accurate information about this service.</p>
              </div>

              {/* Min Max Settings */}
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Min/Max Settings</h4>
                    <p className="text-sm text-gray-700 mt-1">Sync with provider or set custom values</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Label htmlFor="syncMinMax" className="text-sm font-medium text-gray-900">Sync with Provider</Label>
                    <Switch
                      id="syncMinMax"
                      checked={serviceForm.syncMinMax}
                      onCheckedChange={(checked) => setServiceForm(prev => ({ ...prev, syncMinMax: checked }))}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="minValue" className="text-gray-900 font-medium">Minimum</Label>
                    <Input
                      id="minValue"
                      type="number"
                      value={serviceForm.syncMinMax ? editingService.min : serviceForm.min}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, min: e.target.value }))}
                      disabled={serviceForm.syncMinMax}
                      className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxValue" className="text-gray-900 font-medium">Maximum</Label>
                    <Input
                      id="maxValue"
                      type="number"
                      value={serviceForm.syncMinMax ? editingService.max : serviceForm.max}
                      onChange={(e) => setServiceForm(prev => ({ ...prev, max: e.target.value }))}
                      disabled={serviceForm.syncMinMax}
                      className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Service Price */}
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <h4 className="font-semibold text-gray-900 mb-4">Service Price</h4>
                
                <div className="bg-white border border-gray-200 p-4 rounded-lg mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-700 font-medium">Provider Price:</span>
                      <div className="font-semibold text-gray-900 mt-1">Rp {editingService.originalRate || editingService.rate}/1000</div>
                    </div>
                    <div>
                      <span className="text-gray-700 font-medium">Your Current Price:</span>
                      <div className="font-semibold text-blue-700 mt-1">Rp {serviceForm.rate}/1000</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="percentagePrice"
                        name="priceType"
                        checked={!serviceForm.useCustomRate}
                        onChange={() => setServiceForm(prev => ({ ...prev, useCustomRate: false }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="percentagePrice" className="text-gray-900 font-medium">Percentage Price</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="fixedPrice"
                        name="priceType"
                        checked={serviceForm.useCustomRate}
                        onChange={() => setServiceForm(prev => ({ ...prev, useCustomRate: true }))}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <Label htmlFor="fixedPrice" className="text-gray-900 font-medium">Fixed Price</Label>
                    </div>
                  </div>

                  {!serviceForm.useCustomRate ? (
                    <div>
                      <Label htmlFor="percentageValue" className="text-gray-900 font-medium">Markup Percentage (%)</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <Input
                          id="percentageValue"
                          type="number"
                          placeholder="25"
                          className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                        />
                        <span className="text-sm text-gray-600 font-medium">% markup from provider price</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="fixedPriceValue" className="text-gray-900 font-medium">Fixed Price (Rp per 1000)</Label>
                      <Input
                        id="fixedPriceValue"
                        type="number"
                        value={serviceForm.customRate}
                        onChange={(e) => setServiceForm(prev => ({ ...prev, customRate: e.target.value }))}
                        placeholder="5000"
                        className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
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
                  onClick={async () => {
                    try {
                      const response = await apiRequest("PUT", `/api/smm/services/${editingService.id}`, serviceForm);
                      if (response.ok) {
                        toast({
                          title: "Service updated successfully",
                          description: "Service settings have been saved.",
                        });
                        queryClient.invalidateQueries({ queryKey: ["/api/smm/services"] });
                        setShowEditServiceModal(false);
                        setEditingService(null);
                      } else {
                        throw new Error("Failed to update service");
                      }
                    } catch (error: any) {
                      toast({
                        title: "Update failed",
                        description: error.message || "Failed to update service",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Edit Kategori */}
      {showEditCategoryModal && (
        <Dialog open={showEditCategoryModal} onOpenChange={setShowEditCategoryModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <span>Edit Kategori</span>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Edit Nama Kategori */}
              <div>
                <Label htmlFor="categoryName" className="text-gray-900 font-medium">Nama Kategori</Label>
                <Input
                  id="categoryName"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Masukkan nama kategori"
                  className="mt-2 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Disable Kategori */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="disableCategory" className="text-gray-900 font-medium">Disable Kategori</Label>
                  <p className="text-xs text-gray-600 mt-1">Kategori dan semua service di dalamnya akan disembunyikan</p>
                </div>
                <Switch
                  id="disableCategory"
                  checked={categoryForm.isDisabled}
                  onCheckedChange={(checked) => setCategoryForm(prev => ({ ...prev, isDisabled: checked }))}
                />
              </div>

              {/* Sort by Price */}
              <div>
                <Label htmlFor="sortByPrice" className="text-gray-900 font-medium">Urutkan Berdasarkan Harga</Label>
                <Select
                  value={categoryForm.sortBy}
                  onValueChange={(value) => setCategoryForm(prev => ({ ...prev, sortBy: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Pilih urutan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Tidak diurutkan)</SelectItem>
                    <SelectItem value="price-low">Harga Terendah ke Tertinggi</SelectItem>
                    <SelectItem value="price-high">Harga Tertinggi ke Terendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleDeleteCategory}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Kategori
                </Button>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowEditCategoryModal(false);
                      setEditingCategory("");
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSaveCategory}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Simpan
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}