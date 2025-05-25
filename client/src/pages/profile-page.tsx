import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  Settings, 
  LogOut,
  Crown,
  Coins
} from "lucide-react";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  const userLevel = user.level || "Free";
  const isProUser = userLevel === "Pro";
  const isBusinessUser = userLevel === "Business";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-2xl">{user.fullName}</CardTitle>
                  {(isProUser || isBusinessUser) && (
                    <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500">
                      <Crown className="h-3 w-3 mr-1" />
                      {userLevel}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-base">{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Account Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Account Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Username</span>
                <span className="font-medium">{user.username}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Email</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Role</span>
                <Badge variant="outline">{user.role}</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Member Since</span>
                <span className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Subscription & Credits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5" />
                <span>Subscription & Credits</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Current Plan</span>
                <Badge 
                  variant={isProUser || isBusinessUser ? "default" : "secondary"}
                  className={isProUser || isBusinessUser ? "bg-gradient-to-r from-blue-500 to-purple-500" : ""}
                >
                  {userLevel}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Coins className="h-4 w-4 mr-1" />
                  Available Credits
                </span>
                <span className="font-bold text-lg text-green-600">{user.credits}</span>
              </div>
              
              {userLevel === "Free" && (
                <>
                  <Separator />
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      Upgrade to Pro or Business untuk mendapatkan lebih banyak kredit!
                    </p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>• Pro: 10,000 kredit (Rp 299,000)</p>
                      <p>• Business: 20,000 kredit (Rp 550,000)</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
            <CardDescription>Overview aktivitas akun Anda</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">0</div>
                <div className="text-sm text-gray-600">Total Bots</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">0</div>
                <div className="text-sm text-gray-600">SMM Orders</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{user.credits}</div>
                <div className="text-sm text-gray-600">Credits Used</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Account Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="outline" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>{logoutMutation.isPending ? "Logging out..." : "Logout"}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}