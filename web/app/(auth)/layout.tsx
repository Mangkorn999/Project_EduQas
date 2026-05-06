'use client';

import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useTranslations} from 'next-intl';
import {
  Bell,
  FileText,
  LayoutDashboard,
  Menu,
  Globe,
  BarChart3,
  ShieldCheck,
  User,
  X,
  Command,
  type LucideIcon,
} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {useEffect, useMemo, useState} from 'react';
import {cn} from '@/lib/utils';
import {ProtectedLayout} from '@/components/auth/ProtectedLayout';
import {CommandPalette} from '@/components/layout/CommandPalette';
import {UserMenu} from '@/components/auth/UserMenu';
import {LanguageToggle} from '@/components/ui/LanguageToggle';
import {ThemeToggle} from '@/components/ui/ThemeToggle';
import {useAuthStore} from '@/lib/stores/authStore';
import {getAvailableRoles} from '@/lib/roles';

type NavLabelKey = 'dashboard' | 'forms' | 'websites' | 'users' | 'audit' | 'reports';

type ShellNavItem = {
  icon: LucideIcon;
  labelKey: NavLabelKey;
  href: string;
  matchPrefix?: string;
};

const SHELL_NAV_ITEMS: ShellNavItem[] = [
  {icon: LayoutDashboard, labelKey: 'dashboard', href: '/dashboard', matchPrefix: '/dashboard'},
  {icon: FileText, labelKey: 'forms', href: '/forms', matchPrefix: '/forms'},
  {icon: Globe, labelKey: 'websites', href: '/websites', matchPrefix: '/websites'},
  {icon: User, labelKey: 'users', href: '/admin/users', matchPrefix: '/admin/users'},
  {icon: ShieldCheck, labelKey: 'audit', href: '/admin/audit', matchPrefix: '/admin/audit'},
  {icon: BarChart3, labelKey: 'reports', href: '/reports', matchPrefix: '/reports'},
];

export default function AuthLayout({children}: {children: React.ReactNode}) {
  const pathname = usePathname();
  const t = useTranslations();
  const {user} = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    pathname.startsWith('/reports') ||
    pathname.startsWith('/websites');

  const visibleNavItems = useMemo(() => {
    const role = user?.role as string | undefined;

    return SHELL_NAV_ITEMS.filter((item) => {
      if (item.labelKey === 'dashboard') return true;
      if (role === 'teacher' || role === 'staff' || role === 'student') return false;
      if (role === 'executive') return item.labelKey === 'reports';
      if (role === 'admin') return ['forms', 'websites', 'reports'].includes(item.labelKey);
      if (role === 'super_admin') return true;
      return false;
    });
  }, [user]);

  const commandItems = useMemo(
    () =>
      visibleNavItems.map((item) => ({
        href: item.href,
        icon: item.icon,
        label: t(`nav.${item.labelKey}`),
      })),
    [t, visibleNavItems],
  );

  if (!useAppShell) {
    return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  const pageTitle = getPageTitle(pathname, t, user?.role as string | undefined);

  return (
    <ProtectedLayout>
      <div className="flex h-screen overflow-hidden bg-[var(--bg-page)]">
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{opacity: 0}}
              animate={{opacity: 1}}
              exit={{opacity: 0}}
              transition={{duration: 0.2}}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col lg:relative lg:translate-x-0',
            'transition-transform duration-300 ease-in-out',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{background: 'var(--sidebar-bg-gradient)'}}
        >
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--sidebar-border)] px-5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 transition-opacity hover:opacity-80"
            >
              <Image
                src="/images/eila-logo.png"
                alt="EILA - PSU Website Evaluation"
                width={108}
                height={36}
                priority
                className="h-8 w-auto object-contain brightness-[999] saturate-0"
              />
            </Link>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main navigation">
            <ul className="space-y-0.5" role="list">
              {visibleNavItems.map((item) => {
                const isActive = item.matchPrefix
                  ? pathname.startsWith(item.matchPrefix)
                  : pathname === item.href;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                        'transition-colors duration-150',
                        isActive
                          ? 'bg-[var(--sidebar-active-bg)] text-white'
                          : 'text-[var(--sidebar-text-muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--sidebar-active-accent)]"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive
                            ? 'text-[var(--sidebar-icon-active)]'
                            : 'text-[var(--sidebar-icon)] group-hover:text-[var(--sidebar-text-muted)]',
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{t(`nav.${item.labelKey}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="shrink-0 border-t border-[var(--sidebar-border)] p-3">
            {user && <UserMenu variant="sidebar" availableRoles={getAvailableRoles(user.roles)} />}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[var(--border)] bg-[var(--bg-surface)] px-4 md:px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">{pageTitle}</h1>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setOpenCmd(true)}
                className="hidden h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)] sm:flex"
                aria-label="Open command palette"
              >
                <Command className="h-3 w-3" />
                <span>K</span>
              </button>

              <LanguageToggle />
              <ThemeToggle />

              <Link
                href="/notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                aria-label={t('nav.notifications')}
              >
                <Bell className="h-4 w-4" />
                <span
                  className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[var(--color-error)]"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </header>

          <main id="main-content" className="flex-1 overflow-y-auto" tabIndex={-1}>
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
              <motion.div
                key={pathname}
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                transition={{duration: 0.18, ease: [0.4, 0, 0.2, 1]}}
              >
                {children}
              </motion.div>
            </div>
          </main>
        </div>
      </div>

      <CommandPalette items={commandItems} open={openCmd} onClose={() => setOpenCmd(false)} />
    </ProtectedLayout>
  );
}

function getPageTitle(pathname: string, t: ReturnType<typeof useTranslations>, role?: string) {
  if (pathname === '/dashboard') {
    if (role === 'student' || role === 'staff' || role === 'teacher') {
      return 'My Work';
    }
    return t('nav.dashboard');
  }
  if (pathname.startsWith('/forms')) return t('nav.forms');
  if (pathname.startsWith('/websites')) return t('nav.websites');
  if (pathname.startsWith('/admin/users')) return t('nav.users');
  if (pathname.startsWith('/admin/audit')) return t('nav.audit');
  if (pathname.startsWith('/reports')) return t('nav.reports');
  if (pathname.startsWith('/notifications')) return t('nav.notifications');
  if (pathname.startsWith('/profile')) return t('nav.profile');
  return t('nav.dashboard');
}
