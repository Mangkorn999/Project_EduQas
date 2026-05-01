'use client';

import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {LogOut, Mail, User} from 'lucide-react';
import {useState} from 'react';
import {useAuthStore} from '@/lib/stores/authStore';
import {cn} from '@/lib/utils';
import {getAvailableRoles, getRoleLabel} from '@/lib/roles';
import type {UserRole} from '@/lib/permissions';

export default function ProfilePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const {user, setUserRole, logout} = useAuthStore();
  const [changingRole, setChangingRole] = useState<UserRole | null>(null);

  if (!user) return null;

  const activeRole = user.role as UserRole;
  const availableRoles = getAvailableRoles(user.roles);

  const switchRole = async (role: UserRole) => {
    if (role === activeRole || changingRole) return;
    try {
      setChangingRole(role);
      await setUserRole(role);
      window.location.reload();
    } catch (err) {
      console.error('[Profile] Role change exception:', err);
      alert(t('profile.roleChangeError'));
    } finally {
      setChangingRole(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">{t('profile.title')}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t('profile.subtitle')}</p>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-white dark:bg-stone-50 dark:text-stone-950">
            <User className="h-9 w-9" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{user.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email || user.faculty || t('profile.noFaculty')}
              </span>
              <span className="inline-flex rounded-full border-2 border-[#CA8A04] bg-amber-50 px-3 py-1 text-xs font-semibold text-[#92400E]">
                {getRoleLabel(activeRole, locale)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-900/60 dark:bg-transparent dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">{t('profile.switchRole')}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t('profile.roleHelp')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availableRoles.map((role) => {
            const active = activeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => switchRole(role)}
                disabled={changingRole !== null}
                className={cn(
                  'min-h-12 rounded-xl px-4 py-3 text-left text-sm transition-colors cursor-pointer',
                  active
                    ? 'border-2 border-[#CA8A04] bg-amber-50 font-semibold text-[#92400E]'
                    : 'border border-[var(--border)] bg-white text-[var(--text-muted)] hover:bg-gray-50 dark:bg-[var(--bg-surface)] dark:hover:bg-[var(--bg-subtle)]',
                  changingRole === role && 'opacity-70'
                )}
              >
                {getRoleLabel(role, locale)}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
