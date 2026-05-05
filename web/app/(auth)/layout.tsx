'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import {motion} from 'framer-motion';
import {useEffect, useMemo, useState} from 'react';
import {cn} from '@/lib/utils';
import {ProtectedLayout} from '@/components/auth/ProtectedLayout';
import {CommandPalette} from '@/components/layout/CommandPalette';
import {UserMenu} from '@/components/auth/UserMenu';
import {LanguageToggle} from '@/components/ui/LanguageToggle';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {useAuthStore} from '@/lib/stores/authStore';
import type {UserRole} from '@/lib/permissions';
import {getAvailableRoles} from '@/lib/roles';

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

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const t = useTranslations();
  const {user} = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openCmd, setOpenCmd] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpenCmd((value) => !value);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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

  const commandItems = useMemo(
    () => visibleNavItems.map((item) => ({
      href: item.href,
      icon: item.icon,
      label: t(`nav.${item.labelKey}`),
    })),
    [t, visibleNavItems]
  );

  if (!useAppShell) {
    return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  const pageTitle = getPageTitle(pathname, t);

  return (
    <ProtectedLayout>
      <div className="min-h-screen overflow-hidden bg-[var(--typeui-content-bg)] text-[var(--typeui-text)] dark:bg-[#020617] dark:text-white">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute right-0 top-0 h-[400px] w-[400px] bg-cyan-400/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] bg-blue-500/10 blur-[120px]" />
          <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 animate-pulse bg-cyan-400/10 blur-[120px]" />
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="fixed left-4 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-[10px] border border-[var(--typeui-search-border)] bg-[var(--typeui-topbar-bg)] text-[var(--typeui-subtext)] shadow-sm backdrop-blur-[20px] lg:hidden"
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

        <CommandPalette
          items={commandItems}
          open={openCmd}
          onClose={() => {
            setOpenCmd(false);
            setMobileOpen(false);
          }}
        />

        <motion.aside
          initial={false}
          animate={{width: collapsed ? 64 : 240}}
          transition={{type: 'spring', stiffness: 260, damping: 20}}
          className={cn(
            'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_40%)] fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[var(--typeui-sidebar-border)] bg-[var(--typeui-sidebar-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
            mobileOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full lg:translate-x-0',
            'lg:flex'
          )}
        >
          <div className={cn('flex h-[60px] items-center border-b border-[var(--typeui-sidebar-border)] px-4', collapsed ? 'lg:justify-center' : 'justify-between')}>
            <Link href="/dashboard" className="flex items-center gap-3 justify-center">
              <Image
                src="/images/eila-logo.png"
                alt="EILA - PSU Website Evaluation System"
                width={collapsed ? 40 : 140}
                height={collapsed ? 40 : 48}
                priority
                className="h-auto object-contain"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-[10px] text-[var(--typeui-sidebar-inactive)] transition-colors duration-150 hover:bg-[var(--typeui-sidebar-active-bg)] hover:text-[var(--typeui-sidebar-text)] lg:hidden"
              aria-label={t('common.closeMenu')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-5">
            {visibleNavItems.map((item) => {
              const isActive = item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'glow-hover relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-300 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 motion-reduce:transition-none',
                    collapsed && 'lg:justify-center lg:px-0',
                    isActive
                      ? 'text-white'
                      : 'text-white/50 hover:bg-white/5 hover:text-white'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      transition={{type: 'spring', stiffness: 500, damping: 30}}
                      className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]"
                    />
                  )}
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="truncate">{t(`nav.${item.labelKey}`)}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--typeui-sidebar-border)] p-3">
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className={cn(
                'hidden h-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/40 backdrop-blur-md hover:bg-white/10 hover:text-white hover:shadow-[0_0_10px_rgba(59,130,246,0.4)] active:scale-[0.97] lg:flex',
                collapsed ? 'w-11' : 'w-full gap-2'
              )}
              aria-label={collapsed ? t('common.expandSidebar') : t('common.collapseSidebar')}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span className={cn('text-xs font-semibold', collapsed && 'hidden')}>{t('common.collapseSidebar')}</span>
            </button>
          </div>
        </motion.aside>

        <div className={cn('min-h-screen transition-all duration-150 ease-in-out motion-reduce:transition-none', collapsed ? 'lg:pl-16' : 'lg:pl-[240px]')}>
          <header
            className={cn(
              'glass after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/10 after:to-transparent fixed right-0 top-0 z-30 h-[64px] shadow-[0_4px_30px_rgba(0,0,0,0.6)]',
              collapsed ? 'lg:left-16' : 'lg:left-[240px]'
            )}
          >
            <div className="flex h-full items-center justify-between gap-4 px-5 md:px-8">
              <div className="min-w-0 pl-12 text-[13px] font-medium text-[var(--typeui-muted)] lg:pl-0">
                <span>{t('nav.dashboard')}</span>
                <span className="px-2 text-[var(--typeui-muted)]">/</span>
                <span className="font-semibold text-[var(--typeui-text)]">{pageTitle}</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="hidden h-11 min-w-[220px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-[var(--typeui-subtext)] backdrop-blur-md focus-within:ring-2 focus-within:ring-cyan-400/40 xl:flex">
                  <Search className="h-4 w-4" />
                  <input
                    type="search"
                    placeholder="Search"
                    className="h-full w-full bg-transparent text-[13px] font-medium text-[var(--typeui-text)] outline-none placeholder:text-[var(--typeui-muted)]"
                  />
                </label>
                <LanguageToggle />
                <ThemeToggle />
                <Link
                  href="/notifications"
                  className="relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[var(--typeui-subtext)] hover:bg-white/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--typeui-primary)]"
                  aria-label={t('nav.notifications')}
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--typeui-danger)]" />
                </Link>
                {user && <UserMenu variant="topbar" availableRoles={getAvailableRoles(user.roles)} />}
              </div>
            </div>
          </header>
          <main className="relative z-10 mx-auto max-w-7xl px-6 pb-10 pt-[100px]">
            <motion.div
              initial={{opacity: 0, y: 10}}
              animate={{opacity: 1, y: 0}}
              className="card-premium rounded-2xl p-6"
            >
              {children}
            </motion.div>
          </main>
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
