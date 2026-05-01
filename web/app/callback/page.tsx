'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPostLoginPath } from '@/lib/auth/role-routing';
import { readDevRole, isDevEnvironment } from '@/lib/auth/dev-login';

type BackendRole = 'super_admin' | 'admin' | 'executive' | 'teacher' | 'staff' | 'student';

type MeResponse = {
  id: string;
  email: string;
  displayName: string;
  role: BackendRole;
  facultyId: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');

    if (mode === 'dev' && isDevEnvironment) {
      const devRole = readDevRole();
      if (devRole) {
        router.replace(getPostLoginPath(devRole));
        return;
      }
    }

    async function fetchUser() {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          method: 'GET',
          credentials: 'include',
        });

        if (!res.ok) {
          const body = await res.text();
          console.error('[callback] /me failed:', res.status, body);
          throw new Error(`Failed to fetch user session (${res.status})`);
        }

        const user: MeResponse = await res.json();
        router.replace(getPostLoginPath(user.role));
      } catch (err) {
        console.error('Callback error:', err);
        setError('Authentication failed. Please try logging in again.');
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      }
    }

    fetchUser();
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600">Authentication Failed</h1>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <p className="mt-1 text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-bold text-psu-navy">Signing you in...</h1>
        <p className="mt-2 text-sm text-gray-500">กำลังตรวจสอบสิทธิ์การเข้าใช้งาน</p>
      </div>
    </main>
  );
}
