'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {
  ChevronRight,
  Globe,
} from 'lucide-react';
import {useAuthStore} from '@/lib/stores/authStore';
import {apiGet} from '@/lib/api';
import {cn} from '@/lib/utils';
import type {UserRole} from '@/lib/permissions';

type DashboardForm = {
  id: string;
  title?: string;
  status?: 'draft' | 'open' | 'closed' | string;
  websiteName?: string;
  websiteUrl?: string;
  updatedAt?: string;
};

type EvaluationStatus = 'not_started' | 'in_progress' | 'submitted';
type AdminWebsiteStatus = 'waiting' | 'in_progress' | 'completed' | 'published';

type EvaluatorWebsite = {
  id: string;
  name: string;
  url: string;
  progress: number;
  status: EvaluationStatus;
};

type AdminWebsite = {
  id: string;
  name: string;
  url: string;
  submitted: number;
  totalEvaluators: number;
  status: AdminWebsiteStatus;
};


const EVALUATOR_ROLES: UserRole[] = ['student', 'staff', 'teacher'];
const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'executive'];


export default function DashboardPage() {
  const t = useTranslations();
  const {user} = useAuthStore();
  const [forms, setForms] = useState<DashboardForm[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        const res = await apiGet('/api/v1/forms');
        setForms(res.data || []);
      } catch {
        // forms stay as empty array — UI shows empty state
      } finally {
        setLoading(false);
      }
    };

    fetchForms();
  }, []);

  const role = user?.role as UserRole | undefined;
  const isAdmin = role ? ADMIN_ROLES.includes(role) : false;
  const isEvaluator = role ? EVALUATOR_ROLES.includes(role) : true;

  const evaluatorWebsites = useMemo(() => mapFormsToEvaluatorWebsites(forms), [forms]);
  const adminWebsites = useMemo(() => mapFormsToAdminWebsites(forms), [forms]);

  if (isAdmin && !isEvaluator) {
    return (
      <AdminDashboard
        name={user?.name || 'EILA'}
        loading={loading}
        websites={adminWebsites}
      />
    );
  }

  return (
    <EvaluatorDashboard
      greeting={t('dashboard.greeting', {name: user?.name || 'EILA'})}
      loading={loading}
      websites={evaluatorWebsites}
    />
  );
}

function EvaluatorDashboard({
  greeting,
  loading,
  websites,
}: {
  greeting: string;
  loading: boolean;
  websites: EvaluatorWebsite[];
}) {
  const total = websites.length;
  const submitted = websites.filter((w) => w.status === 'submitted').length;
  const notEvaluated = websites.filter((w) => w.status !== 'submitted').length;

  return (
    <div className="space-y-8">
      <DashboardHeader greeting={greeting} subtitle="เว็บไซต์ที่ได้รับมอบหมายให้ประเมิน" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="ทั้งหมด" value={total} tone="navy" />
        <StatCard label="ประเมินแล้ว" value={submitted} tone="green" />
        <StatCard label="ยังไม่ประเมิน" value={notEvaluated} tone="red" />
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <SectionHeader title="เว็บไซต์ที่ต้องประเมิน" description={loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} รายการ`} />
        {websites.length === 0 && !loading ? (
          <p className="px-5 py-10 text-center text-sm text-[#64748B]">ยังไม่มีเว็บไซต์ที่ได้รับมอบหมาย</p>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {websites.map((website) => (
              <EvaluatorWebsiteRow key={website.id} website={website} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AdminDashboard({
  name,
  loading,
  websites,
}: {
  name: string;
  loading: boolean;
  websites: AdminWebsite[];
}) {
  const stats = {
    total: websites.length,
    waiting: websites.filter((website) => website.status === 'waiting').length,
    inProgress: websites.filter((website) => website.status === 'in_progress').length,
    completed: websites.filter((website) => website.status === 'completed' || website.status === 'published').length,
  };

  return (
    <div className="space-y-8">
      <DashboardHeader greeting={`สวัสดี, ${name}`} subtitle="ภาพรวมการประเมินคุณภาพเว็บไซต์" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ฟอร์มทั้งหมด" value={stats.total} tone="navy" />
        <StatCard label="รอการประเมิน" value={stats.waiting} tone="gray" />
        <StatCard label="กำลังดำเนินการ" value={stats.inProgress} tone="amber" />
        <StatCard label="เสร็จสมบูรณ์" value={stats.completed} tone="green" />
      </section>

      <section className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm">
        <SectionHeader title="ภาพรวมเว็บไซต์" description={loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} เว็บไซต์`} />
        {websites.length === 0 && !loading ? (
          <p className="px-5 py-10 text-center text-sm text-[#64748B]">ยังไม่มีแบบประเมิน</p>
        ) : (
          <div className="divide-y divide-[#E2E8F0]">
            {websites.map((website) => (
              <AdminWebsiteRow key={website.id} website={website} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DashboardHeader({greeting, subtitle}: {greeting: string; subtitle: string}) {
  return (
    <section>
      <h1 className="text-2xl font-bold text-[#1B2D5B]">{greeting}</h1>
      <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
    </section>
  );
}

function SectionHeader({title, description}: {title: string; description: string}) {
  return (
    <div className="flex items-center justify-between border-b border-[#E2E8F0] px-5 py-4">
      <h2 className="text-base font-bold text-[#1B2D5B]">{title}</h2>
      <p className="text-sm text-[#64748B]">{description}</p>
    </div>
  );
}

function EvaluatorWebsiteRow({website}: {website: EvaluatorWebsite}) {
  const href = `/evaluator/${website.id}${website.status === 'submitted' ? '?readonly=true' : ''}`;

  return (
    <Link
      href={href}
      className="flex items-center justify-between px-5 py-4 transition-colors hover:bg-[#F8FAFC]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1B2D5B]">
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1A202C]">{website.name}</p>
          <p className="truncate text-xs text-[#64748B]">{website.url}</p>
        </div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3">
        <EvaluatorStatusBadge status={website.status} />
        <ChevronRight className="h-4 w-4 text-[#94A3B8]" />
      </div>
    </Link>
  );
}

function AdminWebsiteRow({website}: {website: AdminWebsite}) {
  const progress = website.totalEvaluators > 0
    ? Math.round((website.submitted / website.totalEvaluators) * 100)
    : 0;

  return (
    <div className="flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1B2D5B]">
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1A202C]">{website.name}</p>
          <p className="truncate text-xs text-[#64748B]">{website.url}</p>
        </div>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-4">
        <div className="hidden w-32 sm:block">
          <div className="mb-1 flex justify-between text-xs text-[#64748B]">
            <span>{website.submitted}/{website.totalEvaluators}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[#E2E8F0]">
            <div className="h-full rounded-full bg-[#1B2D5B]" style={{width: `${Math.min(100, progress)}%`}} />
          </div>
        </div>
        <AdminStatusBadge status={website.status} />
        <Link
          href="/forms"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-[#1B2D5B] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#2D5FA6]"
        >
          จัดการ
        </Link>
      </div>
    </div>
  );
}


function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'navy' | 'green' | 'red' | 'amber' | 'gray';
}) {
  const styles: Record<typeof tone, string> = {
    navy:  'bg-[#1B2D5B] text-white',
    green: 'bg-[#16A34A] text-white',
    red:   'bg-[#DC2626] text-white',
    amber: 'bg-amber-500 text-white',
    gray:  'bg-[#F1F5F9] text-[#1A202C]',
  };

  return (
    <div className={cn('rounded-xl p-6 shadow-sm', styles[tone])}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
    </div>
  );
}

function EvaluatorStatusBadge({status}: {status: EvaluationStatus}) {
  const config = {
    not_started: {label: 'ยังไม่เริ่ม', className: 'bg-gray-100 text-gray-700'},
    in_progress: {label: 'กำลังดำเนินการ', className: 'bg-amber-100 text-amber-700'},
    submitted: {label: 'ส่งแล้ว', className: 'bg-green-100 text-green-700'},
  }[status];

  return <span className={cn('w-fit rounded-full px-3 py-1 text-xs font-semibold', config.className)}>{config.label}</span>;
}

function AdminStatusBadge({status}: {status: AdminWebsiteStatus}) {
  const config = {
    waiting: {label: 'รอ', className: 'bg-gray-100 text-gray-700'},
    in_progress: {label: 'กำลังทำ', className: 'bg-amber-100 text-amber-700'},
    completed: {label: 'เสร็จ', className: 'bg-green-100 text-green-700'},
    published: {label: 'เผยแพร่แล้ว', className: 'bg-blue-100 text-blue-700'},
  }[status];

  return <span className={cn('w-fit rounded-full px-3 py-1 text-xs font-semibold', config.className)}>{config.label}</span>;
}


function mapFormsToEvaluatorWebsites(forms: DashboardForm[]): EvaluatorWebsite[] {
  return forms
    .filter((form) => form.websiteUrl || form.websiteName || form.title)
    .map((form) => {
      // progress will be fetched per-form once assignment API returns submittedCount
      const status = form.status === 'closed' ? 'submitted' : form.status === 'open' ? 'in_progress' : 'not_started';
      return {
        id: form.id,
        name: form.websiteName || form.title || 'ไม่ระบุชื่อ',
        url: form.websiteUrl || '',
        progress: status === 'submitted' ? 100 : 0,
        status,
      };
    });
}

function mapFormsToAdminWebsites(forms: DashboardForm[]): AdminWebsite[] {
  return forms
    .filter((form) => form.websiteUrl || form.websiteName || form.title)
    .map((form) => {
      // submitted/totalEvaluators will come from assignment API once connected
      const status = form.status === 'closed' ? 'completed' : form.status === 'open' ? 'in_progress' : 'waiting';
      return {
        id: form.id,
        name: form.websiteName || form.title || 'ไม่ระบุชื่อ',
        url: form.websiteUrl || '',
        submitted: 0,
        totalEvaluators: 0,
        status,
      };
    });
}
