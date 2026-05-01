'use client';

<<<<<<< HEAD
import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-on-surface">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
        <button
          onClick={() => router.push('/evaluator')}
          className="flex items-center gap-2 text-sm font-bold text-psu-navy hover:bg-gray-100 px-4 py-2 rounded-lg transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </button>

        <div className="flex items-center gap-6">
          <button className="p-2.5 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 relative transition-all">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-100 cursor-pointer hover:bg-gray-50 py-1.5 px-2 rounded-lg transition-all">
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
          </div>
        </div>
      </header>

      <main className="p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-psu-navy overflow-hidden border-2 border-psu-gold shadow-sm shrink-0">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Profile"
              />
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-psu-navy">สมชาย รักไทย</div>
              <div className="text-sm text-gray-500 mt-1">คณะวิศวกรรมศาสตร์</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

=======
import {useLocale, useTranslations} from 'next-intl';
import {useRouter} from 'next/navigation';
import {LogOut, Mail, User} from 'lucide-react';
import {useState} from 'react';
import {useAuthStore} from '@/lib/stores/authStore';
import {cn} from '@/lib/utils';
import {getAvailableRoles, getRoleLabel} from '@/lib/roles';
import type {UserRole} from '@/lib/permissions';

export default function ProfilePage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const {user, setUserRole, logout} = useAuthStore();
  const [changingRole, setChangingRole] = useState<UserRole | null>(null);

  if (!user) return null;

  const activeRole = user.role as UserRole;
  const availableRoles = getAvailableRoles(user.roles);

  const switchRole = async (role: UserRole) => {
    if (role === activeRole || changingRole) return;
    try {
      setChangingRole(role);
      await setUserRole(role);
      window.location.reload();
    } catch (err) {
      console.error('[Profile] Role change exception:', err);
      alert(t('profile.roleChangeError'));
    } finally {
      setChangingRole(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 font-prompt">
      <section>
        <h1 className="text-[28px] font-semibold leading-tight text-[#0b1c30]">{t('profile.title')}</h1>
        <p className="mt-2 text-sm text-[#444652]">{t('profile.subtitle')}</p>
      </section>

      <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[#003087] text-white ring-4 ring-[#e5eeff]">
            <User className="h-9 w-9" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold text-[#0b1c30]">{user.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#444652]">
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {user.email || user.faculty || t('profile.noFaculty')}
              </span>
              <span className="inline-flex rounded-full border-2 border-[#003087] bg-[#e5eeff] px-3 py-1 text-xs font-semibold text-[#001d59]">
                {getRoleLabel(activeRole, locale)}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#FFD700] px-4 py-2.5 text-sm font-semibold text-[#001d59] shadow-sm transition-colors hover:bg-[#F59E0B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003087] focus-visible:ring-offset-2"
          >
            <LogOut className="h-4 w-4" />
            {t('nav.logout')}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-[#CBD5E1] bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-[#0b1c30]">{t('profile.switchRole')}</h2>
          <p className="mt-1 text-sm text-[#444652]">{t('profile.roleHelp')}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {availableRoles.map((role) => {
            const active = activeRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => switchRole(role)}
                disabled={changingRole !== null}
                className={cn(
                  'min-h-12 rounded-xl px-4 py-3 text-left text-sm transition-colors cursor-pointer',
                  active
                    ? 'border-2 border-[#003087] bg-[#e5eeff] font-semibold text-[#001d59]'
                    : 'border border-[#CBD5E1] bg-white text-[#444652] hover:bg-gray-50',
                  changingRole === role && 'opacity-70'
                )}
              >
                {getRoleLabel(role, locale)}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
>>>>>>> feature/ux-login-role-test
