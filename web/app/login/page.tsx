'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth/useAuth';
import {
  roleOptions,
  isDevEnvironment,
  saveDevRole,
} from '@/lib/auth/dev-login';
import { getPostLoginPath } from '@/lib/auth/role-routing';
import type { UserRole } from '@/lib/auth/AuthContext';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const REAL_LOGIN_URL = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || `${BASE_URL}/auth/login`;

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [devRole, setDevRole] = useState<UserRole>('user');

  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return REAL_LOGIN_URL;
    return `${REAL_LOGIN_URL}?redirect_uri=${encodeURIComponent(`${window.location.origin}/callback`)}`;
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(getPostLoginPath(user?.role));
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  const onDevLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveDevRole(devRole);
    router.push('/callback?mode=dev');
  };

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

        {isDevEnvironment && (
          <form onSubmit={onDevLogin} className="mt-6 border-t border-gray-100 pt-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <ShieldCheck className="h-4 w-4 text-psu-navy" />
              Role testing (non-production)
            </div>
            <label htmlFor="dev-role" className="mb-2 block text-xs font-medium text-gray-500">
              Select role
            </label>
            <select
              id="dev-role"
              value={devRole}
              onChange={(event) => setDevRole(event.target.value as UserRole)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-psu-navy/20"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
            >
              Continue as {roleOptions.find((role) => role.value === devRole)?.label}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
