import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ShoppingCart,
  Server,
  Globe,
  Coins,
  Plus,
  Settings,
  Clock,
  Search,
  ExternalLink,
  Filter,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SmmServicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // State management
  const [showSmmProviderModal, setShowSmmProviderModal] = useState(false);
  const [activeTab, setActiveTab] = useState("new-order");
  const [searchTerm, setSearchTerm] = useState("");

  // New Order form state
  const [orderForm, setOrderForm] = useState({
    serviceId: "",
    link: "",
    quantity: "",
  });

  // SMM Provider form state
  const [smmProviderForm, setSmmProviderForm] = useState({
    name: "",
    apiKey: "",
    apiEndpoint: "",
    isActive: true,
  });

  // Fetch data
  const { data: smmProviders = [], isLoading: providersLoading } = useQuery({
    queryKey: ["/api/smm/providers"],
  });

  const { data: smmServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["/api/smm/services"],
  });

  const { data: smmOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/smm/orders"],
  });

  // Create SMM Provider mutation
  const createSmmProviderMutation = useMutation({
    mutationFn: async (providerData: any) => {
      const res = await apiRequest("POST", "/api/smm/providers", providerData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/providers"] });
      setSmmProviderForm({ name: "", apiKey: "", apiEndpoint: "", isActive: true });
      setShowSmmProviderModal(false);
      toast({
        title: "Provider Added",
        description: "SMM provider has been successfully added.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add provider.",
        variant: "destructive",
      });
    },
  });

  // Create SMM Order mutation
  const createSmmOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/smm/orders", orderData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smm/orders"] });
      setOrderForm({ serviceId: "", link: "", quantity: "" });
      toast({
        title: "Order Created",
        description: "Your SMM order has been successfully created.",
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

  const handleCreateOrder = () => {
    if (!orderForm.serviceId || !orderForm.link || !orderForm.quantity) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    createSmmOrderMutation.mutate(orderForm);
  };

  const selectedServiceData = Array.isArray(smmServices) ? smmServices.find((s: any) => s.id.toString() === orderForm.serviceId) : null;
  const calculatePrice = () => {
    if (selectedServiceData && orderForm.quantity) {
      const rate = parseFloat(selectedServiceData.rate || "0");
      const quantity = parseInt(orderForm.quantity);
      return ((rate * quantity) / 1000).toFixed(4);
    }
    return "0.0000";
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">SMM Services</h1>
            <p className="text-muted-foreground">Manage your social media marketing services and providers</p>
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

        {/* Main Tab Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="new-order" className="text-sm font-medium">
              <ShoppingCart className="w-4 h-4 mr-2" />
              New Order
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-sm font-medium">
              <Clock className="w-4 h-4 mr-2" />
              Riwayat Order
            </TabsTrigger>
            <TabsTrigger value="services" className="text-sm font-medium">
              <Settings className="w-4 h-4 mr-2" />
              Services
            </TabsTrigger>
          </TabsList>

          {/* New Order Tab */}
          <TabsContent value="new-order">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Service Selection */}
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={orderForm.serviceId}
                    onValueChange={(value) => setOrderForm({...orderForm, serviceId: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {Array.isArray(smmServices) && smmServices.map((service: any) => (
                        <SelectItem key={service.id} value={service.id.toString()} className="text-white">
                          {service.mid} - {service.name} [Max {service.max}K] [No Refill] [Instant] [10K/Day] - ${service.rate}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedServiceData && (
                    <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                      <h3 className="text-white font-medium">Service Description</h3>
                      <div className="text-gray-300 text-sm space-y-1">
                        <p>- Location: Mix</p>
                        <p>- Link: {selectedServiceData.description || "Social Media Link"}</p>
                        <p>- Start Time: 0-1 Hours</p>
                        <p>- Quality: Real Accounts</p>
                        <p>- Drop Rate: 0%</p>
                      </div>
                      <div className="text-gray-300 text-sm">
                        <p className="font-medium">Notes:</p>
                        <p>• When the service is busy, the starting speed of the process changes.</p>
                        <p>• Do not place the second order on the same link before your order is completed in the system.</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Form */}
              <Card className="bg-gray-900/50 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-red-400 text-center text-2xl border border-red-400 rounded px-4 py-2">
                    "New Service"
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-white">Link</Label>
                    <Input
                      placeholder="https://"
                      value={orderForm.link}
                      onChange={(e) => setOrderForm({...orderForm, link: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                  </div>

                  <div>
                    <Label className="text-white">Quantity</Label>
                    <Input
                      type="number"
                      placeholder={selectedServiceData ? `Min: ${selectedServiceData.min} - Max: ${selectedServiceData.max}` : "Enter quantity"}
                      value={orderForm.quantity}
                      onChange={(e) => setOrderForm({...orderForm, quantity: e.target.value})}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    {selectedServiceData && (
                      <p className="text-gray-400 text-sm mt-1">
                        Min: {selectedServiceData.min.toLocaleString()} - Max: {selectedServiceData.max.toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-white">Average time</Label>
                    <div className="bg-gray-800 p-3 rounded text-white">
                      30 minutes
                    </div>
                  </div>

                  <div>
                    <Label className="text-white">Charge</Label>
                    <div className="bg-gray-800 p-3 rounded text-white">
                      ${calculatePrice()}
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateOrder}
                    disabled={createSmmOrderMutation.isPending || !orderForm.serviceId || !orderForm.link || !orderForm.quantity}
                    className="w-full bg-white text-black hover:bg-gray-200"
                  >
                    {createSmmOrderMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders History Tab */}
          <TabsContent value="orders">
            <Card className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-red-400 text-2xl">
                    "Riwayat order"
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <span className="text-white text-sm">All</span>
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-800 rounded-lg px-3 py-2">
                      <span className="text-white text-sm">Orders</span>
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-700 hover:bg-gray-800/50">
                        <TableHead className="text-gray-300">ID</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                        <TableHead className="text-gray-300">Link</TableHead>
                        <TableHead className="text-gray-300">Charge</TableHead>
                        <TableHead className="text-gray-300">Start count</TableHead>
                        <TableHead className="text-gray-300">Quantity</TableHead>
                        <TableHead className="text-gray-300">Service</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Remains</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                            <p className="text-gray-400 mt-2">Loading orders...</p>
                          </TableCell>
                        </TableRow>
                      ) : !Array.isArray(smmOrders) || smmOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8">
                            <ShoppingCart className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <p className="text-gray-400">No orders found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        smmOrders
                          .filter((order: any) => 
                            searchTerm === "" || 
                            order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            order.link?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((order: any) => (
                            <TableRow key={order.id} className="border-gray-700 hover:bg-gray-800/50">
                              <TableCell className="text-blue-400">
                                <div className="flex items-center space-x-2">
                                  <span>{order.orderId}</span>
                                  <div className="w-4 h-4 bg-gray-600 rounded-sm flex items-center justify-center">
                                    <span className="text-xs text-white">📋</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-300">
                                <div className="text-sm">
                                  {new Date(order.createdAt).toLocaleDateString('en-GB', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit'
                                  })}
                                  <br />
                                  {new Date(order.createdAt).toLocaleTimeString('en-GB', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="text-blue-400">
                                <a href={order.link} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                                  {order.link?.substring(0, 30)}...
                                  <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </TableCell>
                              <TableCell className="text-gray-300">{order.amount}</TableCell>
                              <TableCell className="text-gray-300">{order.startCount || "25"}</TableCell>
                              <TableCell className="text-gray-300">{order.quantity}</TableCell>
                              <TableCell className="text-gray-300 text-sm">
                                <div className="max-w-[200px]">
                                  {order.serviceName || "SMM Service"}
                                  <div className="text-xs text-gray-400 mt-1">
                                    [Max 500K] [No Refill]<br />
                                    [Instant] [1 Days Subscription]<br />
                                    [5 MINS DELIVERY]
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={order.status === 'Completed' ? 'default' : 'secondary'}
                                  className={
                                    order.status === 'Completed' 
                                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                  }
                                >
                                  {order.status || 'Completed'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-300">{order.remains || "0"}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Management Tab */}
          <TabsContent value="services">
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
                      <p className="text-sm font-medium text-muted-foreground">Services</p>
                      <p className="text-2xl font-bold text-foreground">{Array.isArray(smmServices) ? smmServices.length : 0}</p>
                    </div>
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Orders</p>
                      <p className="text-2xl font-bold text-foreground">{Array.isArray(smmOrders) ? smmOrders.length : 0}</p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                      <p className="text-2xl font-bold text-foreground">$0.00</p>
                    </div>
                    <Coins className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>SMM Services Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Services management interface will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}