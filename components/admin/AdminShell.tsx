'use client';

import { useState, useEffect } from 'react';
import AdminSidebar from './AdminSidebar';
import { cn } from '@/lib/utils/cn';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminShellProps {
    children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
    // Initialize with false (expanded) by default
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Handle responsive
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
            if (window.innerWidth < 1024) {
                setIsCollapsed(true); // Always collapse on mobile logic
            } else {
                setShowMobileSidebar(false);
            }
        };

        // Initial check
        checkMobile();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="min-h-screen bg-muted/40 relative">
            {/* Mobile Toggle */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center h-16 px-4 bg-background border-b border-border">
                <Button variant="ghost" size="icon" onClick={() => setShowMobileSidebar(!showMobileSidebar)}>
                    <Menu className="h-5 w-5" />
                </Button>
                <span className="ml-2 font-semibold">Admin</span>
            </div>

            {/* Sidebar - Desktop & Mobile */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0",
                // On mobile, hide by default unless toggled
                isMobile && !showMobileSidebar ? "-translate-x-full" : "translate-x-0"
            )}>
                <AdminSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
            </div>

            {/* Content Area */}
            <main
                className={cn(
                    "transition-[margin] duration-300 min-h-screen",
                    isMobile ? "pt-16 px-4" : "", // Push down for mobile header
                    !isMobile && (isCollapsed ? "ml-16" : "ml-64")
                )}
            >
                <div className="container mx-auto py-8 px-4 max-w-7xl animate-in fade-in duration-500">
                    {children}
                </div>
            </main>

            {/* Mobile Overlay */}
            {isMobile && showMobileSidebar && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                    onClick={() => setShowMobileSidebar(false)}
                />
            )}
        </div>
    );
}
