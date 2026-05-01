'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowRight, Globe } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { getPostLoginPath } from '@/lib/auth/role-routing';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

const REAL_LOGIN_URL = process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'http://localhost:3001/auth/psu';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return REAL_LOGIN_URL;
    return `${REAL_LOGIN_URL}?redirect_uri=${encodeURIComponent(`${window.location.origin}/callback`)}`;
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      router.replace(getPostLoginPath(user.role));
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-page)] p-6 transition-colors duration-200">
      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Login Card */}
      <section className="w-full max-w-[440px] rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 shadow-[var(--shadow-lg)] transition-all duration-300">
        <div className="mb-10 text-center">
          <Image
            src="/images/eila-logo.png"
            alt="EILA - PSU Website Evaluation System"
            width={220}
            height={80}
            priority
            className="mx-auto mb-8 object-contain dark:brightness-90"
          />
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            Sign in to continue
          </h1>
          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
            เข้าสู่ระบบด้วย <span className="font-semibold text-[var(--accent-primary)]">PSU Passport</span> <br /> 
            เพื่อใช้งานระบบประเมินเว็บไซต์หน่วยงาน
          </p>
        </div>

        <div className="space-y-4">
          <a
            href={redirectUrl}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-[#1C1917] px-6 py-4 text-base font-bold text-white shadow-sm transition-colors duration-200 hover:bg-stone-700"
          >
            เข้าสู่ระบบด้วย PSU Passport
            <ArrowRight className="h-5 w-5" />
          </a>
          
          <div className="border-t border-[var(--border)] pt-6">
            <p className="text-xs text-center text-[var(--text-muted)] leading-relaxed">
              โดยการเข้าสู่ระบบ คุณยอมรับ <a href="#" className="underline hover:text-[var(--text-secondary)]">ข้อตกลงการใช้งาน</a> <br /> 
              และ <a href="#" className="underline hover:text-[var(--text-secondary)]">นโยบายความเป็นส่วนตัว</a> ของมหาวิทยาลัย
            </p>
          </div>
        </div>
      </section>

      {/* Footer Info */}
      <footer className="mt-12 text-center">
        <p className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--text-muted)]">
          <Globe className="h-4 w-4" />
          Prince of Songkla University
        </p>
      </footer>
    </main>
  );
}
