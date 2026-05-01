'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {ChevronDown, LogOut, User} from 'lucide-react';
import {useAuthStore} from '@/lib/stores/authStore';
import {cn} from '@/lib/utils';
import {ALL_ROLES, getRoleLabel} from '@/lib/roles';
import type {UserRole} from '@/lib/permissions';

interface UserMenuProps {
  variant?: 'topbar' | 'sidebar';
  collapsed?: boolean;
  availableRoles?: UserRole[];
  onRoleSelect?: (role: UserRole) => Promise<void> | void;
}

export function UserMenu({
  variant = 'topbar',
  collapsed = false,
  availableRoles = ALL_ROLES,
  onRoleSelect,
}: UserMenuProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const {user, logout, setUserRole} = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [changingRole, setChangingRole] = useState<UserRole | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const activeRole = user.role as UserRole;
  const roleLabel = getRoleLabel(activeRole, locale);

  const handleRoleSelect = async (role: UserRole) => {
    if (role === activeRole || changingRole) return;
    try {
      setChangingRole(role);
      if (onRoleSelect) {
        await onRoleSelect(role);
      } else {
        await setUserRole(role);
        window.location.reload();
      }
      setIsOpen(false);
    } catch (err) {
      console.error('[UserMenu] Role change exception:', err);
      alert(t('profile.roleChangeError'));
    } finally {
      setChangingRole(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push('/login');
  };

  return (
    <div className="relative" ref={menuRef}>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-3 text-left transition-colors hover:bg-[var(--bg-muted)]',
            collapsed && 'lg:justify-center lg:px-0'
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-white dark:bg-stone-50 dark:text-stone-950">
            <User className="h-4 w-4" />
          </span>
          <span className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
            <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">{user.name}</span>
            <span className="mt-1 inline-flex max-w-full items-center rounded-full border-2 border-[#CA8A04] bg-amber-50 px-2 py-0.5 text-xs font-semibold text-[#92400E]">
              <span className="truncate">{roleLabel}</span>
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 text-[var(--text-muted)] transition-transform', isOpen && 'rotate-180', collapsed && 'lg:hidden')} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="hidden items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--bg-subtle)] sm:flex"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1C1917] text-white dark:bg-stone-50 dark:text-stone-950">
            <User className="h-4 w-4" />
          </span>
          <span className="hidden max-w-[170px] truncate text-sm font-semibold text-[var(--text-primary)] xl:block">{user.name}</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-[#CA8A04] bg-amber-50 px-2.5 py-1 text-xs font-semibold text-[#92400E]">
            {roleLabel}
            <ChevronDown className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')} />
          </span>
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            'absolute z-[9999] mt-2 w-80 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-lg',
            variant === 'sidebar' ? 'bottom-full left-0 mb-2' : 'right-0'
          )}
        >
          <div className="border-b border-[var(--border)] p-3">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{user.email || user.faculty || t('profile.noFaculty')}</p>
          </div>

          <div className="p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t('profile.switchRole')}</p>
            <div className="grid grid-cols-2 gap-2">
              {availableRoles.map((role) => {
                const active = activeRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    disabled={changingRole !== null}
                    className={cn(
                      'min-h-10 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer',
                      active
                        ? 'border-2 border-[#CA8A04] bg-amber-50 font-semibold text-[#92400E]'
                        : 'border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]',
                      changingRole === role && 'opacity-70'
                    )}
                  >
                    {getRoleLabel(role, locale)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-[var(--border)] p-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
