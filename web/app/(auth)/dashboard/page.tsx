'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe,
  Hourglass,
  type LucideIcon,
} from 'lucide-react';
import {useAuthStore} from '@/lib/stores/authStore';
import {apiGet} from '@/lib/api';
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

type PendingReview = {
  id: string;
  evaluatorName: string;
  websiteName: string;
  submittedAt: string;
};

const EVALUATOR_ROLES: UserRole[] = ['student', 'staff', 'teacher'];
const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'executive'];

const mockEvaluatorWebsites: EvaluatorWebsite[] = [
  {
    id: 'assigned-1',
    name: 'EILA PSU Portal',
    url: 'https://eila.psu.ac.th',
    progress: 0,
    status: 'not_started',
  },
  {
    id: 'assigned-2',
    name: 'Faculty of Science',
    url: 'https://science.psu.ac.th',
    progress: 58,
    status: 'in_progress',
  },
  {
    id: 'assigned-3',
    name: 'Academic Service Center',
    url: 'https://academic.psu.ac.th',
    progress: 100,
    status: 'submitted',
  },
];

const mockAdminWebsites: AdminWebsite[] = [
  {
    id: 'overview-1',
    name: 'EILA PSU Portal',
    url: 'https://eila.psu.ac.th',
    submitted: 18,
    totalEvaluators: 24,
    status: 'in_progress',
  },
  {
    id: 'overview-2',
    name: 'Faculty of Engineering',
    url: 'https://engineer.psu.ac.th',
    submitted: 0,
    totalEvaluators: 12,
    status: 'waiting',
  },
  {
    id: 'overview-3',
    name: 'Prince of Songkla University',
    url: 'https://www.psu.ac.th',
    submitted: 32,
    totalEvaluators: 32,
    status: 'published',
  },
];

const mockPendingReviews: PendingReview[] = [
  {
    id: 'review-1',
    evaluatorName: 'ภคสิน ประจวบสุข',
    websiteName: 'EILA PSU Portal',
    submittedAt: '1 พ.ค. 2569',
  },
  {
    id: 'review-2',
    evaluatorName: 'สมชาย รักไทย',
    websiteName: 'Faculty of Science',
    submittedAt: '30 เม.ย. 2569',
  },
];

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
      } catch (err) {
        console.error('Failed to fetch forms for dashboard', err);
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
        websites={adminWebsites.length > 0 ? adminWebsites : mockAdminWebsites}
        pendingReviews={mockPendingReviews}
      />
    );
  }

  return (
    <EvaluatorDashboard
      greeting={t('dashboard.greeting', {name: user?.name || 'EILA'})}
      loading={loading}
      websites={evaluatorWebsites.length > 0 ? evaluatorWebsites : mockEvaluatorWebsites}
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
  const stats = {
    notStarted: websites.filter((website) => website.status === 'not_started').length,
    inProgress: websites.filter((website) => website.status === 'in_progress').length,
    submitted: websites.filter((website) => website.status === 'submitted').length,
  };

  return (
    <div className="space-y-6">
      <DashboardHeader greeting={greeting} subtitle="เว็บไซต์ที่ได้รับมอบหมายให้ประเมิน" />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={Clock3} label="ยังไม่เริ่ม" value={stats.notStarted} tone="gray" />
        <StatCard icon={Hourglass} label="กำลังดำเนินการ" value={stats.inProgress} tone="amber" />
        <StatCard icon={CheckCircle2} label="ส่งแล้ว" value={stats.submitted} tone="green" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#00D9FF]/20 bg-white/80 shadow-[0_8px_32px_rgba(0,29,89,0.12)] backdrop-blur-xl transition-colors duration-300 dark:bg-[#111827]/80 dark:border-[#374151]/50">
        <SectionHeader title="เว็บไซต์ที่ต้องประเมิน" description={loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} รายการ`} />
        <div className="grid grid-cols-1 divide-y divide-[#00D9FF]/10 dark:divide-[#374151]/50">
          {websites.map((website) => (
            <EvaluatorWebsiteRow key={website.id} website={website} />
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminDashboard({
  name,
  loading,
  websites,
  pendingReviews,
}: {
  name: string;
  loading: boolean;
  websites: AdminWebsite[];
  pendingReviews: PendingReview[];
}) {
  const stats = {
    total: websites.length,
    waiting: websites.filter((website) => website.status === 'waiting').length,
    inProgress: websites.filter((website) => website.status === 'in_progress').length,
    completed: websites.filter((website) => website.status === 'completed' || website.status === 'published').length,
  };

  return (
    <div className="space-y-6">
      <DashboardHeader greeting={`สวัสดี, ${name}`} subtitle="ภาพรวมการประเมินคุณภาพเว็บไซต์" />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Globe} label="เว็บไซต์ทั้งหมด" value={stats.total} tone="blue" />
        <StatCard icon={Clock3} label="รอการประเมิน" value={stats.waiting} tone="gray" />
        <StatCard icon={Hourglass} label="กำลังดำเนินการ" value={stats.inProgress} tone="amber" />
        <StatCard icon={CheckCircle2} label="เสร็จสมบูรณ์" value={stats.completed} tone="green" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#00D9FF]/20 bg-white/80 shadow-[0_8px_32px_rgba(0,29,89,0.12)] backdrop-blur-xl transition-colors duration-300 dark:bg-[#111827]/80 dark:border-[#374151]/50">
        <SectionHeader title="ภาพรวมเว็บไซต์" description={loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} เว็บไซต์`} />
        <div className="grid grid-cols-1 divide-y divide-[#00D9FF]/10 dark:divide-[#374151]/50">
          {websites.map((website) => (
            <AdminWebsiteRow key={website.id} website={website} />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[#7C3AED]/20 bg-white/80 shadow-[0_8px_32px_rgba(124,58,237,0.12)] backdrop-blur-xl transition-colors duration-300 dark:bg-[#111827]/80 dark:border-[#374151]/50">
        <SectionHeader title="รอการตรวจสอบ" description={`${pendingReviews.length} รายการที่ส่งแล้ว`} />
        <div className="grid grid-cols-1 divide-y divide-[#7C3AED]/10 dark:divide-[#374151]/50">
          {pendingReviews.map((review) => (
            <article key={review.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_160px_auto] md:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0C0A09] dark:text-[#F9FAFB]">{review.evaluatorName}</p>
                <p className="mt-1 truncate text-sm text-[#78716C] dark:text-[#9CA3AF]">{review.websiteName}</p>
              </div>
              <p className="text-sm text-[#78716C] dark:text-[#9CA3AF]">{review.submittedAt}</p>
              <Link
                href="/evaluator"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#00D9FF] px-4 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_8px_22px_rgba(124,58,237,0.35)] hover:scale-[1.02]"
              >
                ตรวจสอบ
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function DashboardHeader({greeting, subtitle}: {greeting: string; subtitle: string}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#001d59] via-[#7C3AED] to-[#00D9FF] p-6 shadow-[0_8px_32px_rgba(0,29,89,0.18)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] bg-[size:28px_28px] opacity-20" />
      <div className="relative">
        <h1 className="font-[var(--font-heading)] text-[28px] font-semibold leading-tight text-white">
          {greeting}
        </h1>
        <p className="mt-2 text-sm text-white/80">{subtitle}</p>
      </div>
    </section>
  );
}

function SectionHeader({title, description}: {title: string; description: string}) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#00D9FF]/10 px-5 py-4 sm:flex-row sm:items-end sm:justify-between dark:border-[#374151]/50">
      <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[#0C0A09] dark:text-[#F9FAFB]">{title}</h2>
      <p className="text-sm text-[#78716C] dark:text-[#9CA3AF]">{description}</p>
    </div>
  );
}

function EvaluatorWebsiteRow({website}: {website: EvaluatorWebsite}) {
  const action = getEvaluatorAction(website.status);
  const href = `/evaluator/${website.id}${website.status === 'submitted' ? '?readonly=true' : ''}`;

  return (
    <article className="grid gap-4 px-5 py-5 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,217,255,0.15)] hover:scale-[1.01] lg:grid-cols-[1fr_220px_140px_150px] lg:items-center">
      <WebsiteIdentity name={website.name} url={website.url} />
      <ProgressBlock label="ความคืบหน้า" value={website.progress} />
      <EvaluatorStatusBadge status={website.status} />
      <Link href={href} className={action.className}>
        {action.label}
      </Link>
    </article>
  );
}

function AdminWebsiteRow({website}: {website: AdminWebsite}) {
  const progress = Math.round((website.submitted / website.totalEvaluators) * 100);

  return (
    <article className="grid gap-4 px-5 py-5 transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,217,255,0.15)] hover:scale-[1.01] lg:grid-cols-[1fr_260px_120px_130px] lg:items-center">
      <WebsiteIdentity name={website.name} url={website.url} />
      <div>
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#78716C]">
          <span>
            {website.submitted}/{website.totalEvaluators} ผู้ประเมินส่งแล้ว
          </span>
          <span>{progress}%</span>
        </div>
        <ProgressBar value={progress} />
      </div>
      <AdminStatusBadge status={website.status} />
      <Link
        href="/forms"
        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#00D9FF]/30 bg-white/50 px-4 text-sm font-semibold text-[#001d59] transition-all duration-300 hover:bg-[#00D9FF]/10 hover:shadow-[0_6px_18px_rgba(0,217,255,0.2)]"
      >
        ดูรายละเอียด
      </Link>
    </article>
  );
}

function WebsiteIdentity({name, url}: {name: string; url: string}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D9FF] to-[#7C3AED] text-white shadow-[0_4px_14px_rgba(0,217,255,0.3)]">
        <Globe className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-[#0C0A09] dark:text-[#F9FAFB]">{name}</h3>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-[#78716C] transition-colors hover:text-[#7C3AED] dark:text-[#9CA3AF] dark:hover:text-[#00D9FF]"
        >
          <span className="truncate">{url}</span>
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>
    </div>
  );
}

function ProgressBlock({label, value}: {label: string; value: number}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-[#78716C] dark:text-[#9CA3AF]">
        <span>{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <ProgressBar value={value} />
    </div>
  );
}

function ProgressBar({value}: {value: number}) {
  return (
    <div className="h-2.5 rounded-full bg-[#00D9FF]/15 dark:bg-[#374151]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#00D9FF] to-[#7C3AED] transition-all duration-500"
        style={{width: `${Math.min(100, Math.max(0, value))}%`}}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: 'gray' | 'amber' | 'green' | 'blue';
}) {
  const gradients = {
    gray: 'from-gray-500 to-gray-600',
    amber: 'from-amber-400 to-orange-500',
    green: 'from-emerald-400 to-green-500',
    blue: 'from-[#00D9FF] to-[#7C3AED]',
  };

  const shadows = {
    gray: 'shadow-[0_8px_22px_rgba(107,114,128,0.2)]',
    amber: 'shadow-[0_8px_22px_rgba(245,158,11,0.25)]',
    green: 'shadow-[0_8px_22px_rgba(16,185,129,0.25)]',
    blue: 'shadow-[0_8px_22px_rgba(0,217,255,0.25)]',
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/80 p-5 shadow-[0_8px_32px_rgba(0,29,89,0.1)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_40px_rgba(0,29,89,0.15)] dark:bg-[#111827]/80 dark:border-[#374151]/50">
      <div className="mb-5 flex items-center justify-between">
        <span className={`inline-flex rounded-full bg-gradient-to-r ${gradients[tone]} px-3 py-1 text-xs font-semibold text-white shadow-md`}>
          {label}
        </span>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradients[tone]} ${shadows[tone]}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-3xl font-semibold text-[#0C0A09] transition-all duration-300 group-hover:scale-110 dark:text-[#F9FAFB]">{value}</p>
    </div>
  );
}

function EvaluatorStatusBadge({status}: {status: EvaluationStatus}) {
  const config = {
    not_started: {label: 'ยังไม่เริ่ม', gradient: 'from-gray-400 to-gray-500'},
    in_progress: {label: 'กำลังดำเนินการ', gradient: 'from-amber-400 to-orange-500'},
    submitted: {label: 'ส่งแล้ว', gradient: 'from-emerald-400 to-green-500'},
  }[status];

  return (
    <span className={`inline-flex w-fit items-center rounded-full bg-gradient-to-r ${config.gradient} px-3 py-1 text-xs font-semibold text-white shadow-md`}>
      {config.label}
    </span>
  );
}

function AdminStatusBadge({status}: {status: AdminWebsiteStatus}) {
  const config = {
    waiting: {label: 'รอ', gradient: 'from-gray-400 to-gray-500'},
    in_progress: {label: 'กำลังทำ', gradient: 'from-amber-400 to-orange-500'},
    completed: {label: 'เสร็จ', gradient: 'from-emerald-400 to-green-500'},
    published: {label: 'เผยแพร่แล้ว', gradient: 'from-[#00D9FF] to-[#7C3AED]'},
  }[status];

  return (
    <span className={`inline-flex w-fit items-center rounded-full bg-gradient-to-r ${config.gradient} px-3 py-1 text-xs font-semibold text-white shadow-md`}>
      {config.label}
    </span>
  );
}

function getEvaluatorAction(status: EvaluationStatus) {
  if (status === 'not_started') {
    return {
      label: 'เริ่มประเมิน',
      className:
        'inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#7C3AED] px-4 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_8px_22px_rgba(0,217,255,0.35)] hover:scale-[1.02]',
    };
  }

  if (status === 'in_progress') {
    return {
      label: 'ดำเนินการต่อ',
      className:
        'inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#001d59] px-4 text-sm font-semibold text-white transition-all duration-300 hover:shadow-[0_8px_22px_rgba(124,58,237,0.35)] hover:scale-[1.02]',
    };
  }

  return {
    label: 'ดูผลการประเมิน',
    className:
      'inline-flex h-10 items-center justify-center rounded-xl border border-[#00D9FF]/30 bg-white/50 px-4 text-sm font-semibold text-[#001d59] transition-all duration-300 hover:bg-[#00D9FF]/10 hover:shadow-[0_6px_18px_rgba(0,217,255,0.2)]',
  };
}

function mapFormsToEvaluatorWebsites(forms: DashboardForm[]): EvaluatorWebsite[] {
  return forms
    .filter((form) => form.websiteUrl || form.websiteName || form.title)
    .map((form, index) => {
      const status = form.status === 'closed' ? 'submitted' : form.status === 'open' ? 'in_progress' : 'not_started';
      return {
        id: form.id || `form-${index}`,
        name: form.websiteName || form.title || `เว็บไซต์ที่ ${index + 1}`,
        url: form.websiteUrl || 'https://www.psu.ac.th',
        progress: status === 'submitted' ? 100 : status === 'in_progress' ? 52 : 0,
        status,
      };
    });
}

function mapFormsToAdminWebsites(forms: DashboardForm[]): AdminWebsite[] {
  return forms
    .filter((form) => form.websiteUrl || form.websiteName || form.title)
    .map((form, index) => {
      const status = form.status === 'closed' ? 'completed' : form.status === 'open' ? 'in_progress' : 'waiting';
      const submitted = status === 'completed' ? 12 : status === 'in_progress' ? 7 : 0;
      const totalEvaluators = 12;

      return {
        id: form.id || `form-${index}`,
        name: form.websiteName || form.title || `เว็บไซต์ที่ ${index + 1}`,
        url: form.websiteUrl || 'https://www.psu.ac.th',
        submitted,
        totalEvaluators,
        status,
      };
    });
}
