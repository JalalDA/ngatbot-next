import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AdminAccessModalProps {
  onAuthenticated: () => void;
}

export function AdminAccessModal({ onAuthenticated }: AdminAccessModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"secret" | "login">("secret");
  const [secret, setSecret] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Validate secret mutation
  const validateSecretMutation = useMutation({
    mutationFn: async (secret: string) => {
      const res = await apiRequest("POST", "/api/admin/validate-secret", { secret });
      return await res.json();
    },
    onSuccess: () => {
      setStep("login");
      toast({
        title: "Secret validated",
        description: "Please enter your admin credentials.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid secret code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin login mutation
  const adminLoginMutation = useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const res = await apiRequest("POST", "/api/admin/login", { username, password });
      return await res.json();
    },
    onSuccess: () => {
      onAuthenticated();
      toast({
        title: "Access granted",
        description: "Welcome to the admin panel.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Invalid credentials",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleValidateSecret = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) {
      toast({
        title: "Secret required",
        description: "Please enter the secret code.",
        variant: "destructive",
      });
      return;
    }
    validateSecretMutation.mutate(secret);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Credentials required",
        description: "Please enter both username and password.",
        variant: "destructive",
      });
      return;
    }
    adminLoginMutation.mutate({ username, password });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="text-red-600 text-2xl" />
          </div>
          <CardTitle className="text-2xl">Admin Access</CardTitle>
          <CardDescription>
            Enter access credentials to continue
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === "secret" ? (
            <form onSubmit={handleValidateSecret} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="secret">Secret Code</Label>
                <Input
                  id="secret"
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="Enter secret code"
                  disabled={validateSecretMutation.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-red-600 text-white hover:bg-red-700"
                disabled={validateSecretMutation.isPending}
              >
                {validateSecretMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  disabled={adminLoginMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  disabled={adminLoginMutation.isPending}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-red-600 text-white hover:bg-red-700"
                disabled={adminLoginMutation.isPending}
              >
                {adminLoginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Access Admin Panel"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
