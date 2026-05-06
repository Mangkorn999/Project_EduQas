'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getPostLoginPath } from '@/lib/auth/role-routing';
import { getRoutePermission } from '@/lib/auth/route-permissions';
import { hasPermission, type UserRole } from '@/lib/permissions';
import { useSessionTimeout } from '@/lib/auth/session-timeout';
import { SessionTimeoutDialog } from './SessionTimeoutDialog';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

function SessionGuard() {
  const { warningType, secondsLeft, extendSession, forceLogout } = useSessionTimeout();
  return (
    <SessionTimeoutDialog
      type={warningType}
      secondsLeft={secondsLeft}
      onExtend={extendSession}
      onLogout={forceLogout}
    />
  );
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const PUBLIC_ROUTES = ['/login', '/callback', '/403'];
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    if (!isAuthenticated && !isPublicRoute) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (isAuthenticated && pathname === '/login') {
      router.replace(getPostLoginPath(user?.role ?? 'student'));
      return;
    }

    if (isAuthenticated && user) {
      const requiredPermission = getRoutePermission(pathname);
      if (requiredPermission && !hasPermission(user.role as UserRole, requiredPermission)) {
        router.replace('/403');
        return;
      }
    }
  }, [isAuthenticated, isLoading, pathname, user?.role, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#0d2257] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[var(--text-muted)]">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {children}
      <SessionGuard />
    </>
  );
}
