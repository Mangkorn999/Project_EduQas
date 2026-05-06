'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {ChevronDown, LogOut, Settings, User} from 'lucide-react';
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
            'flex min-h-11 w-full items-center gap-3 rounded-[10px] border border-[var(--typeui-sidebar-border)] bg-white/[0.06] px-3 py-3 text-left transition-colors duration-150 hover:bg-[var(--typeui-sidebar-active-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--typeui-gold)] motion-reduce:transition-none',
            collapsed && 'lg:justify-center lg:px-0'
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--typeui-sidebar-active-bg)] text-[var(--typeui-sidebar-text)]">
            <User className="h-4 w-4" />
          </span>
          <span className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
            <span className="block truncate text-sm font-semibold text-[var(--typeui-sidebar-text)]">{user.name}</span>
            <span className="mt-1 inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium text-white/40">
              <span className="truncate">{roleLabel}</span>
            </span>
          </span>
          <ChevronDown className={cn('h-4 w-4 text-white/45 transition-transform duration-150', isOpen && 'rotate-180', collapsed && 'lg:hidden')} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[#0066FF] text-xs font-bold text-white shadow-sm transition-all duration-200 hover:shadow-[0_0_12px_rgba(0,102,255,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0066FF]"
          aria-label="Open user menu"
          title="Profile menu"
        >
          {user.name?.charAt(0).toUpperCase() || 'A'}
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            'absolute z-[9999] mt-2 w-60 rounded-[20px] border border-[var(--border)] bg-[var(--bg-surface)] p-2 shadow-xl',
            variant === 'sidebar' ? 'bottom-full left-0 mb-2' : 'right-0'
          )}
        >
          {/* Header */}
          <div className="border-b border-[var(--border)] px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {t('profile.title')}
            </span>
            <div className="mt-2">
              <p className="truncate text-sm font-bold text-[var(--text-primary)]">{user.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                {roleLabel}
              </p>
            </div>
          </div>

          <div className="py-2">
            <button
              type="button"
              onClick={() => { router.push('/profile'); setIsOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <User className="h-4 w-4" />
              <span>{t('nav.profile')}</span>
            </button>
            <button
              type="button"
              onClick={() => { router.push('/settings'); setIsOpen(false); }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <Settings className="h-4 w-4" />
              <span>{t('nav.settings')}</span>
            </button>
          </div>

          {/* Role Switch Section (if multiple roles available) */}
          {availableRoles.length > 1 && (
            <div className="border-t border-[var(--border)] px-4 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                {t('profile.switchRole')}
              </p>
              <div className="grid grid-cols-1 gap-1">
                {availableRoles.map((role) => {
                  const active = activeRole === role;
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleSelect(role)}
                      disabled={changingRole !== null}
                      className={cn(
                        'flex min-h-9 items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-all',
                        active
                          ? 'bg-[var(--typeui-warning-soft)] font-bold text-[var(--typeui-warning-text)]'
                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <span>{getRoleLabel(role, locale)}</span>
                      {active && <div className="h-1.5 w-1.5 rounded-full bg-[var(--typeui-gold)]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-[var(--border)] p-1">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--typeui-danger-text)] transition-colors hover:bg-[var(--typeui-danger-soft)]"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
