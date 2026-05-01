'use client';

<<<<<<< HEAD
import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';

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

        <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
          <span className="hidden md:inline">Notifications</span>
        </div>

        <button className="p-2.5 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 relative transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      <main className="p-8 max-w-4xl mx-auto" />
    </div>
  );
}

=======
import {useTranslations} from 'next-intl';
import {CheckCircle2, Clock3, FileText} from 'lucide-react';
import {cn} from '@/lib/utils';

const notifications = [
  {
    id: 1,
    title: 'แบบฟอร์มประเมินเว็บไซต์รอบล่าสุดพร้อมใช้งาน',
    detail: 'มีแบบฟอร์มใหม่สำหรับการประเมินคุณภาพเว็บไซต์ประจำรอบปัจจุบัน',
    time: '10:30',
    unread: true,
    icon: FileText,
  },
  {
    id: 2,
    title: 'รายการประเมินกำลังพิจารณา',
    detail: 'ผลการประเมินบางส่วนถูกส่งต่อให้ผู้ดูแลตรวจสอบแล้ว',
    time: 'เมื่อวาน',
    unread: true,
    icon: Clock3,
  },
  {
    id: 3,
    title: 'การประเมินเสร็จสมบูรณ์',
    detail: 'ระบบบันทึกผลการประเมินและจัดเก็บประวัติเรียบร้อยแล้ว',
    time: '29 เม.ย.',
    unread: false,
    icon: CheckCircle2,
  },
];

export default function NotificationsPage() {
  const t = useTranslations();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">{t('notifications.title')}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{t('notifications.subtitle')}</p>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
        <div className="relative space-y-0">
          <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-px bg-[var(--border)]" />
          {notifications.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.id} className="relative grid grid-cols-[2.5rem_1fr] gap-4 pb-6 last:pb-0">
                <div
                  className={cn(
                    'z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-[var(--bg-surface)]',
                    item.unread ? 'border-[#CA8A04] text-[#CA8A04]' : 'border-[var(--border)] text-[var(--text-muted)]'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className={cn('rounded-xl border p-4', item.unread ? 'border-amber-200 bg-amber-50/70 dark:bg-amber-950/10' : 'border-[var(--border)] bg-[var(--bg-surface)]')}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[var(--text-muted)]">{item.time}</span>
                  </div>
                  <span
                    className={cn(
                      'mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
                      item.unread ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                    )}
                  >
                    {item.unread ? t('notifications.unread') : t('notifications.read')}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
>>>>>>> feature/ux-login-role-test
