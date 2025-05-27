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
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard Overview</h1>
          <p className="text-muted-foreground">Selamat datang kembali! Kelola bot Telegram dan layanan SMM Anda dengan mudah.</p>
        </div>

        {/* Account Status Card */}
        <Card className="mb-8 interactive-card bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 ${accountStatus.color} rounded-full flex items-center justify-center animate-glow-pulse`}>
                  <accountStatus.icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{user?.fullName || user?.username}</h2>
                  <Badge variant="secondary" className="mt-1 bg-secondary text-secondary-foreground">
                    {accountStatus.text}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <Coins className="w-5 h-5 text-amber-400 animate-glow-pulse" />
                  <span className="text-2xl font-bold text-foreground">{currentCredits.toLocaleString()}</span>
                  <span className="text-muted-foreground">credits</span>
                </div>
                <Button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="interactive-button bg-primary hover:bg-primary/80 text-primary-foreground"
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
          <Card className="interactive-card hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Bots</CardTitle>
              <Bot className="h-5 w-5 text-primary animate-float" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{activeBots}</div>
              <p className="text-xs text-muted-foreground">dari {totalBots} total bot</p>
              <div className="mt-2">
                <Progress value={totalBots > 0 ? (activeBots / totalBots) * 100 : 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* SMM Services */}
          <Card className="interactive-card hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">SMM Services</CardTitle>
              <ShoppingCart className="h-5 w-5 text-green-400 animate-float" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{totalSmmServices}</div>
              <p className="text-xs text-muted-foreground">layanan tersedia</p>
              <div className="mt-2 flex items-center text-xs text-green-400">
                <TrendingUp className="w-3 h-3 mr-1 animate-glow-pulse" />
                <span>Ready to use</span>
              </div>
            </CardContent>
          </Card>

          {/* Credit Usage */}
          <Card className="interactive-card hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credit Usage</CardTitle>
              <Zap className="h-5 w-5 text-amber-400 animate-float" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{creditUsagePercentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{usedCredits.toLocaleString()} / 1000 used</p>
              <div className="mt-2">
                <Progress value={creditUsagePercentage} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Active Providers */}
          <Card className="interactive-card hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">SMM Providers</CardTitle>
              <Activity className="h-5 w-5 text-purple-400 animate-float" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{activeProviders}</div>
              <p className="text-xs text-muted-foreground">provider aktif</p>
              <div className="mt-2 flex items-center text-xs text-purple-400">
                <Activity className="w-3 h-3 mr-1 animate-glow-pulse" />
                <span>Connected</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Quick Bot Actions */}
          <Card className="bg-slate-900 dark:bg-slate-900 border-slate-800 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-blue-400 dark:text-blue-400" />
                <span className="text-white dark:text-white">Bot Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700">
                <div>
                  <h4 className="font-medium text-white dark:text-white">Create New Bot</h4>
                  <p className="text-sm text-slate-400 dark:text-slate-400">Set up a new Telegram bot with AI</p>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Bot className="w-4 h-4 mr-2" />
                  Create
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700">
                <div>
                  <h4 className="font-medium text-white dark:text-white">Manage Existing Bots</h4>
                  <p className="text-sm text-slate-400 dark:text-slate-400">Edit settings and knowledge base</p>
                </div>
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick SMM Actions */}
          <Card className="bg-slate-900 dark:bg-slate-900 border-slate-800 dark:border-slate-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-green-400 dark:text-green-400" />
                <span className="text-white dark:text-white">SMM Panel</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700">
                <div>
                  <h4 className="font-medium text-white dark:text-white">Add Provider</h4>
                  <p className="text-sm text-slate-400 dark:text-slate-400">Connect new SMM service provider</p>
                </div>
                <Button size="sm" className="bg-green-600 hover:bg-green-700">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700">
                <div>
                  <h4 className="font-medium text-white dark:text-white">Manage Services</h4>
                  <p className="text-sm text-slate-400 dark:text-slate-400">View and edit imported services</p>
                </div>
                <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">
                  View All
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="bg-slate-900 dark:bg-slate-900 border-slate-800 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-slate-300 dark:text-slate-300" />
              <span className="text-white dark:text-white">Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700">
                <div className="w-8 h-8 bg-blue-600 dark:bg-blue-600 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white dark:text-white">Bot created successfully</p>
                  <p className="text-xs text-slate-400 dark:text-slate-400">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700">
                <div className="w-8 h-8 bg-green-600 dark:bg-green-600 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white dark:text-white">SMM services imported</p>
                  <p className="text-xs text-slate-400 dark:text-slate-400">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-slate-800 dark:bg-slate-800 rounded-lg border border-slate-700 dark:border-slate-700">
                <div className="w-8 h-8 bg-amber-600 dark:bg-amber-600 rounded-full flex items-center justify-center">
                  <Coins className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white dark:text-white">Credits used for AI responses</p>
                  <p className="text-xs text-slate-400 dark:text-slate-400">1 hour ago</p>
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