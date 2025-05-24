import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UpgradePlan {
  key: string;
  name: string;
  price: number;
  credits: number;
  level: string;
}

interface UpgradeData {
  currentLevel: string;
  currentCredits: number;
  availablePlans: UpgradePlan[];
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

declare global {
  interface Window {
    snap: any;
  }
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: upgradeData, isLoading } = useQuery<UpgradeData>({
    queryKey: ["/api/upgrade-plans"],
    enabled: isOpen,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/upgrade-plan", { plan });
      return await res.json();
    },
    onSuccess: (data) => {
      // Load Midtrans Snap script if not already loaded
      if (!window.snap) {
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'; // Use production URL for production
        script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY || '');
        document.head.appendChild(script);
        
        script.onload = () => {
          window.snap.pay(data.token, {
            onSuccess: (result: any) => {
              toast({
                title: "Pembayaran Berhasil!",
                description: "Akun Anda telah berhasil di-upgrade. Reload halaman untuk melihat perubahan.",
              });
              queryClient.invalidateQueries({ queryKey: ["/api/user"] });
              queryClient.invalidateQueries({ queryKey: ["/api/upgrade-plans"] });
              onClose();
            },
            onPending: (result: any) => {
              toast({
                title: "Pembayaran Pending",
                description: "Pembayaran Anda sedang diproses. Silakan tunggu konfirmasi.",
              });
              onClose();
            },
            onError: (result: any) => {
              toast({
                title: "Pembayaran Gagal",
                description: "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.",
                variant: "destructive",
              });
            },
            onClose: () => {
              toast({
                title: "Pembayaran Dibatalkan",
                description: "Anda membatalkan proses pembayaran.",
              });
            }
          });
        };
      } else {
        window.snap.pay(data.token, {
          onSuccess: (result: any) => {
            toast({
              title: "Pembayaran Berhasil!",
              description: "Akun Anda telah berhasil di-upgrade. Reload halaman untuk melihat perubahan.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
            queryClient.invalidateQueries({ queryKey: ["/api/upgrade-plans"] });
            onClose();
          },
          onPending: (result: any) => {
            toast({
              title: "Pembayaran Pending",
              description: "Pembayaran Anda sedang diproses. Silakan tunggu konfirmasi.",
            });
            onClose();
          },
          onError: (result: any) => {
            toast({
              title: "Pembayaran Gagal",
              description: "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.",
              variant: "destructive",
            });
          },
          onClose: () => {
            toast({
              title: "Pembayaran Dibatalkan",
              description: "Anda membatalkan proses pembayaran.",
            });
          }
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Gagal memproses upgrade. Silakan coba lagi.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (planKey: string) => {
    setSelectedPlan(planKey);
    upgradeMutation.mutate(planKey);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getPlanIcon = (level: string) => {
    switch (level) {
      case 'pro':
        return <Zap className="h-6 w-6 text-blue-500" />;
      case 'business':
        return <Crown className="h-6 w-6 text-purple-500" />;
      default:
        return null;
    }
  };

  const getPlanColor = (level: string) => {
    switch (level) {
      case 'pro':
        return 'border-blue-200 bg-blue-50';
      case 'business':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Memuat paket upgrade...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Upgrade Akun Anda
          </DialogTitle>
          <DialogDescription className="text-center">
            Pilih paket yang sesuai dengan kebutuhan Anda untuk mendapatkan lebih banyak kredit bot AI
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {upgradeData && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Paket Saat Ini</p>
                  <Badge variant={upgradeData.currentLevel === 'basic' ? 'secondary' : 'default'} className="mt-1">
                    {upgradeData.currentLevel.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kredit Tersisa</p>
                  <p className="text-lg font-semibold">{upgradeData.currentCredits.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-lg font-semibold text-green-600">Aktif</p>
                </div>
              </div>
            </div>
          )}

          {upgradeData?.availablePlans.length === 0 ? (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 text-purple-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Anda Sudah Memiliki Paket Terbaik!</h3>
              <p className="text-gray-600">Terima kasih telah menggunakan layanan premium kami.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {upgradeData?.availablePlans.map((plan) => (
                <Card key={plan.key} className={`relative ${getPlanColor(plan.level)} hover:shadow-lg transition-shadow`}>
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-2">
                      {getPlanIcon(plan.level)}
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold">{formatPrice(plan.price)}</span>
                      <span className="text-sm"> / sekali bayar</span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span>{plan.credits.toLocaleString()} kredit AI</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span>Bot Telegram tidak terbatas</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span>Knowledge base kustom</span>
                      </div>
                      <div className="flex items-center">
                        <Check className="h-4 w-4 text-green-500 mr-2" />
                        <span>Support prioritas</span>
                      </div>
                      {plan.level === 'business' && (
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          <span>Akses API khusus</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleUpgrade(plan.key)}
                      disabled={upgradeMutation.isPending && selectedPlan === plan.key}
                      variant={plan.level === 'business' ? 'default' : 'outline'}
                    >
                      {upgradeMutation.isPending && selectedPlan === plan.key ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Memproses...
                        </>
                      ) : (
                        `Upgrade ke ${plan.name}`
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">💳 Metode Pembayaran</h4>
          <p className="text-sm text-gray-600">
            Kami menerima berbagai metode pembayaran melalui Midtrans: Transfer Bank, E-Wallet (OVO, Dana, LinkAja), 
            Kartu Kredit/Debit, dan Indomaret/Alfamart.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}