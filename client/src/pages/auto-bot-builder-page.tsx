import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Bot, ShoppingCart, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AutoBot {
  id: number;
  botName: string;
  botUsername: string;
  botId: string;
  isActive: boolean;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  stock: number;
}

export default function AutoBotBuilderPage() {
  const [botToken, setBotToken] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get user's auto bots
  const { data: userBots, isLoading: isLoadingBots } = useQuery({
    queryKey: ['/api/auto-bots'],
  });

  // Get products
  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  // Create bot mutation
  const createBotMutation = useMutation({
    mutationFn: async (botToken: string) => {
      const response = await fetch("/api/auto-bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ botToken }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create bot");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bot Berhasil Dibuat!",
        description: `Bot ${data.botName} (@${data.botUsername}) telah aktif`,
      });
      setBotToken("");
      queryClient.invalidateQueries({ queryKey: ['/api/auto-bots'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat bot",
        variant: "destructive",
      });
    },
  });

  // Delete bot mutation
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      const response = await fetch(`/api/auto-bots/${botId}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete bot");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bot Dihapus",
        description: "Bot telah berhasil dihapus",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auto-bots'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus bot",
        variant: "destructive",
      });
    },
  });

  const handleCreateBot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botToken.trim()) {
      toast({
        title: "Error",
        description: "Harap masukkan token bot",
        variant: "destructive",
      });
      return;
    }
    createBotMutation.mutate(botToken);
  };

  const handleDeleteBot = (botId: number) => {
    if (confirm("Apakah Anda yakin ingin menghapus bot ini?")) {
      deleteBotMutation.mutate(botId);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auto Bot Builder</h1>
        <p className="text-muted-foreground">
          Buat bot Telegram otomatis untuk menjual produk digital dengan sistem pembayaran terintegrasi
        </p>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Buat Bot</TabsTrigger>
          <TabsTrigger value="manage">Kelola Bot</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Buat Bot Telegram Baru
              </CardTitle>
              <CardDescription>
                Masukkan token bot dari @BotFather untuk membuat bot penjualan otomatis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateBot} className="space-y-4">
                <div>
                  <label htmlFor="botToken" className="block text-sm font-medium mb-2">
                    Token Bot
                  </label>
                  <Input
                    id="botToken"
                    type="text"
                    placeholder="Contoh: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    disabled={createBotMutation.isPending}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Dapatkan token dari @BotFather di Telegram
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={createBotMutation.isPending}
                  className="w-full"
                >
                  {createBotMutation.isPending ? "Membuat Bot..." : "Buat Bot"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fitur Bot Otomatis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium">🤖 Otomatis</h4>
                  <p className="text-sm text-muted-foreground">
                    Bot akan merespons customer secara otomatis 24/7
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">💳 Pembayaran</h4>
                  <p className="text-sm text-muted-foreground">
                    Terintegrasi dengan Midtrans untuk pembayaran aman
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">📦 Pengiriman</h4>
                  <p className="text-sm text-muted-foreground">
                    Otomatis mengirim akun digital setelah pembayaran berhasil
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">📊 Laporan</h4>
                  <p className="text-sm text-muted-foreground">
                    Dashboard analitik untuk memantau penjualan
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bot Telegram Saya</CardTitle>
              <CardDescription>
                Kelola bot yang telah Anda buat
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBots ? (
                <div className="text-center py-8">
                  <p>Memuat bot...</p>
                </div>
              ) : !userBots || (userBots as AutoBot[]).length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada bot yang dibuat</p>
                  <p className="text-sm text-muted-foreground">
                    Buat bot pertama Anda di tab "Buat Bot"
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(userBots as AutoBot[]).map((bot) => (
                    <div
                      key={bot.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{bot.botName}</h3>
                          <Badge variant={bot.isActive ? "default" : "secondary"}>
                            {bot.isActive ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          @{bot.botUsername} • Bot ID: {bot.botId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Dibuat: {new Date(bot.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteBot(bot.id)}
                        disabled={deleteBotMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Produk Digital
              </CardTitle>
              <CardDescription>
                Produk yang dapat dijual melalui bot Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingProducts ? (
                <div className="text-center py-8">
                  <p>Memuat produk...</p>
                </div>
              ) : !products || (products as Product[]).length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Belum ada produk tersedia</p>
                  <p className="text-sm text-muted-foreground">
                    Hubungi admin untuk menambahkan produk
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(products as Product[]).map((product) => (
                    <Card key={product.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{product.name}</CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Harga:</span>
                            <span className="text-lg font-bold text-green-600">
                              Rp {parseInt(product.price).toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Stok:</span>
                            <Badge variant={product.stock > 0 ? "default" : "secondary"}>
                              {product.stock} tersedia
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Kategori:</span>
                            <Badge variant="outline">{product.category}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}