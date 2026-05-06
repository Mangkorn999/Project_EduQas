'use client';

import { useTranslations } from 'next-intl';
import type { SessionWarningType } from '@/lib/auth/session-timeout';
import { cn } from '@/lib/utils';

interface Props {
  type: SessionWarningType;
  secondsLeft: number;
  onExtend: () => void;
  onLogout: () => void;
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}s`;
}

export function SessionTimeoutDialog({ type, secondsLeft, onExtend, onLogout }: Props) {
  const t = useTranslations();

  if (!type) return null;

  const isAbsolute = type === 'absolute';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-xl)]">
        {/* Warning icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--typeui-warning-soft)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--typeui-warning)]" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>

        <h2 id="session-timeout-title" className="text-[17px] font-bold text-[var(--text-primary)]">
          {isAbsolute ? t('session.absoluteTitle') : t('session.idleTitle')}
        </h2>
        <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
          {isAbsolute ? t('session.absoluteDesc') : t('session.idleDesc')}
        </p>

        {/* Countdown */}
        <div className={cn(
          'mt-4 rounded-xl border px-4 py-3 text-center',
          secondsLeft <= 60
            ? 'border-[var(--color-error)]/20 bg-[var(--typeui-danger-soft)]'
            : 'border-[var(--typeui-card-border)] bg-[var(--typeui-search-bg)]'
        )}>
          <span className={cn(
            'text-[28px] font-bold tabular-nums leading-none',
            secondsLeft <= 60 ? 'text-[var(--typeui-danger)]' : 'text-[var(--typeui-warning)]'
          )}>
            {fmt(secondsLeft)}
          </span>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{t('session.remaining')}</p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-[13px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
          >
            {t('nav.logout')}
          </button>

          {!isAbsolute && (
            <button
              type="button"
              onClick={onExtend}
              className="rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {t('session.extend')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
