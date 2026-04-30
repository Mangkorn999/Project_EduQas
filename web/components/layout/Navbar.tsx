'use client'

import React from 'react'
import Link from 'next/link'
import { FileText, Layout as LayoutIcon, Settings, LogOut, User } from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { LanguageToggle } from '@/components/ui/LanguageToggle'
import { useAuthStore } from '@/lib/stores/authStore'

import { usePathname } from 'next/navigation'

export function Navbar() {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()

  // Hide navbar on login page
  if (pathname === '/login') return null

  return (
    <nav className="sticky top-0 z-40 w-full bg-[var(--bg-surface)] border-b border-[var(--border)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-[var(--accent-primary)] p-1.5 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-[var(--text-primary)] hidden sm:block">
                EILA PSU
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/forms" icon={<FileText className="h-4 w-4" />}>
                แบบฟอร์ม
              </NavLink>
              <NavLink href="/dashboard" icon={<LayoutIcon className="h-4 w-4" />}>
                แดชบอร์ด
              </NavLink>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            
            {user && (
              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-[var(--border)]">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-sm font-semibold text-[var(--text-primary)] leading-none">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-1">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={() => logout()}
                  className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-red)] hover:bg-[var(--bg-subtle)] rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ href, children, icon }: { href: string; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent-blue)] hover:bg-[var(--bg-subtle)] rounded-xl transition-all"
    >
      {icon}
      {children}
    </Link>
  )
}
