'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import { getPostLoginPath } from '@/lib/auth/role-routing';
import { DevRoleSelector } from '@/components/auth/DevRoleSelector';

const REAL_LOGIN_URL = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'http://localhost:3001/auth/psu';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [redirectUrl, setRedirectUrl] = useState(REAL_LOGIN_URL);

  useEffect(() => {
    setRedirectUrl(`${REAL_LOGIN_URL}?redirect_uri=${encodeURIComponent(`${window.location.origin}/callback`)}`);
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      router.replace(getPostLoginPath(user.role));
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f9ff] p-4">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-medium text-psu-navy">PSU EILA</p>
          <h1 className="mt-2 text-2xl font-bold text-on-surface">Sign in to continue</h1>
          <p className="mt-2 text-sm text-gray-500">
            เข้าสู่ระบบด้วย PSU Passport เพื่อใช้งานระบบประเมินเว็บไซต์
          </p>
        </div>

        <a
          href={redirectUrl}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-psu-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-psu-blue-container"
        >
          เข้าสู่ระบบด้วย PSU Passport
          <ArrowRight className="h-4 w-4" />
        </a>

        <DevRoleSelector />
      </section>
    </main>
  );
}
