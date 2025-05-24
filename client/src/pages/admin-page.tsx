import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminAccessModal } from "@/components/admin-access-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, 
  Users, 
  Bot, 
  MessageSquare, 
  DollarSign, 
  Settings, 
  Trash2, 
  Edit,
  Key,
  LogOut,
  Loader2
} from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  level: string;
  credits: number;
  botCount: number;
  createdAt: string;
}

interface AdminStats {
  totalUsers: number;
  activeBots: number;
  messagesCount: number;
  revenue: number;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [openAIKey, setOpenAIKey] = useState("");

  // Fetch admin users
  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAuthenticated,
  });

  // Fetch admin stats
  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAuthenticated,
  });

  // Update OpenAI key mutation
  const updateOpenAIKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("PUT", "/api/admin/settings/openai-key", { apiKey });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "OpenAI API Key Updated",
        description: "The API key has been updated successfully.",
      });
      setOpenAIKey("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update API key",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, level, credits }: { userId: number; level: string; credits: number }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}`, { level, credits });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User information has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "User deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Admin logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/logout");
      return await res.json();
    },
    onSuccess: () => {
      setIsAuthenticated(false);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
  });

  const handleUpdateOpenAIKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!openAIKey.trim()) {
      toast({
        title: "Invalid API key",
        description: "Please enter a valid OpenAI API key.",
        variant: "destructive",
      });
      return;
    }
    updateOpenAIKeyMutation.mutate(openAIKey);
  };

  const handleEditUser = (user: AdminUser) => {
    const newLevel = prompt("Enter new level (basic, pro, business):", user.level);
    const newCredits = prompt("Enter new credits:", user.credits.toString());
    
    if (newLevel && newCredits) {
      const creditsNum = parseInt(newCredits);
      if (isNaN(creditsNum)) {
        toast({
          title: "Invalid credits",
          description: "Credits must be a valid number.",
          variant: "destructive",
        });
        return;
      }
      
      updateUserMutation.mutate({
        userId: user.id,
        level: newLevel,
        credits: creditsNum,
      });
    }
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      deleteUserMutation.mutate(userId);
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminAccessModal 
        onAuthenticated={() => setIsAuthenticated(true)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Admin Navigation */}
      <nav className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-red-700 rounded-lg flex items-center justify-center">
                  <Shield className="text-white text-sm" />
                </div>
                <span className="text-xl font-bold text-white">Admin Panel</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-slate-300">Welcome, ilmi</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logoutMutation.mutate()}
                className="text-slate-300 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* OpenAI Configuration */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>OpenAI Configuration</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage the global OpenAI API key for all bots
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateOpenAIKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-slate-300">
                  OpenAI API Key
                </Label>
                <Input
                  id="openai-key"
                  type="password"
                  value={openAIKey}
                  onChange={(e) => setOpenAIKey(e.target.value)}
                  placeholder="sk-..."
                  className="bg-slate-700 border-slate-600 text-white focus:ring-red-500 focus:border-red-500"
                  disabled={updateOpenAIKeyMutation.isPending}
                />
              </div>

              <Button 
                type="submit"
                disabled={updateOpenAIKeyMutation.isPending}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {updateOpenAIKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update API Key"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* System Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
                </div>
                <Users className="text-blue-400 text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Active Bots</p>
                  <p className="text-2xl font-bold text-white">{stats?.activeBots || 0}</p>
                </div>
                <Bot className="text-green-400 text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Messages Today</p>
                  <p className="text-2xl font-bold text-white">{stats?.messagesCount || 0}</p>
                </div>
                <MessageSquare className="text-purple-400 text-xl" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Revenue</p>
                  <p className="text-2xl font-bold text-white">${stats?.revenue || 0}</p>
                </div>
                <DollarSign className="text-yellow-400 text-xl" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Management</span>
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manage user accounts, credits, and subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">User</TableHead>
                      <TableHead className="text-slate-300">Plan</TableHead>
                      <TableHead className="text-slate-300">Credits</TableHead>
                      <TableHead className="text-slate-300">Bots</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id} className="border-slate-700">
                        <TableCell>
                          <div>
                            <p className="text-white font-medium">{user.fullName}</p>
                            <p className="text-slate-400 text-sm">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={
                              user.level === "basic" 
                                ? "bg-slate-100 text-slate-800" 
                                : user.level === "pro"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-purple-100 text-purple-800"
                            }
                          >
                            {user.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{user.credits}</TableCell>
                        <TableCell className="text-slate-300">{user.botCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-400 hover:text-red-300"
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
