'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/authStore';
import { getPostLoginPath } from '@/lib/auth/role-routing';
import { getRoutePermission } from '@/lib/auth/route-permissions';
import { hasPermission, type UserRole } from '@/lib/permissions';

interface ProtectedLayoutProps {
  children: React.ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    const PUBLIC_ROUTES = ['/login', '/callback', '/403'];
    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

    // ยังไม่ login → redirect ไป login พร้อม redirect param
    if (!isAuthenticated && !isPublicRoute) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    // login อยู่แล้วแต่เข้าหน้า login → ส่งไปหน้า default ของ role
    if (isAuthenticated && pathname === '/login') {
      router.replace(getPostLoginPath(user?.role ?? 'student'));
      return;
    }

    // Route permission check — ถ้า user ไม่มีสิทธิ์เข้าหน้านี้ → redirect /403
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
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9ff]">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-psu-navy border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
