import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Coins, ChevronDown, LogOut, User, Menu, X, Home, LayoutDashboard, Bot, ShoppingCart, UserCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { User as UserType } from "@shared/schema";

export function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Navigation items
  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "My Bots", href: "/bots", icon: Bot },
    { name: "SMM Services", href: "/smm", icon: ShoppingCart },
    { name: "Profile", href: "/profile", icon: UserCircle },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-blue-600 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
              <span className="text-xl font-bold text-slate-900">BotBuilder AI</span>
            </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  location === item.href
                    ? "text-primary bg-primary/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Desktop Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Credits Display */}
            <div className="flex items-center space-x-2 px-4 py-2 bg-slate-100 rounded-lg">
              <Coins className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-slate-700">
                {user?.credits || 0} credits
              </span>
            </div>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{user?.fullName || user?.username}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Credits Only */}
          <div className="md:hidden flex items-center">
            <div className="flex items-center space-x-1 px-2 py-1 bg-slate-100 rounded-md">
              <Coins className="h-3 w-3 text-amber-600" />
              <span className="text-xs font-medium text-slate-700">
                {user?.credits || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="py-4 space-y-2 bg-white border-t border-slate-200">
            {/* Mobile Navigation Items */}
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeMobileMenu}
                className={`flex items-center space-x-3 px-4 py-3 rounded-md text-base font-medium transition-colors duration-200 ${
                  location === item.href
                    ? "text-primary bg-primary/10"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}

            {/* Mobile User Info */}
            <div className="border-t border-slate-200 pt-4 mt-4">
              <div className="flex items-center space-x-3 px-4 py-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="text-xs text-slate-500">
                    {user?.credits || 0} credits tersedia
                  </div>
                </div>
              </div>

              {/* Mobile Logout */}
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 mt-2"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Mobile Bottom Navigation - Clean Design */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex justify-around items-center py-3 px-2">
        {navigationItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center transition-all duration-200"
            >
              {/* Icon Container */}
              <div className={`
                p-2 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-primary text-white shadow-md' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}>
                <item.icon className="h-5 w-5" />
              </div>
              
              {/* Active indicator */}
              {isActive && (
                <div className="w-1 h-1 bg-primary rounded-full mt-1"></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
    </>
  );
}
