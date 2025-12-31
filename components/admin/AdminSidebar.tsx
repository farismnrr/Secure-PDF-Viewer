'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  BarChart3,
  Upload,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Globe,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface AdminSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function AdminSidebar({ isCollapsed, setIsCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Re-check auth state on pathname change
  useEffect(() => {
    // Only access storage on client
    const token = sessionStorage.getItem('access_token');
    const hasCookie = document.cookie.includes('access_token=');
    const newState = !!token || hasCookie;

    if (newState !== isLoggedIn) {
      setIsLoggedIn(newState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const isActive = (path: string) => {
    return pathname === path || (pathname.startsWith(path) && path !== '/admin');
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: BarChart3,
      active: pathname === '/admin'
    },
    {
      label: 'Upload PDF',
      href: '/admin/documents/new',
      icon: Upload,
      active: pathname === '/admin/documents/new'
    },
  ];

  const handleLogout = () => {
    // Clear token
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    sessionStorage.removeItem('access_token');
    router.push('/admin/login');
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 flex flex-col shadow-xl",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/admin" className={cn("flex items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity", isCollapsed ? "hidden" : "opacity-100")}>
          <div className="p-1.5 rounded-md bg-primary/10">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <span>PDF Admin</span>
        </Link>

        {isCollapsed && (
          <div className="mx-auto">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("h-8 w-8 ml-auto text-muted-foreground", isCollapsed && "hidden")}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 py-6 px-3 space-y-2">
        {isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(false)}
            className="w-full mb-4 text-muted-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}

        {navItems.map((item) => (
          <Button
            key={item.href}
            asChild
            variant={isActive(item.href) ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              isCollapsed ? "justify-center px-0" : "px-4",
              isActive(item.href) && "font-semibold shadow-sm"
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <Link href={item.href}>
              <item.icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          </Button>
        ))}
      </div>

      <div className="p-3 border-t border-border space-y-2 bg-muted/20">
        {isLoggedIn && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-destructive hover:text-white hover:bg-destructive transition-colors duration-200 cursor-pointer",
              isCollapsed && "justify-center px-0"
            )}
            onClick={handleLogout}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && <span>Sign Out</span>}
          </Button>
        )}
      </div>
    </aside>
  );
}
