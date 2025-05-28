'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Home, CreditCard, Key, Settings, Bot } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/dashboard', label: 'API Keys', icon: Key },
    { href: '/payment', label: 'Payment', icon: CreditCard },
    { href: '/bot', label: 'Telegram Bot', icon: Bot },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <Card className="w-64 h-full p-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold mb-4">SMM Panel</h2>
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant={pathname === item.href ? "default" : "ghost"}
              className="w-full justify-start"
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>
    </Card>
  )
}