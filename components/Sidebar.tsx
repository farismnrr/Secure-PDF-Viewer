'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';
import {
  BarChart3,
  Upload,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  const isActive = (path: string) => {
    return pathname === path || (pathname.startsWith(path) && path !== '/dashboard');
  };

  const navItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      active: pathname === '/dashboard'
    },
    {
      label: 'Upload File',
      href: '/dashboard/documents/new',
      icon: Upload,
      active: pathname === '/dashboard/documents/new'
    },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-card transition-all duration-300 flex flex-col shadow-xl",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/dashboard" className={cn("flex items-center gap-2 font-semibold tracking-tight text-foreground transition-opacity", isCollapsed ? "hidden" : "opacity-100")}>
          <div className="p-1.5 rounded-md bg-primary/10">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <span>File Viewer</span>
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

      <div className="p-3 border-t border-border bg-muted/20">
        {!isCollapsed && user ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-foreground" title={user.email}>{user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-destructive hover:text-white hover:bg-destructive shrink-0 h-8 w-8"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          isAuthenticated && (
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start text-destructive hover:text-white hover:bg-destructive transition-colors duration-200 cursor-pointer",
                isCollapsed && "justify-center px-0"
              )}
              onClick={handleLogout}
              title={isCollapsed ? `Sign Out (${user?.username || 'User'})` : undefined}
            >
              <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span>Sign Out</span>}
            </Button>
          )
        )}
      </div>
    </aside>
  );
}
