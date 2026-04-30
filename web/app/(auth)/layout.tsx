'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  ClipboardList,
  BarChart3,
  BookOpen,
  HelpCircle,
  Bell,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProtectedLayout } from '@/components/auth/ProtectedLayout';
import { UserMenu } from '@/components/auth/UserMenu';
import { useAuthStore } from '@/lib/stores/authStore';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const useAppShell =
    pathname.startsWith('/evaluator') ||
    pathname.startsWith('/forms') ||
    pathname === '/profile' ||
    pathname === '/notifications' ||
    pathname.startsWith('/admin');

  if (!useAppShell) {
    return <ProtectedLayout>{children}</ProtectedLayout>;
  }

  return (
    <ProtectedLayout>
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

              <UserMenu />
            </div>
          </header>
          {children}
        </div>
      </div>
    </ProtectedLayout>
  );
}
