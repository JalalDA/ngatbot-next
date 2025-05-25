import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Bot, LogOut, User, Crown, Moon, Sun, Monitor, Sparkles, LayoutDashboard, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/components/theme-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => location === path;

  const ThemeToggle = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const UserMenu = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 h-auto px-3 py-2 hover:bg-secondary/80">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="hidden lg:flex flex-col items-start text-left">
              <span className="text-sm font-medium">{user?.username}</span>
              <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                <Crown className={`h-3 w-3 ${
                  user?.level === 'business' ? 'text-purple-500' : 
                  user?.level === 'pro' ? 'text-blue-500' : 
                  'text-gray-400'
                }`} />
                {user?.level}
              </span>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                <Crown className={`h-3 w-3 ${
                  user?.level === 'business' ? 'text-purple-500' : 
                  user?.level === 'pro' ? 'text-blue-500' : 
                  'text-gray-400'
                }`} />
                {user?.level} plan
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem disabled>
          <div className="flex items-center gap-2 w-full">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm">Credits: {user?.credits}</span>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                BotBuilder
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user && (
              <div className="flex items-center gap-1">
                <Link href="/">
                  <Button 
                    variant={isActive("/") ? "secondary" : "ghost"} 
                    size="sm"
                    className="font-medium"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Link href="/admin">
                  <Button 
                    variant={isActive("/admin") ? "secondary" : "ghost"} 
                    size="sm"
                    className="font-medium"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Admin
                  </Button>
                </Link>
              </div>
            )}

            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              {user ? (
                <UserMenu />
              ) : (
                <Link href="/auth">
                  <Button className="btn-primary px-6">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-9 w-9 p-0"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden animate-in">
          <div className="px-4 pt-4 pb-6 space-y-4 bg-background border-t">
            {user && (
              <>
                <div className="space-y-2">
                  <Link href="/" onClick={() => setIsMenuOpen(false)}>
                    <Button 
                      variant={isActive("/") ? "secondary" : "ghost"} 
                      className="w-full justify-start font-medium"
                    >
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/admin" onClick={() => setIsMenuOpen(false)}>
                    <Button 
                      variant={isActive("/admin") ? "secondary" : "ghost"} 
                      className="w-full justify-start font-medium"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Admin
                    </Button>
                  </Link>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground capitalize flex items-center gap-1">
                        <Crown className={`h-3 w-3 ${
                          user.level === 'business' ? 'text-purple-500' : 
                          user.level === 'pro' ? 'text-blue-500' : 
                          'text-gray-400'
                        }`} />
                        {user.level} • {user.credits} credits
                      </p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="w-full justify-start mt-2"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </>
            )}
            
            {!user && (
              <Link href="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full btn-primary">Sign In</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}