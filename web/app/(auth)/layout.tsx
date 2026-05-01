'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {
  Bell,
  ChevronDown,
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
import {getAvailableRoles} from '@/lib/roles';

interface AuthLayoutProps {
  children: React.ReactNode;
  shellTitle?: string;
  expandedSidebarWidth?: number;
  collapsedSidebarWidth?: number;
}

type ShellNavItem = {
  icon: LucideIcon;
  labelKey: 'dashboard' | 'forms' | 'notifications' | 'profile';
  href: string;
  matchPrefix?: string;
  children?: ShellNavItem[];
};

const EVALUATOR_ROLES: UserRole[] = ['student', 'staff', 'teacher'];
const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'executive'];
const DEFAULT_SHELL_TITLE = 'EILA Evaluation Portal';
const DEFAULT_EXPANDED_SIDEBAR_WIDTH = 280;
const DEFAULT_COLLAPSED_SIDEBAR_WIDTH = 64;

const SHELL_NAV_ITEMS: ShellNavItem[] = [
  {icon: LayoutDashboard, labelKey: 'dashboard',     href: '/dashboard',     matchPrefix: '/dashboard'},
  {icon: FileText,        labelKey: 'forms',         href: '/forms',         matchPrefix: '/forms'},
  {icon: Bell,            labelKey: 'notifications', href: '/notifications', matchPrefix: '/notifications'},
  {icon: User,            labelKey: 'profile',       href: '/profile',       matchPrefix: '/profile'},
];

export default function AuthLayout({
  children,
  shellTitle = DEFAULT_SHELL_TITLE,
  expandedSidebarWidth = DEFAULT_EXPANDED_SIDEBAR_WIDTH,
  collapsedSidebarWidth = DEFAULT_COLLAPSED_SIDEBAR_WIDTH,
}: Readonly<AuthLayoutProps>) {
  const pathname  = usePathname();
  const t         = useTranslations();
  const {user}    = useAuthStore();
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const useAppShell =
    pathname.startsWith('/evaluator') ||
    pathname.startsWith('/forms')     ||
    pathname === '/dashboard'         ||
    pathname === '/profile'           ||
    pathname === '/notifications'     ||
    pathname.startsWith('/admin')     ||
    pathname.startsWith('/reports');

  const visibleNavItems = useMemo(() => {
    const role        = user?.role as UserRole | undefined;
    const isAdmin     = role ? ADMIN_ROLES.includes(role)     : false;
    const isEvaluator = role ? EVALUATOR_ROLES.includes(role) : false;
    return SHELL_NAV_ITEMS.filter((item) => {
      if (item.labelKey !== 'forms') return true;
      return isAdmin && !isEvaluator;
    });
  }, [user]);

  if (!useAppShell) return <ProtectedLayout>{children}</ProtectedLayout>;

  const sidebarWidthClass = collapsed
    ? 'md:w-[var(--collapsed-sidebar-width)]'
    : 'md:w-[var(--expanded-sidebar-width)]';
  const mainOffsetClass = collapsed
    ? 'md:pl-[var(--collapsed-sidebar-width)]'
    : 'md:pl-[var(--expanded-sidebar-width)]';

  const renderNavItems = (items: ShellNavItem[], nested = false) =>
    items.map((item) => {
      const isActive    = item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;
      const hasChildren = Boolean(item.children?.length);

      return (
        <div key={item.href}>
          <Link
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              'focus-ring group flex h-11 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200',
              collapsed && !nested && 'md:justify-center md:px-0',
              nested && 'ml-7 h-9 text-xs',
              isActive
                ? 'bg-[#00D9FF] font-semibold text-[#001d59] shadow-[0_8px_22px_rgba(0,217,255,0.22)]'
                : 'text-[#001d59]/75 hover:bg-[#001d59]/8 hover:text-[#001d59] dark:text-white/75 dark:hover:bg-[#7C3AED]/30 dark:hover:text-white'
            )}
          >
            <item.icon
              className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-200',
                nested && 'h-4 w-4',
                isActive ? 'text-[#001d59]' : 'text-[#001d59]/65 group-hover:text-[#7C3AED] dark:text-white/70 dark:group-hover:text-[#00D9FF]'
              )}
            />
            <span className={cn('truncate', collapsed && !nested && 'md:hidden')}>
              {t(`nav.${item.labelKey}`)}
            </span>
            {hasChildren && (
              <ChevronDown
                className={cn(
                  'ml-auto h-4 w-4 text-[#001d59]/45 transition-transform duration-200 dark:text-white/55',
                  isActive && 'rotate-180 text-[#001d59]',
                  collapsed && !nested && 'md:hidden'
                )}
              />
            )}
          </Link>
          {hasChildren && !collapsed && (
            <div className="mt-1 space-y-1 border-l border-[#001d59]/10 pl-2 dark:border-white/10">
              {renderNavItems(item.children ?? [], true)}
            </div>
          )}
        </div>
      );
    });

  // ── shared icon button classes ──────────────────────────────────────────
  const iconBtn = cn(
    'focus-ring flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition-all duration-200',
    // light
    'border-[#001d59]/15 bg-[#001d59]/5 text-[#001d59] hover:bg-[#001d59]/10 hover:shadow-[0_0_10px_rgba(0,29,89,0.15)]',
    // dark
    'dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-[#7C3AED]/70 dark:hover:shadow-[0_0_14px_rgba(124,58,237,0.5)]'
  );

  return (
    <ProtectedLayout>
      <div
        className="min-h-screen font-prompt transition-colors duration-300 bg-[#f5f7fa] text-[#1a1a1a] dark:bg-[#0B0F1A] dark:text-[#F9FAFB]"
        style={{
          '--expanded-sidebar-width':  `${expandedSidebarWidth}px`,
          '--collapsed-sidebar-width': `${collapsedSidebarWidth}px`,
        } as React.CSSProperties}
      >

        {/* ─── Topbar ───────────────────────────────────────────────────── */}
        <header className={cn(
          'fixed left-0 right-0 top-0 z-50 min-h-[60px] transition-colors duration-300',
          // light mode: white card with navy border
          'bg-white/95 text-[#001d59] shadow-[0_2px_16px_rgba(0,29,89,0.10)] border-b border-[#001d59]/10',
          // dark mode: deep blue gradient with glow
          'dark:bg-transparent dark:text-white dark:border-none dark:shadow-none'
        )}>

          {/* dark-only: gradient background layers */}
          <div className="absolute inset-0 hidden dark:block bg-gradient-to-r from-[#001d59] via-[#0a2a7a] to-[#001d59]" />
          <div className="absolute inset-0 hidden dark:block bg-gradient-to-r from-transparent via-[#7C3AED]/10 to-transparent" />

          {/* dark-only: cyan top glow line */}
          <div className="absolute inset-x-0 top-0 hidden h-[2px] dark:block bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent opacity-70" />

          {/* dark-only: cyan bottom glow line */}
          <div className="absolute inset-x-0 bottom-0 hidden h-[1.5px] dark:block bg-gradient-to-r from-transparent via-[#00D9FF]/60 to-transparent" />

          {/* light-only: accent bottom line */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] dark:hidden bg-gradient-to-r from-transparent via-[#001d59]/30 to-transparent" />

          {/* ── content ── */}
          <div className="relative grid min-h-[60px] w-full grid-cols-1 gap-2 px-4 py-2 md:grid-cols-[minmax(260px,1fr)_minmax(360px,1fr)] md:items-center md:py-0">

            {/* LEFT: menu toggle + logo */}
            <div className="flex min-w-0 items-center gap-2">

              {/* mobile toggle */}
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                className={cn(iconBtn, 'md:hidden')}
                aria-label={mobileOpen ? t('common.closeMenu') : t('common.openMenu')}
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>

              {/* desktop collapse */}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className={cn(iconBtn, 'hidden md:flex')}
                aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* logo + title */}
              <Link href="/dashboard" className="focus-ring flex min-w-0 items-center gap-2.5 rounded-lg">
                <span className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg p-1',
                  'bg-white shadow-[0_0_0_1.5px_rgba(0,29,89,0.12),0_2px_8px_rgba(0,29,89,0.10)]',
                  'dark:shadow-[0_0_12px_rgba(0,217,255,0.3)]'
                )}>
                  <Image
                    src="/images/eila-logo.png"
                    alt="EILA"
                    width={32}
                    height={32}
                    priority
                    className="h-auto w-auto object-contain"
                  />
                </span>
                <span className="min-w-0">
                  {/* light: navy text */}
                  <span className="block truncate text-sm font-bold leading-5 text-[#001d59] dark:hidden">
                    {shellTitle}
                  </span>
                  {/* dark: gradient text */}
                  <span className="hidden truncate bg-gradient-to-r from-white via-[#e0f0ff] to-[#00D9FF] bg-clip-text text-sm font-bold leading-5 text-transparent dark:block">
                    {shellTitle}
                  </span>
                </span>
              </Link>
            </div>

            {/* RIGHT: actions */}
            <div className="flex min-w-0 items-center justify-end gap-2">
              <ThemeToggle />
              <LanguageToggle />

              {/* notification bell */}
              <Link
                href="/notifications"
                className={cn(iconBtn, 'relative')}
                aria-label={t('nav.notifications')}
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[#00D9FF] shadow-[0_0_8px_rgba(0,217,255,1)]" />
              </Link>

              {/* divider */}
              <span className="hidden h-6 w-px bg-[#001d59]/15 dark:bg-white/15 md:block" />

              {user && (
                <UserMenu variant="topbar" availableRoles={getAvailableRoles(user.roles)} />
              )}
            </div>
          </div>
        </header>

        {/* ─── Mobile overlay ───────────────────────────────────────────── */}
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/35 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label={t('common.closeMenu')}
          />
        )}

        {/* ─── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className={cn(
            'fixed bottom-0 left-0 top-[60px] z-50 flex w-[280px] flex-col border-r backdrop-blur-md transition-all duration-300 ease-in-out',
            'border-[#001d59]/10 bg-white/90 text-[#001d59] shadow-[6px_0_28px_rgba(0,29,89,0.10)]',
            'dark:border-white/10 dark:bg-[#001d59]/90 dark:text-white dark:shadow-[6px_0_28px_rgba(0,29,89,0.22)]',
            sidebarWidthClass,
            mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          )}
        >
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
            {renderNavItems(visibleNavItems)}
          </nav>
        </aside>

        {/* ─── Main content ─────────────────────────────────────────────── */}
        <div className={cn('min-h-screen pt-[60px] transition-[padding] duration-300 ease-in-out', mainOffsetClass)}>
          <main className="grid grid-cols-12 gap-4 px-3 py-4 sm:px-4 md:gap-6 md:px-6 md:py-6">
            <div className="col-span-12">
              <div className="min-h-[calc(100vh-120px)] rounded-lg border border-white/20 bg-white/70 p-3 shadow-lg backdrop-blur-md transition-colors duration-300 dark:border-[#374151]/50 dark:bg-[#111827]/80 sm:p-4 md:p-6">
                {children}
              </div>
            </div>
          </main>
        </div>

      </div>
    </ProtectedLayout>
  );
}
