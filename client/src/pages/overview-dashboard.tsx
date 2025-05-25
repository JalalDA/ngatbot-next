import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  Bot, 
  ShoppingCart, 
  Coins, 
  TrendingUp, 
  Activity,
  Crown,
  Star,
  Zap,
  BarChart3
} from "lucide-react";
import { UpgradeModal } from "@/components/upgrade-modal";
import { useState } from "react";

export default function OverviewDashboard() {
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Fetch bots data
  const { data: bots = [] } = useQuery({
    queryKey: ["/api/bots"],
  });

  // Fetch SMM providers data
  const { data: smmProviders = [] } = useQuery({
    queryKey: ["/api/smm/providers"],
  });

  // Fetch SMM services data
  const { data: smmServices = [] } = useQuery({
    queryKey: ["/api/smm/services"],
  });

  // Calculate statistics
  const activeBots = Array.isArray(bots) ? bots.filter((bot: any) => bot.isActive).length : 0;
  const totalBots = Array.isArray(bots) ? bots.length : 0;
  const totalSmmServices = Array.isArray(smmServices) ? smmServices.length : 0;
  const activeProviders = Array.isArray(smmProviders) ? smmProviders.filter((p: any) => p.isActive).length : 0;

  // Credit usage percentage
  const maxCredits = user?.maxCredits || 1000;
  const currentCredits = user?.credits || 0;
  const usedCredits = maxCredits - currentCredits;
  const creditUsagePercentage = (usedCredits / maxCredits) * 100;

  // Account status
  const getAccountStatus = () => {
    if (user?.isPro) return { text: "Pro Account", color: "bg-blue-500", icon: Crown };
    if (user?.isBusiness) return { text: "Business Account", color: "bg-purple-500", icon: Star };
    return { text: "Free Account", color: "bg-gray-500", icon: User };
  };

  const accountStatus = getAccountStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Dashboard Overview</h1>
          <p className="text-slate-600">Selamat datang kembali! Kelola bot Telegram dan layanan SMM Anda dengan mudah.</p>
        </div>

        {/* Account Status Card */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${accountStatus.color} rounded-full flex items-center justify-center`}>
                  <accountStatus.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{user?.fullName || user?.username}</h2>
                  <Badge variant="secondary" className="mt-1">
                    {accountStatus.text}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <Coins className="w-5 h-5 text-amber-600" />
                  <span className="text-2xl font-bold text-slate-900">{currentCredits.toLocaleString()}</span>
                  <span className="text-slate-600">credits</span>
                </div>
                <Button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Active Bots */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Active Bots</CardTitle>
              <Bot className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{activeBots}</div>
              <p className="text-xs text-slate-500">dari {totalBots} total bot</p>
              <div className="mt-2">
                <Progress value={totalBots > 0 ? (activeBots / totalBots) * 100 : 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* SMM Services */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">SMM Services</CardTitle>
              <ShoppingCart className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{totalSmmServices}</div>
              <p className="text-xs text-slate-500">layanan tersedia</p>
              <div className="mt-2 flex items-center text-xs text-green-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>Ready to use</span>
              </div>
            </CardContent>
          </Card>

          {/* Credit Usage */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">Credit Usage</CardTitle>
              <Zap className="h-5 w-5 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{creditUsagePercentage.toFixed(1)}%</div>
              <p className="text-xs text-slate-500">{usedCredits.toLocaleString()} / {maxCredits.toLocaleString()} used</p>
              <div className="mt-2">
                <Progress value={creditUsagePercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Active Providers */}
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">SMM Providers</CardTitle>
              <Activity className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{activeProviders}</div>
              <p className="text-xs text-slate-500">provider aktif</p>
              <div className="mt-2 flex items-center text-xs text-purple-600">
                <Activity className="w-3 h-3 mr-1" />
                <span>Connected</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quick Bot Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-blue-600" />
                <span>Bot Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">Create New Bot</h4>
                  <p className="text-sm text-slate-600">Set up a new Telegram bot with AI</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Bot className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">Manage Existing Bots</h4>
                  <p className="text-sm text-slate-600">Edit settings and knowledge base</p>
                </div>
                <Button size="sm" variant="outline">
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick SMM Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-green-600" />
                <span>SMM Panel</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">Add Provider</h4>
                  <p className="text-sm text-slate-600">Connect new SMM service provider</p>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">Manage Services</h4>
                  <p className="text-sm text-slate-600">View and edit imported services</p>
                </div>
                <Button size="sm" variant="outline">
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-slate-600" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Bot created successfully</p>
                  <p className="text-xs text-slate-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">SMM services imported</p>
                  <p className="text-xs text-slate-500">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">Credits used for AI responses</p>
                  <p className="text-xs text-slate-500">1 hour ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </div>
  );
}