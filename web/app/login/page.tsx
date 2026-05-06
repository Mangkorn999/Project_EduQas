'use client';

import {useEffect, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {useTranslations} from 'next-intl';
import Image from 'next/image';
import {ArrowRight, ShieldCheck} from 'lucide-react';
import {useAuthStore} from '@/lib/stores/authStore';
import {getPostLoginPath} from '@/lib/auth/role-routing';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {LanguageToggle} from '@/components/ui/LanguageToggle';

const REAL_LOGIN_URL =
  process.env.NEXT_PUBLIC_AUTH_LOGIN_URL || 'http://localhost:3001/auth/psu';

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const {isAuthenticated, isLoading, user} = useAuthStore();
  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return REAL_LOGIN_URL;
    return `${REAL_LOGIN_URL}?redirect_uri=${encodeURIComponent(
      `${window.location.origin}/callback`,
    )}`;
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role) {
      router.replace(getPostLoginPath(user.role));
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  return (
    <div className="relative flex min-h-screen bg-[var(--bg-page)]">
      <div className="absolute right-5 top-5 z-10 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div
        className="hidden w-[480px] shrink-0 flex-col justify-between p-10 lg:flex"
        style={{
          background: 'linear-gradient(160deg, #0d2257 0%, #0a1a45 55%, #071130 100%)',
        }}
      >
        <div>
          <Image
            src="/images/eila-logo.png"
            alt="EILA"
            width={130}
            height={44}
            priority
            className="h-10 w-auto object-contain brightness-[999] saturate-0"
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold leading-snug text-white">
              Website evaluation
              <br />
              for PSU units
            </h1>
            <p className="text-[15px] leading-relaxed text-white/60">
              Prince of Songkla University
              <br />
              Educational Innovation and Learning Academy
            </p>
          </div>

          <ul className="space-y-3" aria-label="System features">
            {[
              'Manage rounds and evaluation forms',
              'Track review progress in real time',
              'Export and share results quickly',
            ].map((feat) => (
              <li key={feat} className="flex items-center gap-3 text-sm text-white/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300">
                  +
                </span>
                {feat}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/30">
          Copyright {new Date().getFullYear()} Prince of Songkla University
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/images/eila-logo.png"
              alt="EILA"
              width={130}
              height={44}
              priority
              className="h-10 w-auto object-contain"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-lg)]">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
                <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">
                {t('auth.signIn')}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
                {t('auth.loginSubtitle')}
              </p>
            </div>

            <div className="space-y-4">
              <a
                href={redirectUrl}
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-[#0d2257] px-5 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:bg-[#142e6e] hover:shadow-md active:scale-[0.98]"
              >
                {t('auth.loginWithPsu')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>

              <div className="flex items-center gap-3">
                <hr className="flex-1 border-[var(--border)]" />
                <span className="text-xs text-[var(--text-disabled)]">PSU Passport</span>
                <hr className="flex-1 border-[var(--border)]" />
              </div>

              <p className="text-center text-xs leading-relaxed text-[var(--text-muted)]">
                {t('auth.termsPrefix')}{' '}
                <a
                  href="#"
                  className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
                >
                  {t('auth.terms')}
                </a>{' '}
                {t('auth.and')}{' '}
                <a
                  href="#"
                  className="underline underline-offset-2 hover:text-[var(--text-secondary)]"
                >
                  {t('auth.privacy')}
                </a>{' '}
                {t('auth.universitySuffix')}
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[var(--text-disabled)]">
            Prince of Songkla University
          </p>
        </div>
      </div>
    </div>
  );
}
