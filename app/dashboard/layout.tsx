import { Shell } from '@/components/Shell';
import { RouteGuard } from '@/components/RouteGuard';

export const metadata = {
  title: 'Dashboard - Secure File Viewer',
  description: 'Dashboard for managing files and documents'
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <RouteGuard>
      <Shell>
        {children}
      </Shell>
    </RouteGuard>
  );
}
