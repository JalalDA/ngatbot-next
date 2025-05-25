import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bot, CheckCircle, AlertCircle, Copy, ExternalLink, Settings, Trash2, Plus } from "lucide-react";

// Form schemas
const createBotSchema = z.object({
  botToken: z.string().min(1, "Token bot diperlukan").regex(/^[0-9]+:[A-Za-z0-9_-]+$/, "Format token tidak valid")
});

type CreateBotForm = z.infer<typeof createBotSchema>;

interface AutoBot {
  id: number;
  botToken: string;
  botUsername: string;
  botName: string;
  botId: string;
  isActive: boolean;
  webhookUrl: string;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  category: string;
  isActive: boolean;
}

export default function AutoBotBuilderPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("create");

  // Form untuk membuat bot baru
  const form = useForm<CreateBotForm>({
    resolver: zodResolver(createBotSchema),
    defaultValues: {
      botToken: ""
    }
  });

  // Query untuk mengambil daftar bot user
  const { data: userBots = [], isLoading: botsLoading } = useQuery({
    queryKey: ["/api/auto-bots"],
    enabled: activeTab === "manage"
  });

  // Query untuk mengambil daftar produk
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["/api/products"],
    enabled: activeTab === "products"
  });

  // Mutation untuk membuat bot baru
  const createBotMutation = useMutation({
    mutationFn: async (data: CreateBotForm) => {
      return await apiRequest("/api/auto-bots", {
        method: "POST",
        body: JSON.stringify(data)
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Bot berhasil dibuat!",
        description: `Bot ${data.botName} (@${data.botUsername}) telah aktif dan siap digunakan.`
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/auto-bots"] });
      setActiveTab("manage");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal membuat bot",
        description: error.message || "Terjadi kesalahan saat membuat bot"
      });
    }
  });

  // Mutation untuk menghapus bot
  const deleteBotMutation = useMutation({
    mutationFn: async (botId: number) => {
      return await apiRequest(`/api/auto-bots/${botId}`, {
        method: "DELETE"
      });
    },
    onSuccess: () => {
      toast({
        title: "Bot berhasil dihapus",
        description: "Bot dan webhook telah dihapus dari sistem"
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-bots"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Gagal menghapus bot",
        description: error.message || "Terjadi kesalahan saat menghapus bot"
      });
    }
  });

  const onSubmit = (data: CreateBotForm) => {
    createBotMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Disalin!",
      description: "Text telah disalin ke clipboard"
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Bot Builder Otomatis</h1>
        <p className="text-muted-foreground">
          Buat bot Telegram otomatis untuk penjualan akun digital dengan sistem pembayaran terintegrasi
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Buat Bot Baru</TabsTrigger>
          <TabsTrigger value="manage">Kelola Bot</TabsTrigger>
          <TabsTrigger value="products">Produk</TabsTrigger>
        </TabsList>

        {/* Tab Buat Bot Baru */}
        <TabsContent value="create" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Buat Bot Telegram Baru
              </CardTitle>
              <CardDescription>
                Masukkan token bot dari BotFather untuk membuat bot otomatis dengan sistem penjualan terintegrasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="botToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token Bot Telegram</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Dapatkan token dari @BotFather di Telegram. Format: 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Bot akan otomatis dikonfigurasi dengan menu penjualan akun digital dan sistem pembayaran Midtrans.
                      Pastikan token bot valid dan belum digunakan di tempat lain.
                    </AlertDescription>
                  </Alert>

                  <Button 
                    type="submit" 
                    disabled={createBotMutation.isPending}
                    className="w-full"
                  >
                    {createBotMutation.isPending ? "Membuat Bot..." : "Buat Bot Otomatis"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Panduan Penggunaan */}
          <Card>
            <CardHeader>
              <CardTitle>Cara Menggunakan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">1. Buat Bot di Telegram</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Chat dengan @BotFather</li>
                    <li>• Ketik /newbot</li>
                    <li>• Berikan nama dan username bot</li>
                    <li>• Salin token yang diberikan</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">2. Fitur Bot Otomatis</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Menu interaktif dengan kategori produk</li>
                    <li>• Sistem pembayaran QRIS Midtrans</li>
                    <li>• Pengiriman akun otomatis setelah pembayaran</li>
                    <li>• Manajemen stok akun digital</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Kelola Bot */}
        <TabsContent value="manage" className="space-y-6">
          {botsLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">Memuat daftar bot...</div>
              </CardContent>
            </Card>
          ) : userBots.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  Belum ada bot yang dibuat. Buat bot pertama Anda di tab "Buat Bot Baru".
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userBots.map((bot: AutoBot) => (
                <Card key={bot.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{bot.botName}</CardTitle>
                      <Badge variant={bot.isActive ? "default" : "secondary"}>
                        {bot.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <CardDescription>@{bot.botUsername}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Bot ID</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                          {bot.botId}
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(bot.botId)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                          {bot.webhookUrl}
                        </code>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(bot.webhookUrl)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => window.open(`https://t.me/${bot.botUsername}`, '_blank')}
                        className="flex-1"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Buka Bot
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteBotMutation.mutate(bot.id)}
                        disabled={deleteBotMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab Produk */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Daftar Produk
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Produk
                </Button>
              </CardTitle>
              <CardDescription>
                Kelola produk yang akan dijual melalui bot Telegram
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="text-center text-muted-foreground py-8">Memuat produk...</div>
              ) : products.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Belum ada produk. Tambahkan produk pertama untuk mulai berjualan.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {products.map((product: Product) => (
                    <Card key={product.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {product.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-primary">
                              Rp {parseInt(product.price).toLocaleString('id-ID')}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost">
                              <Settings className="h-3 w-3" />
                            </Button>
                            <Badge variant={product.isActive ? "default" : "secondary"} className="text-xs">
                              {product.isActive ? "Aktif" : "Nonaktif"}
                            </Badge>
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