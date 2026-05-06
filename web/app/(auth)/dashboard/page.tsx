'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState, useRef} from 'react';
import {useTranslations} from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  TrendingUp,
  Search,
  CalendarDays,
  Users,
  BarChart3,
  FileText,
  ArrowRight,
  PlusCircle,
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
  hasSubmitted?: boolean;
  hasOpenedWebsite?: boolean;
};

type DashboardOverview = {
  totalWebsites: number;
  evaluatedWebsites: number;
  totalResponses: number;
  averageScore: number | null;
  pendingForms: number;
  completionByRole?: Record<string, number>;
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

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const startTime = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current!);
  }, [target, duration]);
  return count;
}

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
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const role = user?.role as UserRole | undefined;
  const isSuperAdminOrAdmin = role === 'super_admin' || role === 'admin';
  const isExecutive = role === 'executive';
  const isAdmin = isSuperAdminOrAdmin || isExecutive;
  const isEvaluator = role ? EVALUATOR_ROLES.includes(role) : true;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Always fetch forms for table data
        const formsRes = await apiGet('/api/v1/forms');
        setForms(formsRes.data || []);

        // For admins, also fetch real dashboard stats via active round
        if (isAdmin) {
          try {
            const roundsRes = await apiGet('/api/v1/rounds?status=active');
            const activeRound = (roundsRes.data || [])[0];
            if (activeRound?.id) {
              const ovRes = await apiGet(`/api/v1/dashboard/overview?roundId=${activeRound.id}`);
              setOverview(ovRes.data ?? null);
            }
          } catch {
            // overview stays null — stat cards fall back to form-derived counts
          }
        }
      } catch {
        // forms stay as empty array - UI shows empty state
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const evaluatorWebsites = useMemo(() => mapFormsToEvaluatorWebsites(forms), [forms]);
  const adminWebsites = useMemo(() => mapFormsToAdminWebsites(forms), [forms]);

  if (isAdmin && !isEvaluator) {
    return (
      <AdminDashboard
        name={user?.name || 'EILA'}
        loading={loading}
        websites={adminWebsites}
        isExecutive={isExecutive}
        overview={overview}
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
  const t = useTranslations();
  const total = websites.length;
  const submitted = websites.filter((w) => w.status === 'submitted').length;
  const notEvaluated = websites.filter((w) => w.status !== 'submitted').length;
  const inProgress = websites.filter((w) => w.status === 'in_progress').length;

  return (
    <DashboardSurface>
      <HeroBanner
        eyebrow={t('dashboard.evaluatorConsole')}
        title={greeting}
        subtitle={t('dashboard.assignedWebsites')}
        metric={`${submitted}/${total}`}
        metricLabel={t('dashboard.submittedForms')}
      />

      <section className="grid grid-cols-2 gap-[14px] lg:grid-cols-4" aria-label="Dashboard statistics">
        <StatCard label={t('dashboard.total')} value={total} icon={Globe} tone="primary" />
        <StatCard label={t('dashboard.inProgress')} value={inProgress} icon={Clock} tone="warning" />
        <StatCard label={t('dashboard.evaluated')} value={submitted} icon={CheckCircle2} tone="success" />
        <StatCard label={t('dashboard.notEvaluated')} value={notEvaluated} icon={AlertCircle} tone="danger" />
      </section>

      <EvaluatorTable loading={loading} websites={websites} />
    </DashboardSurface>
  );
}

function AdminDashboard({
  name,
  loading,
  websites,
  isExecutive,
  overview,
}: {
  name: string;
  loading: boolean;
  websites: AdminWebsite[];
  isExecutive: boolean;
  overview: DashboardOverview | null;
}) {
  const t = useTranslations();
  const formStats = {
    total: websites.length,
    waiting: websites.filter((website) => website.status === 'waiting').length,
    inProgress: websites.filter((website) => website.status === 'in_progress').length,
    completed: websites.filter((website) => website.status === 'completed' || website.status === 'published').length,
  };
  const stats = overview
    ? {
        total: overview.totalWebsites || formStats.total,
        waiting: (overview.totalWebsites - overview.evaluatedWebsites) || formStats.waiting,
        inProgress: overview.pendingForms || formStats.inProgress,
        completed: overview.evaluatedWebsites || formStats.completed,
      }
    : formStats;

  return (
    <DashboardSurface>
      <HeroBanner
        eyebrow={t('dashboard.adminConsole')}
        title={t('dashboard.greeting', {name})}
        subtitle={t('dashboard.websiteOverview')}
        metric={`${stats.completed}/${stats.total}`}
        metricLabel={t('dashboard.completed')}
      />

      {/* Quick Actions - Only for Admin */}
      {!isExecutive && (
        <section className="mb-8" aria-label="Quick Actions">
          <h2 className="mb-4 text-[15px] font-bold text-[var(--typeui-text)]">ทางลัดจัดการระบบ (Quick Actions)</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Link href="/rounds" className="group flex flex-col items-center gap-3 rounded-[16px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-[#1e7cd8]/30 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <span className="text-[13px] font-bold text-[var(--typeui-text)] group-hover:text-blue-600 dark:group-hover:text-blue-400">จัดการรอบประเมิน</span>
            </Link>
            
            <Link href="/websites" className="group flex flex-col items-center gap-3 rounded-[16px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-500/30 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400">
                <Globe className="h-5 w-5" />
              </div>
              <span className="text-[13px] font-bold text-[var(--typeui-text)] group-hover:text-emerald-600 dark:group-hover:text-emerald-400">ทะเบียนเว็บไซต์</span>
            </Link>

            <Link href="/admin/users" className="group flex flex-col items-center gap-3 rounded-[16px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-purple-500/30 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-[13px] font-bold text-[var(--typeui-text)] group-hover:text-purple-600 dark:group-hover:text-purple-400">จัดการผู้ใช้งาน</span>
            </Link>

            <Link href="/reports" className="group flex flex-col items-center gap-3 rounded-[16px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <span className="text-[13px] font-bold text-[var(--typeui-text)] group-hover:text-amber-600 dark:group-hover:text-amber-400">ดูรายงานผล</span>
            </Link>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-[14px] lg:grid-cols-4" aria-label="Dashboard statistics">
        <StatCard label={t('dashboard.total')} value={stats.total} icon={FileText} tone="primary" />
        <StatCard label={t('dashboard.waiting')} value={stats.waiting} icon={Clock} tone="muted" />
        <StatCard label={t('dashboard.inProgress')} value={stats.inProgress} icon={TrendingUp} tone="warning" />
        <StatCard label={t('dashboard.completed')} value={stats.completed} icon={CheckCircle2} tone="success" />
      </section>

      {overview?.completionByRole && (
        <section className="rounded-[18px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-6 shadow-[var(--typeui-card-shadow)]">
          <h3 className="text-[14px] font-bold text-[var(--typeui-text)] mb-4">ความคืบหน้าตาม Role</h3>
          <div className="space-y-3">
            {[
              { key: 'student', label: 'นักศึกษา' },
              { key: 'teacher', label: 'อาจารย์' },
              { key: 'staff', label: 'บุคลากร' },
            ].map(({ key, label }) => {
              const count = overview.completionByRole?.[key] ?? 0;
              const pct = overview.totalResponses > 0 ? Math.round((count / overview.totalResponses) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-20 text-[12px] text-[var(--typeui-subtext)]">{label}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--typeui-card-border)] overflow-hidden">
                    <div className="h-full bg-[var(--typeui-primary)] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right text-[12px] font-semibold text-[var(--typeui-text)]">{pct}%</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <AdminTable loading={loading} websites={websites} isExecutive={isExecutive} />
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

function SkeletonCard() {
  return (
    <article className="flex flex-col gap-[14px] rounded-[14px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-3">
        <div className="h-[42px] w-[42px] shrink-0 animate-pulse rounded-[12px] bg-[var(--typeui-search-bg)]" />
        <div className="flex flex-col gap-2 pt-1">
          <div className="h-[13px] w-[120px] animate-pulse rounded-md bg-[var(--typeui-search-bg)]" />
          <div className="h-[11px] w-[90px] animate-pulse rounded-md bg-[var(--typeui-search-bg)]" />
        </div>
      </div>
      <div className="h-[22px] w-[80px] animate-pulse rounded-[6px] bg-[var(--typeui-search-bg)]" />
      <div className="h-[46px] w-full animate-pulse rounded-[12px] bg-[var(--typeui-search-bg)]" />
    </article>
  );
}

function CircularProgress({ value, max, size = 36 }: { value: number; max: number; size?: number }) {
  const pct = max > 0 ? value / max : 0;
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--typeui-card-border)" strokeWidth={4} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--typeui-success)" strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
      />
    </svg>
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
  const animated = useCountUp(value);
  const toneConfig = getToneClasses(tone);
  return (
    <article className="rounded-[18px] border border-[var(--typeui-card-border-soft)] bg-[var(--typeui-card-bg)] p-6 shadow-[var(--typeui-stat-shadow)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] motion-reduce:transform-none motion-reduce:transition-none">
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-[46px] w-[46px] items-center justify-center rounded-[14px] border', toneConfig.icon, toneConfig.border)}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', toneConfig.badge)}>
            {trend}
          </span>
        )}
      </div>
      <p className="mt-5 text-[36px] font-bold leading-none tracking-[-0.04em] text-[var(--typeui-text)]">{animated}</p>
      <p className="mt-2 text-[13px] font-medium text-[var(--typeui-subtext)]">{label}</p>
    </article>
  );
}

function EvaluatorTable({loading, websites}: {loading: boolean; websites: EvaluatorWebsite[]}) {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Complete'>('All');
  
  const filtered = websites.filter(w =>
    w.name.toLowerCase().includes(query.toLowerCase()) ||
    w.url.toLowerCase().includes(query.toLowerCase())
  );
  
  const tabFiltered = activeTab === 'Active'
    ? filtered.filter(w => w.status === 'in_progress')
    : activeTab === 'Complete'
    ? filtered.filter(w => w.status === 'submitted')
    : filtered;

  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] shadow-[var(--typeui-card-shadow)]">
      <div className="flex flex-col gap-4 border-b border-[var(--typeui-divider)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--typeui-text)]">{t('dashboard.assignedWebsites')}</h2>
          <p className="mt-1 text-[12px] font-normal text-[var(--typeui-muted)]">{loading ? t('common.loading') : t('dashboard.itemsCount', {count: websites.length})}</p>
        </div>
        <div className="relative w-full sm:w-[220px]">
          <Search className="absolute left-3 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--typeui-muted)]" />
          <input
            type="text"
            placeholder={t('dashboard.searchWebsites')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-[10px] border border-[var(--typeui-search-border)] bg-[var(--typeui-search-bg)] py-2 pl-8 pr-4 text-[13px] text-[var(--typeui-text)] placeholder:text-[var(--typeui-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--typeui-primary)] focus:ring-offset-0 focus:border-transparent transition-colors duration-150"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-[14px] px-6 py-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tabFiltered.length === 0 ? (
        <EmptyState title={t('dashboard.noAssigned')} subtitle={t('dashboard.newAssignedDesc')} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-[14px] px-6 py-5">
          {tabFiltered.map((website, i) => (
            <EvaluatorWebsiteCard key={website.id ? `${website.id}-${i}` : i} website={website} />
          ))}
        </div>
      )}

      <TableFooter countLabel={t('dashboard.itemsCount', {count: tabFiltered.length})} activeTab={activeTab} onTabChange={setActiveTab} />
    </section>
  );
}

function AdminTable({loading, websites, isExecutive}: {loading: boolean; websites: AdminWebsite[]; isExecutive: boolean}) {
  const t = useTranslations();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Complete'>('All');
  
  const filtered = websites.filter(w =>
    w.name.toLowerCase().includes(query.toLowerCase()) ||
    w.url.toLowerCase().includes(query.toLowerCase())
  );
  
  const tabFiltered = activeTab === 'Active'
    ? filtered.filter(w => w.status === 'in_progress')
    : activeTab === 'Complete'
    ? filtered.filter(w => w.status === 'completed' || w.status === 'published')
    : filtered;

  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--typeui-card-border)] bg-[var(--typeui-card-bg)] shadow-[var(--typeui-card-shadow)]">
      <div className="flex flex-col gap-4 border-b border-[var(--typeui-divider)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[var(--typeui-text)]">{t('dashboard.websiteOverview')}</h2>
          <p className="mt-1 text-[12px] font-normal text-[var(--typeui-muted)]">{loading ? t('common.loading') : t('dashboard.websitesCount', {count: websites.length})}</p>
        </div>
        <div className="relative w-full sm:w-[220px]">
          <Search className="absolute left-3 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-[var(--typeui-muted)]" />
          <input
            type="text"
            placeholder={t('dashboard.searchWebsites')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-[10px] border border-[var(--typeui-search-border)] bg-[var(--typeui-search-bg)] py-2 pl-8 pr-4 text-[13px] text-[var(--typeui-text)] placeholder:text-[var(--typeui-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--typeui-primary)] focus:ring-offset-0 focus:border-transparent transition-colors duration-150"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-[14px] px-6 py-5">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : tabFiltered.length === 0 ? (
        <EmptyState title={t('dashboard.noForms')} subtitle={t('dashboard.newAssignedDesc')} isAdmin={!isExecutive} />
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(268px,1fr))] gap-[14px] px-6 py-5">
          {tabFiltered.map((website, i) => (
            <AdminWebsiteCard key={website.id ? `${website.id}-${i}` : i} website={website} isExecutive={isExecutive} />
          ))}
        </div>
      )}

      <TableFooter countLabel={t('dashboard.itemsCount', {count: tabFiltered.length})} activeTab={activeTab} onTabChange={setActiveTab} />
    </section>
  );
}

function EvaluatorWebsiteCard({website}: {website: EvaluatorWebsite}) {
  const t = useTranslations();
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--typeui-text)]">{website.name}</p>
          <p className="mt-1 truncate text-[12px] text-[var(--typeui-muted)]">{website.url || '-'}</p>
        </div>
        {(() => {
          const s = getDisplayStatus(website);
          const cfg = {
            done:       { label: t('dashboard.done'),         cls: 'bg-[var(--typeui-success-soft)] text-[var(--typeui-success)]' },
            inprogress: { label: t('dashboard.inProgress'),  cls: 'bg-[var(--typeui-warning-soft)] text-[var(--typeui-warning)]' },
            pending:    { label: t('dashboard.pending'),     cls: 'bg-[var(--typeui-search-bg)] text-[var(--typeui-muted)]' },
          }[s];
          return (
            <span className={cn(
              'ml-auto shrink-0 rounded-full px-[10px] py-[3px] text-[10px] font-bold whitespace-nowrap',
              cfg.cls
            )}>
              {cfg.label}
            </span>
          );
        })()}
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
        <div className="flex items-center gap-3">
          <CircularProgress value={website.progress} max={100} size={38} />
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--typeui-muted)]">{t('dashboard.progress')}</span>
              <span className={cn('text-[12px] font-bold', getScoreTextColor(website.progress))}>
                {website.progress}%
              </span>
            </div>
            <div className="h-[5px] w-full overflow-hidden rounded-full bg-[var(--typeui-card-border)]">
              <div
                className={cn('h-full rounded-full transition-[width] duration-[800ms] ease-in-out', getScoreColor(website.progress))}
                style={{ width: `${Math.min(100, website.progress)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="px-0 pb-0 pt-0">
        <Link
          href={href}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-0 bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] py-[13px] text-[14px] font-extrabold tracking-[0.01em] text-white shadow-[0_4px_18_rgba(12,92,171,0.35)] transition-[opacity,transform] duration-150 hover:-translate-y-px hover:opacity-[0.88]"
        >
          <ExternalLink className="h-[15px] w-[15px] stroke-[2.5]" />
          {t('dashboard.startEvaluation')}
        </Link>
      </div>
    </article>
  );
}

function AdminWebsiteCard({website, isExecutive}: {website: AdminWebsite; isExecutive: boolean}) {
  const t = useTranslations();
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
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[var(--typeui-text)]">{website.name}</p>
          <p className="mt-1 truncate text-[12px] text-[var(--typeui-muted)]">{website.url || '-'}</p>
        </div>
        {(() => {
          const s = getDisplayStatus(website);
          const cfg = {
            done:       { label: t('dashboard.done'),         cls: 'bg-[var(--typeui-success-soft)] text-[var(--typeui-success)]' },
            inprogress: { label: t('dashboard.inProgress'),  cls: 'bg-[var(--typeui-warning-soft)] text-[var(--typeui-warning)]' },
            pending:    { label: t('dashboard.pending'),     cls: 'bg-[var(--typeui-search-bg)] text-[var(--typeui-muted)]' },
          }[s];
          return (
            <span className={cn(
              'ml-auto shrink-0 rounded-full px-[10px] py-[3px] text-[10px] font-bold whitespace-nowrap',
              cfg.cls
            )}>
              {cfg.label}
            </span>
          );
        })()}
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

      {!isExecutive && (
        <div className="px-0 pb-0 pt-0">
          <Link
            href="/forms"
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] border-0 bg-[linear-gradient(135deg,#1d4ed8_0%,#2563eb_100%)] py-[13px] text-[14px] font-extrabold tracking-[0.01em] text-white shadow-[0_4px_18_rgba(12,92,171,0.35)] transition-[opacity,transform] duration-150 hover:-translate-y-px hover:opacity-[0.88]"
          >
            <ExternalLink className="h-[15px] w-[15px] stroke-[2.5]" />
            จัดการแบบฟอร์ม
          </Link>
        </div>
      )}
    </article>
  );
}

function EmptyState({title, subtitle, isAdmin}: {title: string; subtitle: string; isAdmin?: boolean}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--typeui-search-bg)] text-[var(--typeui-subtext)] shadow-inner mb-6">
        <FileText className="h-8 w-8 text-[var(--typeui-muted)]" />
      </div>
      <h3 className="text-[18px] font-bold text-[var(--typeui-text)] mb-2">{title}</h3>
      <p className="max-w-md text-[13px] font-medium text-[var(--typeui-subtext)] leading-relaxed mb-8">{subtitle}</p>
      
      {isAdmin && (
        <div className="flex flex-col gap-3 w-full max-w-sm text-left bg-[var(--typeui-search-bg)] p-5 rounded-2xl border border-[var(--typeui-card-border-soft)]">
          <p className="text-[12px] font-bold text-[var(--typeui-text)] mb-1">เริ่มต้นใช้งานระบบง่ายๆ 3 ขั้นตอน:</p>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">1</span>
            <span className="text-[13px] text-[var(--typeui-text)] font-medium">เปิดรอบการประเมินใหม่ที่เมนู <Link href="/rounds" className="text-blue-600 hover:underline">รอบประเมิน</Link></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">2</span>
            <span className="text-[13px] text-[var(--typeui-text)] font-medium">เพิ่มเว็บไซต์เป้าหมายที่ <Link href="/websites" className="text-blue-600 hover:underline">ทะเบียนเว็บไซต์</Link></span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">3</span>
            <span className="text-[13px] text-[var(--typeui-text)] font-medium">สร้างแบบฟอร์มเพื่อเริ่มรับการประเมิน</span>
          </div>
          
          <Link href="/forms" className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-blue-700">
            <PlusCircle className="h-4 w-4" /> ไปสร้างแบบฟอร์มกันเลย
          </Link>
        </div>
      )}
    </div>
  );
}

type TabId = 'All' | 'Active' | 'Complete';

function TableFooter({
  countLabel,
  activeTab,
  onTabChange,
}: {
  countLabel: string;
  activeTab: string;
  onTabChange: (t: TabId) => void;
}) {
  const t = useTranslations();
  return (
    <footer className="flex flex-col gap-3 border-t border-[var(--typeui-divider)] px-6 py-[14px] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11px] font-medium text-[var(--typeui-muted)]">{countLabel}</p>
      <div className="flex items-center gap-2">
        {([
          {id: 'All' as TabId, label: t('dashboard.all')},
          {id: 'Active' as TabId, label: t('dashboard.active')},
          {id: 'Complete' as TabId, label: t('dashboard.complete')}
        ] as const).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'rounded-[8px] px-3 py-[5px] text-[12px] font-medium transition-colors duration-150',
              activeTab === tab.id
                ? 'bg-[var(--typeui-primary)] text-white shadow-sm'
                : 'bg-[var(--typeui-search-bg)] text-[var(--typeui-subtext)] hover:bg-[var(--typeui-primary-soft)] hover:text-[var(--typeui-primary)]'
            )}
          >
            {tab.label}
          </button>
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
      border: 'border-[rgba(96,165,250,0.25)]',
    },
    success: {
      icon: 'bg-[var(--typeui-success-soft)] text-[var(--typeui-success)]',
      badge: 'bg-[var(--typeui-success-soft)] text-[var(--typeui-success-text)]',
      border: 'border-[rgba(16,185,129,0.30)]',
    },
    warning: {
      icon: 'bg-[var(--typeui-warning-soft)] text-[var(--typeui-warning)]',
      badge: 'bg-[var(--typeui-warning-soft)] text-[var(--typeui-warning-text)]',
      border: 'border-[rgba(245,158,11,0.30)]',
    },
    danger: {
      icon: 'bg-[var(--typeui-danger-soft)] text-[var(--typeui-danger)]',
      badge: 'bg-[var(--typeui-danger-soft)] text-[var(--typeui-danger-text)]',
      border: 'border-[rgba(239,68,68,0.30)]',
    },
    muted: {
      icon: 'bg-[var(--typeui-search-bg)] text-[var(--typeui-muted)]',
      badge: 'bg-[var(--typeui-search-bg)] text-[var(--typeui-muted)]',
      border: 'border-[var(--typeui-card-border)]',
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
      const evalStatus: EvaluationStatus =
        form.hasSubmitted ? 'submitted'
        : form.status === 'open' ? 'in_progress'
        : 'not_started';

      return {
        id: form.id,
        name: form.websiteName || form.title || 'ไม่ระบุชื่อ',
        url: form.websiteUrl || '',
        progress: form.hasSubmitted ? 100 : 0,
        status: evalStatus,
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
