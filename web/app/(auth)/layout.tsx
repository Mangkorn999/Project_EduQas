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
];

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const t = useTranslations();
  const {user} = useAuthStore();
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
        {/* Background Gradients */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute right-0 top-0 h-[400px] w-[400px] bg-cyan-400/10 blur-[120px]" />
          <div className="absolute bottom-0 left-0 h-[400px] w-[400px] bg-blue-500/10 blur-[120px]" />
        </div>

        <CommandPalette
          items={commandItems}
          open={openCmd}
          onClose={() => {
            setOpenCmd(false);
            setMobileOpen(false);
          }}
        />

        {/* Unified Topbar */}
        <header className="glass fixed left-0 right-0 top-0 z-50 h-[72px] border-b border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-6 md:px-8">
            <div className="flex items-center gap-6">
              {/* Logo */}
              <Link href="/dashboard" className="flex shrink-0 items-center transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <Image
                  src="/images/eila-logo.png"
                  alt="EILA - PSU"
                  width={120}
                  height={40}
                  priority
                  className="h-9 w-auto object-contain"
                />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden items-center gap-1 lg:flex">
                {visibleNavItems.map((item) => {
                  const isActive = item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'relative flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all duration-300',
                        isActive 
                          ? 'bg-[#e0efff] text-[var(--typeui-primary)] dark:bg-white/10 dark:text-cyan-400' 
                          : 'text-[var(--typeui-subtext)] hover:bg-white/5 hover:text-[var(--typeui-text)] dark:text-white/60 dark:hover:text-white'
                      )}
                    >
                      <item.icon className={cn("h-4 w-4", isActive ? "opacity-100" : "opacity-70")} />
                      <span>{t(`nav.${item.labelKey}`)}</span>
                      {isActive && (
                        <motion.div
                          layoutId="nav-underline"
                          className="absolute bottom-1 left-4 right-4 h-0.5 rounded-full bg-[var(--typeui-primary)] dark:bg-cyan-400 shadow-[0_0_8px_rgba(0,102,255,0.4)]"
                          transition={{type: 'spring', stiffness: 500, damping: 30}}
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 md:gap-2">
                <LanguageToggle />
                <ThemeToggle />
                <Link
                  href="/notifications"
                  className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[var(--typeui-subtext)] transition-all hover:bg-white/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-[0.97]"
                  aria-label={t('nav.notifications')}
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-3 top-3 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                </Link>
                {user && <UserMenu variant="topbar" availableRoles={getAvailableRoles(user.roles)} />}
                
                {/* Mobile Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[var(--typeui-subtext)] lg:hidden"
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {mobileOpen && (
            <motion.div
              initial={{opacity: 0, y: -10}}
              animate={{opacity: 1, y: 0}}
              className="glass absolute left-0 right-0 top-[72px] z-40 border-b border-white/10 p-4 lg:hidden"
            >
              <nav className="flex flex-col gap-1">
                {visibleNavItems.map((item) => {
                  const isActive = item.matchPrefix ? pathname.startsWith(item.matchPrefix) : pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium transition-all',
                        isActive 
                          ? 'bg-[#e0efff] text-[var(--typeui-primary)] dark:bg-white/10 dark:text-cyan-400' 
                          : 'text-[var(--typeui-subtext)] hover:bg-white/5 hover:text-[var(--typeui-text)] dark:text-white/60 dark:hover:text-white'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{t(`nav.${item.labelKey}`)}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </header>

        <div className="min-h-screen pt-[72px]">
          <main className="relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-10">
            <motion.div
              initial={{opacity: 0, y: 20}}
              animate={{opacity: 1, y: 0}}
              className="card-premium rounded-3xl p-6 md:p-8"
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
