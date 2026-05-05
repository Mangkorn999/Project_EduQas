'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  TrendingUp,
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

type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'muted';
type DisplayStatus = 'done' | 'inprogress' | 'pending';
type DisplayStatusSite = {
  status?: string;
  answered?: number;
};

const EVALUATOR_ROLES: UserRole[] = ['student', 'staff', 'teacher'];
const ADMIN_ROLES: UserRole[] = ['super_admin', 'admin', 'executive'];

const getDisplayStatus = (site: DisplayStatusSite): DisplayStatus => {
  if (
    site.status === 'done' ||
    site.status === 'submitted' ||
    site.status === 'completed' ||
    site.status === 'published'
  ) {
    return 'done';
  }

  if (site.answered && site.answered > 0) {
    return 'inprogress';
  }

  return 'pending';
};

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
        // forms stay as empty array - UI shows empty state
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
  const inProgress = websites.filter((w) => w.status === 'in_progress').length;

  return (
    <DashboardSurface>
      <HeroBanner
        eyebrow="Evaluator console"
        title={greeting}
        subtitle="เว็บไซต์ที่ได้รับมอบหมายให้ประเมิน"
        metric={`${submitted}/${total}`}
        metricLabel="ส่งแบบประเมินแล้ว"
      />

      <section className="grid grid-cols-2 gap-[14px] lg:grid-cols-4" aria-label="Dashboard statistics">
        <StatCard label="ทั้งหมด" value={total} icon={Globe} tone="primary" />
        <StatCard label="กำลังดำเนินการ" value={inProgress} icon={Clock} tone="warning" />
        <StatCard label="ประเมินแล้ว" value={submitted} icon={CheckCircle2} tone="success" />
        <StatCard label="ยังไม่ประเมิน" value={notEvaluated} icon={AlertCircle} tone="danger" />
      </section>

      <EvaluatorTable loading={loading} websites={websites} />
    </DashboardSurface>
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
    <DashboardSurface>
      <HeroBanner
        eyebrow="Admin console"
        title={`สวัสดี, ${name}`}
        subtitle="ภาพรวมการประเมินคุณภาพเว็บไซต์"
        metric={`${stats.completed}/${stats.total}`}
        metricLabel="เสร็จสมบูรณ์"
      />

      <section className="grid grid-cols-2 gap-[14px] lg:grid-cols-4" aria-label="Dashboard statistics">
        <StatCard label="ฟอร์มทั้งหมด" value={stats.total} icon={Globe} tone="primary" />
        <StatCard label="รอการประเมิน" value={stats.waiting} icon={Clock} tone="muted" />
        <StatCard label="กำลังดำเนินการ" value={stats.inProgress} icon={TrendingUp} tone="warning" />
        <StatCard label="เสร็จสมบูรณ์" value={stats.completed} icon={CheckCircle2} tone="success" />
      </section>

      <AdminTable loading={loading} websites={websites} />
    </DashboardSurface>
  );
}

function DashboardSurface({children}: {children: React.ReactNode}) {
  return (
    <div
      className="space-y-6 text-[var(--typeui-text)]"
    >
      {children}
    </div>
  );
}

function HeroBanner({
  eyebrow,
  title,
  subtitle,
  metric,
  metricLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
}) {
  return (
    <header className="typeui-hero relative overflow-hidden rounded-[20px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] px-8 py-8 shadow-[var(--typeui-card-shadow)] sm:px-9">
      <div className="pointer-events-none absolute -right-[50px] -top-[50px] h-[220px] w-[220px] rounded-full bg-[var(--typeui-hero-blob)]" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <p className="typeui-hero-label text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--typeui-label-blue)]">{eyebrow}</p>
          <h1 className="mt-2 text-[32px] font-bold leading-tight tracking-normal text-[var(--typeui-text)]">
            {title}
          </h1>
          <p className="mt-2 text-[14px] font-normal text-[var(--typeui-subtext)]">{subtitle}</p>
        </div>
        <div className="rounded-[18px] border border-[var(--typeui-card-border-soft)] bg-[var(--typeui-card-bg)] px-4 py-3 shadow-[var(--typeui-stat-shadow)]">
          <p className="text-[32px] font-bold leading-none tracking-[-0.04em] text-[var(--typeui-success)]">{metric}</p>
          <p className="mt-1 text-[12px] font-medium text-[var(--typeui-subtext)]">{metricLabel}</p>
        </div>
      </div>
    </header>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  trend,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{className?: string}>;
  tone: StatTone;
  trend?: string;
}) {
  return (
    <article className="rounded-[18px] border border-[var(--typeui-card-border-soft)] bg-[var(--typeui-card-bg)] p-6 shadow-[var(--typeui-stat-shadow)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-[46px] w-[46px] items-center justify-center rounded-[14px]', getToneClasses(tone).icon)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', getToneClasses(tone).badge)}>
            {trend}
          </span>
        )}
      </div>
      <p className="mt-5 text-[36px] font-bold leading-none tracking-[-0.04em] text-[var(--typeui-text)]">{value}</p>
      <p className="mt-2 text-[13px] font-medium text-[var(--typeui-subtext)]">{label}</p>
    </article>
  );
}

function EvaluatorTable({loading, websites}: {loading: boolean; websites: EvaluatorWebsite[]}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] shadow-[var(--typeui-card-shadow)]">
      <TableHeader
        title="เว็บไซต์ที่ต้องประเมิน"
        subtitle={loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} รายการ`}
      />

      {websites.length === 0 && !loading ? (
        <EmptyState title="ยังไม่มีเว็บไซต์ที่ได้รับมอบหมาย" subtitle="รายการประเมินใหม่จะแสดงที่นี่เมื่อมีการมอบหมายงาน" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-[14px] px-6 py-5">
          {websites.map((website) => (
            <EvaluatorWebsiteCard key={website.id} website={website} />
          ))}
        </div>
      )}

      <TableFooter countLabel={`${websites.length} total`} />
    </section>
  );
}

function AdminTable({loading, websites}: {loading: boolean; websites: AdminWebsite[]}) {
  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] shadow-[var(--typeui-card-shadow)]">
      <TableHeader
        title="ภาพรวมเว็บไซต์"
        subtitle={loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} เว็บไซต์`}
      />

      {websites.length === 0 && !loading ? (
        <EmptyState title="ยังไม่มีแบบประเมิน" subtitle="แบบประเมินที่สร้างแล้วจะแสดงในตารางนี้" />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-[14px] px-6 py-5">
          {websites.map((website) => (
            <AdminWebsiteCard key={website.id} website={website} />
          ))}
        </div>
      )}

      <TableFooter countLabel={`${websites.length} total`} />
    </section>
  );
}

function TableHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--typeui-divider)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[15px] font-bold text-[var(--typeui-text)]">{title}</h2>
        <p className="mt-1 text-[12px] font-normal text-[var(--typeui-muted)]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-[10px] border border-[var(--typeui-search-border)] bg-[var(--typeui-header-bg)] px-4 py-2 text-[13px] font-medium text-[var(--typeui-button-text)] transition-colors duration-150 hover:bg-[var(--typeui-search-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--typeui-primary)] motion-reduce:transition-none"
        >
          Filter
        </button>
      </div>
    </div>
  );
}

function EvaluatorWebsiteCard({website}: {website: EvaluatorWebsite}) {
  const href = `/evaluator/${website.id}${website.status === 'submitted' ? '?readonly=true' : ''}`;

  return (
    <article
      data-status={getDisplayStatus(website)}
      className="flex flex-col gap-[14px] rounded-[14px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-5 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--typeui-blue-soft)] text-[var(--typeui-blue)]">
          <Globe className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[var(--typeui-text)]">{website.name}</p>
          <p className="mt-1 truncate text-[12px] text-[var(--typeui-muted)]">{website.url || '-'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-[6px] border border-[var(--typeui-card-border)] bg-[var(--typeui-search-bg)] px-[10px] py-[3px] text-[11px] text-[var(--typeui-subtext)]">
          Evaluation
        </span>
        <span className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--typeui-card-border)] bg-[var(--typeui-search-bg)] px-[10px] py-[3px] text-[11px] text-[var(--typeui-subtext)]">
          <Clock className="h-2.5 w-2.5 text-[var(--typeui-muted)]" />
          -
        </span>
      </div>

      {website.progress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--typeui-muted)]">คะแนน</span>
            <span className={cn('text-[12px] font-bold', getScoreTextColor(website.progress))}>{website.progress}%</span>
          </div>
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-[var(--typeui-card-border)]">
            <div
              className={cn('h-full rounded-full transition-[width] duration-[600ms] ease-in-out', getScoreColor(website.progress))}
              style={{width: `${Math.min(100, website.progress)}%`}}
            />
          </div>
        </div>
      )}

      <div className="px-0 pb-0 pt-0">
        <Link
          href={href}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-0 bg-[linear-gradient(135deg,var(--typeui-primary)_0%,#1e7cd8_100%)] py-[13px] text-[14px] font-extrabold tracking-[0.01em] text-white shadow-[0_4px_18px_rgba(12,92,171,0.35)] transition-[opacity,transform] duration-150 hover:-translate-y-px hover:opacity-[0.88]"
        >
          <ExternalLink className="h-[15px] w-[15px] stroke-[2.5]" />
          เริ่มประเมิน
        </Link>
      </div>
    </article>
  );
}

function AdminWebsiteCard({website}: {website: AdminWebsite}) {
  const progress = website.totalEvaluators > 0
    ? Math.round((website.submitted / website.totalEvaluators) * 100)
    : 0;

  return (
    <article
      data-status={getDisplayStatus(website)}
      className="flex flex-col gap-[14px] rounded-[14px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-5 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] motion-reduce:transform-none motion-reduce:transition-none"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[12px] bg-[var(--typeui-blue-soft)] text-[var(--typeui-blue)]">
          <Globe className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[var(--typeui-text)]">{website.name}</p>
          <p className="mt-1 truncate text-[12px] text-[var(--typeui-muted)]">{website.url || '-'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-[6px] border border-[var(--typeui-card-border)] bg-[var(--typeui-search-bg)] px-[10px] py-[3px] text-[11px] text-[var(--typeui-subtext)]">
          Form
        </span>
        <span className="inline-flex items-center gap-1 rounded-[6px] border border-[var(--typeui-card-border)] bg-[var(--typeui-search-bg)] px-[10px] py-[3px] text-[11px] text-[var(--typeui-subtext)]">
          <Clock className="h-2.5 w-2.5 text-[var(--typeui-muted)]" />
          -
        </span>
      </div>

      {progress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--typeui-muted)]">คะแนน</span>
            <span className={cn('text-[12px] font-bold', getScoreTextColor(progress))}>{progress}%</span>
          </div>
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-[var(--typeui-card-border)]">
            <div
              className={cn('h-full rounded-full transition-[width] duration-[600ms] ease-in-out', getScoreColor(progress))}
              style={{width: `${Math.min(100, progress)}%`}}
            />
          </div>
        </div>
      )}

      <div className="px-0 pb-0 pt-0">
        <Link
          href="/forms"
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-0 bg-[linear-gradient(135deg,var(--typeui-primary)_0%,#1e7cd8_100%)] py-[13px] text-[14px] font-extrabold tracking-[0.01em] text-white shadow-[0_4px_18px_rgba(12,92,171,0.35)] transition-[opacity,transform] duration-150 hover:-translate-y-px hover:opacity-[0.88]"
        >
          <ExternalLink className="h-[15px] w-[15px] stroke-[2.5]" />
          เริ่มประเมิน
        </Link>
      </div>
    </article>
  );
}

function EmptyState({title, subtitle}: {title: string; subtitle: string}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--typeui-search-bg)] text-[var(--typeui-subtext)]">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-[14px] font-semibold text-[var(--typeui-text)]">{title}</h3>
      <p className="mt-2 max-w-sm text-[12px] font-normal text-[var(--typeui-subtext)]">{subtitle}</p>
    </div>
  );
}

function TableFooter({countLabel}: {countLabel: string}) {
  return (
    <footer className="flex flex-col gap-3 border-t border-[var(--typeui-divider)] px-6 py-[14px] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-medium text-[var(--typeui-muted)]">{countLabel}</p>
      <div className="flex items-center gap-2">
        {['All', 'Active', 'Complete'].map((tab) => (
          <span
            key={tab}
            className={cn(
              'rounded-[8px] px-3 py-[5px] text-[12px] font-medium transition-colors duration-150 motion-reduce:transition-none',
              'bg-[var(--typeui-search-bg)] text-[var(--typeui-subtext)] hover:bg-[var(--typeui-primary-soft)] hover:text-[var(--typeui-primary)]'
            )}
          >
            {tab}
          </span>
        ))}
      </div>
    </footer>
  );
}

function getToneClasses(tone: StatTone) {
  const tones = {
    primary: {
      icon: 'bg-[var(--typeui-blue-soft)] text-[var(--typeui-blue)]',
      badge: 'bg-[var(--typeui-blue-soft)] text-[var(--typeui-blue)]',
    },
    success: {
      icon: 'bg-[var(--typeui-success-soft)] text-[var(--typeui-success)]',
      badge: 'bg-[var(--typeui-success-soft)] text-[var(--typeui-success-text)]',
    },
    warning: {
      icon: 'bg-[var(--typeui-warning-soft)] text-[var(--typeui-warning)]',
      badge: 'bg-[var(--typeui-warning-soft)] text-[var(--typeui-warning-text)]',
    },
    danger: {
      icon: 'bg-[var(--typeui-danger-soft)] text-[var(--typeui-danger)]',
      badge: 'bg-[var(--typeui-danger-soft)] text-[var(--typeui-danger-text)]',
    },
    muted: {
      icon: 'bg-[var(--typeui-danger-soft)] text-[var(--typeui-danger)]',
      badge: 'bg-[var(--typeui-danger-soft)] text-[var(--typeui-danger-text)]',
    },
  };

  return tones[tone];
}

function getScoreColor(score: number) {
  if (score >= 80) return 'bg-[var(--typeui-success)]';
  if (score >= 50) return 'bg-[var(--typeui-warning)]';
  return 'bg-[var(--typeui-danger)]';
}

function getScoreTextColor(score: number) {
  if (score >= 80) return 'text-[var(--typeui-success)]';
  if (score >= 50) return 'text-[var(--typeui-warning)]';
  return 'text-[var(--typeui-danger)]';
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
