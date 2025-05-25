import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Bot, ShoppingCart, Settings, Users, DollarSign, Package, Zap } from "lucide-react";

interface BotConfig {
  id: number;
  name: string;
  token: string;
  isActive: boolean;
  webhookUrl: string;
  products: Product[];
  stats: {
    totalUsers: number;
    totalOrders: number;
    revenue: number;
    activeUsers: number;
  };
}

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  stock: number;
  isActive: boolean;
}

interface Order {
  id: number;
  customerName: string;
  product: string;
  amount: number;
  status: string;
  createdAt: string;
}

export default function BotNonAIPage() {
  const [newBotToken, setNewBotToken] = useState("");
  const [newBotName, setNewBotName] = useState("");
  const [selectedBot, setSelectedBot] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query untuk mendapatkan daftar bot
  const { data: bots = [], isLoading } = useQuery({
    queryKey: ["/api/chatbot-nonai/bots"],
  });

  // Query untuk mendapatkan statistik
  const { data: stats } = useQuery({
    queryKey: ["/api/chatbot-nonai/stats"],
  });

  // Query untuk mendapatkan orders
  const { data: orders = [] } = useQuery({
    queryKey: ["/api/chatbot-nonai/orders"],
  });

  // Mutation untuk membuat bot baru
  const createBotMutation = useMutation({
    mutationFn: async (data: { name: string; token: string }) => {
      const response = await fetch("/api/chatbot-nonai/bots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create bot");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bot berhasil dibuat!",
        description: "Bot Telegram non-AI Anda telah aktif.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-nonai/bots"] });
      setNewBotToken("");
      setNewBotName("");
    },
    onError: () => {
      toast({
        title: "Gagal membuat bot",
        description: "Pastikan token bot valid dan belum digunakan.",
        variant: "destructive",
      });
    },
  });

  // Mutation untuk toggle status bot
  const toggleBotMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/chatbot-nonai/bots/${id}/toggle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to toggle bot");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chatbot-nonai/bots"] });
    },
  });

  const handleCreateBot = () => {
    if (!newBotToken.trim() || !newBotName.trim()) {
      toast({
        title: "Data tidak lengkap",
        description: "Masukkan nama bot dan token bot yang valid.",
        variant: "destructive",
      });
      return;
    }
    createBotMutation.mutate({ name: newBotName, token: newBotToken });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-300 rounded w-1/3"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bot Non-AI Manager</h1>
          <p className="text-muted-foreground">
            Kelola chatbot Telegram untuk penjualan otomatis
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          {bots.length} Bot Aktif
        </Badge>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats?.totalOrders || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">
                  Rp {(stats?.revenue || 0).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">{stats?.totalProducts || 1}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bots" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bots">Bot Management</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="accounts">Akun Stock</TabsTrigger>
        </TabsList>

        {/* Bot Management Tab */}
        <TabsContent value="bots" className="space-y-6">
          {/* Create New Bot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Buat Bot Baru
              </CardTitle>
              <CardDescription>
                Tambahkan chatbot Telegram baru untuk penjualan otomatis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="botName">Nama Bot</Label>
                  <Input
                    id="botName"
                    placeholder="Nama untuk mengidentifikasi bot"
                    value={newBotName}
                    onChange={(e) => setNewBotName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="botToken">Token Bot</Label>
                  <Input
                    id="botToken"
                    placeholder="Token dari @BotFather"
                    value={newBotToken}
                    onChange={(e) => setNewBotToken(e.target.value)}
                    type="password"
                  />
                </div>
              </div>
              <Button
                onClick={handleCreateBot}
                disabled={createBotMutation.isPending}
                className="w-full md:w-auto"
              >
                {createBotMutation.isPending ? "Membuat Bot..." : "Buat Bot"}
              </Button>
            </CardContent>
          </Card>

          {/* Bot List */}
          <div className="grid gap-4">
            {bots.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Belum ada bot</h3>
                  <p className="text-muted-foreground">
                    Buat bot pertama Anda untuk mulai berjualan otomatis di Telegram
                  </p>
                </CardContent>
              </Card>
            ) : (
              bots.map((bot: BotConfig) => (
                <Card key={bot.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold">{bot.name}</h3>
                          <Badge variant={bot.isActive ? "default" : "secondary"}>
                            {bot.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Webhook: {bot.webhookUrl}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{bot.stats?.totalUsers || 0} users</span>
                          <span>{bot.stats?.totalOrders || 0} orders</span>
                          <span>Rp {(bot.stats?.revenue || 0).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedBot(bot.id)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={bot.isActive ? "destructive" : "default"}
                          size="sm"
                          onClick={() =>
                            toggleBotMutation.mutate({
                              id: bot.id,
                              isActive: !bot.isActive,
                            })
                          }
                        >
                          {bot.isActive ? "Nonaktifkan" : "Aktifkan"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk</CardTitle>
              <CardDescription>
                Produk yang tersedia untuk dijual melalui chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">🎨 Akun Canva Pro</h3>
                      <p className="text-sm text-muted-foreground">
                        Akun Canva Pro premium dengan akses ke semua fitur
                      </p>
                      <p className="text-lg font-bold text-green-600">
                        Rp 25.000
                      </p>
                    </div>
                    <Badge variant="default">Aktif</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Orders</CardTitle>
              <CardDescription>
                Daftar pemesanan yang masuk melalui chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Belum ada orders</h3>
                  <p className="text-muted-foreground">
                    Orders akan muncul ketika ada pembelian melalui chatbot
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map((order: Order) => (
                    <div key={order.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{order.customerName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.product} - Rp {order.amount.toLocaleString('id-ID')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <Badge
                          variant={
                            order.status === "delivered"
                              ? "default"
                              : order.status === "paid"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Accounts Stock Tab */}
        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Stock Akun Canva</CardTitle>
              <CardDescription>
                Kelola stok akun yang akan dijual otomatis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-4">
                <Package className="w-4 h-4" />
                <AlertDescription>
                  Fitur manajemen stok akun akan segera tersedia. Saat ini sistem 
                  menggunakan stok yang sudah ada di database.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}