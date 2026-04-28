'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  HelpCircle,
  LogOut,
  Bell,
  Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const useAppShell =
    pathname === '/evaluator' || pathname === '/profile' || pathname === '/notifications';

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
            { icon: LayoutDashboard, label: 'หน้าหลัก', href: '/evaluator', active: true },
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
