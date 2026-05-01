'use client';

<<<<<<< HEAD
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  BookOpen,
  HelpCircle,
  LogOut,
  Bell,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
=======
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useLocale, useTranslations} from 'next-intl';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Menu,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {cn} from '@/lib/utils';
import {ProtectedLayout} from '@/components/auth/ProtectedLayout';
import {UserMenu} from '@/components/auth/UserMenu';
import {LanguageToggle} from '@/components/ui/LanguageToggle';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {useAuthStore} from '@/lib/stores/authStore';
import type {UserRole} from '@/lib/permissions';
import {getAvailableRoles, getRoleLabel} from '@/lib/roles';

type ShellNavItem = {
  icon: LucideIcon;
  labelKey: 'dashboard' | 'forms' | 'notifications' | 'profile';
  href: string;
  matchPrefix?: string;
};

const EVALUATOR_ROLES: UserRole[] = ['student', 'staff', 'teacher'];
const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'executive'];

const SHELL_NAV_ITEMS: ShellNavItem[] = [
  {icon: LayoutDashboard, labelKey: 'dashboard', href: '/dashboard', matchPrefix: '/dashboard'},
  {icon: FileText, labelKey: 'forms', href: '/forms', matchPrefix: '/forms'},
  {icon: Bell, labelKey: 'notifications', href: '/notifications', matchPrefix: '/notifications'},
  {icon: User, labelKey: 'profile', href: '/profile', matchPrefix: '/profile'},
];
>>>>>>> feature/ux-login-role-test

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
<<<<<<< HEAD
  const useAppShell =
    pathname.startsWith('/evaluator') || 
    pathname.startsWith('/forms') ||
    pathname === '/profile' || 
    pathname === '/notifications';

  if (!useAppShell) {
    return children;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 bg-white border-r border-gray-100 flex flex-col pt-8 hidden lg:flex shadow-sm">
        <div className="px-8 mb-10 flex items-center gap-3">
          <div className="bg-psu-navy h-10 w-10 rounded-lg flex items-center justify-center">
            <Monitor className="text-white h-6 w-6" />
          </div>
          <span className="font-bold text-xl text-psu-navy uppercase tracking-tight">PSU Eila</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {[
            { icon: LayoutDashboard, label: 'หน้าหลัก', href: '/evaluator', active: pathname === '/evaluator' },
            { icon: ClipboardList, label: 'จัดการ Form', href: '/forms', active: pathname.startsWith('/forms') },
            { icon: ClipboardCheck, label: 'รายการประเมิน', href: '/evaluator' },
            { icon: BarChart3, label: 'สรุปผล', href: '/evaluator' },
            { icon: BookOpen, label: 'คู่มือการใช้งาน', href: '/profile' },
            { icon: HelpCircle, label: 'ติดต่อสอบถาม', href: '/notifications' },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group text-sm font-medium',
                item.active
                  ? 'bg-blue-50 text-psu-navy border-l-4 border-psu-gold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  item.active ? 'text-psu-navy' : 'text-gray-400 group-hover:text-gray-600'
                )}
              />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all text-sm font-medium">
            <LogOut className="h-5 w-5" />
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <div className="flex-1">
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <span className="hidden md:inline">Dashboard</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/notifications" className="p-2.5 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 relative transition-all">
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </Link>

            <Link href="/profile" className="flex items-center gap-3 pl-4 border-l border-gray-100 cursor-pointer hover:bg-gray-50 py-1.5 px-2 rounded-lg transition-all">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-none">สมชาย รักไทย</p>
                <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider">คณะวิศวกรรมศาสตร์</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-psu-navy overflow-hidden border-2 border-psu-gold shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="Profile"
                />
              </div>
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
=======
  const t = useTranslations();
  const locale = useLocale();
  const {user, setUserRole} = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const useAppShell =
    pathname.startsWith('/evaluator') ||
    pathname.startsWith('/forms') ||
    pathname === '/dashboard' ||
    pathname === '/profile' ||
    pathname === '/notifications' ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reports');

  const visibleNavItems = useMemo(() => {
    const role = user?.role as UserRole | undefined;
    const isAdmin = role ? ADMIN_ROLES.includes(role) : false;
    const isEvaluator = role ? EVALUATOR_ROLES.includes(role) : false;

    return SHELL_NAV_ITEMS.filter((item) => {
      if (item.labelKey !== 'forms') return true;
      return isAdmin && !isEvaluator;
    });
  }, [user]);

  if (!useAppShell) {
    return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  const roleLabel = user ? getRoleLabel(user.role as UserRole, locale) : '';
  const pageTitle = getPageTitle(pathname, t);

  return (
    <ProtectedLayout>
      <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)]">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm lg:hidden"
          aria-label={t('common.openMenu')}
        >
          <Menu className="h-5 w-5" />
        </button>

        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-stone-950/35 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label={t('common.closeMenu')}
          />
        )}

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] shadow-sm transition-all duration-250 ease-in-out',
            collapsed ? 'lg:w-16' : 'lg:w-[240px]',
            mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:translate-x-0',
            'md:w-16 lg:flex'
          )}
        >
          <div className={cn('flex h-20 items-center border-b border-[var(--border)] px-4', collapsed ? 'lg:justify-center' : 'justify-between')}>
            <Link href="/dashboard" className="flex items-center justify-center">
              <Image
                src="/images/eila-logo.png"
                alt="EILA - PSU Website Evaluation System"
                width={collapsed ? 36 : 140}
                height={collapsed ? 36 : 48}
                priority
                className="h-auto object-contain dark:brightness-90"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] lg:hidden"
              aria-label={t('common.closeMenu')}
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="hidden h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] lg:flex"
              aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-6">
            {visibleNavItems.map((item) => {
              const isActive = item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
                    collapsed && 'lg:justify-center lg:px-0',
                    isActive
                      ? 'bg-stone-100 text-stone-950 dark:bg-stone-800 dark:text-stone-50'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <item.icon className={cn('h-5 w-5 shrink-0', isActive && 'text-[#CA8A04]')} />
                  <span className={cn('truncate', collapsed && 'lg:hidden')}>{t(`nav.${item.labelKey}`)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--border)] p-3">
            {user && (
              <UserMenu
                variant="sidebar"
                collapsed={collapsed}
                availableRoles={getAvailableRoles(user.roles)}
                onRoleSelect={async (role) => {
                  await setUserRole(role);
                  window.location.reload();
                }}
              />
            )}
            <div className={cn('mt-3 text-[11px] font-medium text-[var(--text-disabled)]', collapsed && 'lg:text-center')}>
              <span className={cn(collapsed && 'lg:hidden')}>EILA Portal</span>
              <span className={cn(!collapsed && 'ml-1', collapsed && 'hidden lg:inline')}>v0.1</span>
            </div>
          </div>
        </aside>

        <div className={cn('min-h-screen transition-all duration-250 ease-in-out md:pl-16', collapsed ? 'lg:pl-16' : 'lg:pl-[240px]')}>
          <header
            className={cn(
              'fixed left-0 right-0 top-0 z-30 h-14 border-b border-[var(--border)] bg-[var(--bg-surface)]/95 backdrop-blur md:left-16',
              collapsed ? 'lg:left-16' : 'lg:left-[240px]'
            )}
          >
            <div className="flex h-full items-center justify-between gap-4 px-5 md:px-8">
              <div className="min-w-0 pl-12 text-sm font-medium text-[var(--text-muted)] lg:pl-0">
                <span>{t('nav.dashboard')}</span>
                <span className="px-2 text-[var(--text-disabled)]">/</span>
                <span className="text-[var(--text-primary)]">{pageTitle}</span>
                {roleLabel && <span className="ml-2 hidden text-[#92400E] sm:inline">{roleLabel}</span>}
              </div>

              <div className="flex items-center gap-2">
                <LanguageToggle />
                <ThemeToggle />
                <Link
                  href="/notifications"
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-muted)]"
                  aria-label={t('nav.notifications')}
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#CA8A04]" />
                </Link>
                {user && <UserMenu variant="topbar" availableRoles={getAvailableRoles(user.roles)} />}
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-5 pb-8 pt-[88px] md:px-8">{children}</main>
        </div>
      </div>
    </ProtectedLayout>
  );
}

function getPageTitle(pathname: string, t: ReturnType<typeof useTranslations>) {
  if (pathname.startsWith('/forms')) return t('nav.forms');
  if (pathname.startsWith('/notifications')) return t('nav.notifications');
  if (pathname.startsWith('/profile')) return t('nav.profile');
  return t('nav.dashboard');
}
>>>>>>> feature/ux-login-role-test
