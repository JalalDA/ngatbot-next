import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { toast } = useToast();

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/upgrade", { plan });
      const data = await res.json();
      console.log("Upgrade response:", data); // Debug log
      return data;
    },
    onSuccess: (data) => {
      console.log("Success data:", data); // Debug log
      if (data.snapToken) {
        // Load Midtrans Snap
        const script = document.createElement('script');
        script.src = 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', 'SB-Mid-client-yLqr4RdgcHZxWQ1C');
        document.head.appendChild(script);
        
        script.onload = () => {
          window.snap.pay(data.snapToken, {
            onSuccess: function() {
              toast({
                title: "Pembayaran Berhasil!",
                description: "Paket Anda telah berhasil diupgrade.",
              });
              onClose();
            },
            onPending: function() {
              toast({
                title: "Pembayaran Pending",
                description: "Pembayaran sedang diproses.",
              });
            },
            onError: function() {
              toast({
                title: "Pembayaran Gagal",
                description: "Terjadi kesalahan saat memproses pembayaran.",
                variant: "destructive",
              });
            },
            onClose: function() {
              onClose();
            }
          });
        };
      } else {
        toast({
          title: "Error",
          description: "Tidak dapat membuat pembayaran. Silakan coba lagi.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      console.error("Upgrade error:", error); // Debug log
      toast({
        title: "Error",
        description: error.message || "Terjadi kesalahan saat memproses upgrade.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
    upgradeMutation.mutate(plan);
  };

  const plans = [
    {
      key: "pro",
      name: "PRO",
      price: 299000,
      credits: 10000,
      icon: <Zap className="h-8 w-8 text-blue-500" />,
      color: "border-blue-200 bg-blue-50",
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      features: [
        "10.000 AI Response",
        "Support 24/7",
        "Multiple Bot",
        "Priority Support"
      ]
    },
    {
      key: "business",
      name: "BISNIS",
      price: 550000,
      credits: 20000,
      icon: <Crown className="h-8 w-8 text-purple-500" />,
      color: "border-purple-200 bg-purple-50",
      buttonColor: "bg-purple-600 hover:bg-purple-700",
      features: [
        "20.000 AI Response",
        "Priority Support",
        "Advanced Analytics",
        "Custom Integration",
        "Dedicated Account Manager"
      ]
    }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Pilihan Paket
          </DialogTitle>
          <DialogDescription className="text-center">
            Pilih paket langganan yang sesuai kebutuhanmu, dan nikmati bot AI tanpa batasan!
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative p-6 rounded-lg border-2 ${plan.color} hover:shadow-lg transition-all duration-200`}
            >
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  {plan.icon}
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {formatPrice(plan.price)}
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  {plan.credits.toLocaleString()} AI Response
                </p>

                <ul className="text-sm text-gray-600 mb-6 space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center justify-center">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.key)}
                  disabled={upgradeMutation.isPending}
                  className={`w-full text-white ${plan.buttonColor}`}
                >
                  {upgradeMutation.isPending && selectedPlan === plan.key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    `Pilih ${plan.name}`
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Pembayaran aman dengan Midtrans</p>
          <p>Semua transaksi dilindungi dengan enkripsi SSL</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}