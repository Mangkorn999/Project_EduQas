'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/useAuth';
import { isDevEnvironment } from '@/lib/auth/dev-login';
import { getPostLoginPath } from '@/lib/auth/role-routing';

export default function CallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading, completeDevLoginFromStorage } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const mode = searchParams.get('mode');
    if (mode === 'dev' && isDevEnvironment) {
      const restored = completeDevLoginFromStorage();
      if (restored) {
        router.replace('/');
        return;
      }
    }

    if (isAuthenticated) {
      router.replace(getPostLoginPath(user?.role));
      return;
    }

    // Real OAuth callback should already have set the session cookie server-side.
    // If no session is available, send user back to login.
    router.replace('/login');
  }, [
    completeDevLoginFromStorage,
    isAuthenticated,
    isLoading,
    router,
    searchParams,
    user?.role,
  ]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-psu-navy">Signing you in...</h1>
        <p className="mt-2 text-sm text-gray-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน</p>
      </div>
    </main>
  );
}
