/**
 * Admin Layout
 * Wraps all admin pages with shell
 */

import { AdminShell } from '@/components/admin/AdminShell';

export const metadata = {
  title: 'Admin Dashboard - Secure PDF Viewer',
  description: 'Admin dashboard for managing PDF documents'
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminShell>
      {children}
    </AdminShell>
  );
}
