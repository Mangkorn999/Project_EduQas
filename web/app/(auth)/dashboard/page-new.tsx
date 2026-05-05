'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {useTranslations} from 'next-intl';
import {
  ChevronRight,
  Globe,
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  MoreHorizontal,
} from 'lucide-react';
import {useAuthStore} from '@/lib/stores/authStore';
import {apiGet} from '@/lib/api';
import {cn} from '@/lib/utils';
import type {UserRole} from '@/lib/permissions';

// EILA Design Tokens
const eila = {
  colors: {
    primary: '#001d59',
    accent: '#FFD700',
    textPrimary: '#1a1a2e',
    textSecondary: '#6b7280',
    surface: '#ffffff',
    surfaceSecondary: '#f8f9fb',
    border: '#e5e7eb',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  typography: {
    fontFamily: 'Prompt, IBM Plex Sans Thai, system-ui, -apple-system, sans-serif',
  },
};

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
  const inProgress = websites.filter((w) => w.status === 'in_progress').length;

  return (
    <div className="space-y-8" style={{fontFamily: eila.typography.fontFamily}}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" style={{color: eila.colors.primary}}>
          {greeting}
        </h1>
        <p className="text-base" style={{color: eila.colors.textSecondary}}>
          เว็บไซต์ที่ได้รับมอบหมายให้ประเมิน
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ทั้งหมด"
          value={total}
          icon={Globe}
          color={eila.colors.primary}
          change="+0%"
        />
        <StatCard
          label="กำลังดำเนินการ"
          value={inProgress}
          icon={Clock}
          color={eila.colors.warning}
          change="+0%"
        />
        <StatCard
          label="ประเมินแล้ว"
          value={submitted}
          icon={CheckCircle2}
          color={eila.colors.success}
          change={total > 0 ? `+${Math.round((submitted / total) * 100)}%` : '+0%'}
        />
        <StatCard
          label="ยังไม่ประเมิน"
          value={notEvaluated}
          icon={AlertCircle}
          color={eila.colors.danger}
          change={total > 0 ? `-${Math.round((notEvaluated / total) * 100)}%` : '-0%'}
        />
      </div>

      {/* Data Table */}
      <div
        className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow"
        style={{backgroundColor: eila.colors.surface, border: `1px solid ${eila.colors.border}`}}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{borderColor: eila.colors.border, backgroundColor: `${eila.colors.primary}05`}}
        >
          <h2 className="font-semibold text-lg" style={{color: eila.colors.primary}}>
            เว็บไซต์ที่ต้องประเมิน
          </h2>
          <p className="text-sm" style={{color: eila.colors.textSecondary}}>
            {loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} รายการ`}
          </p>
        </div>

        {websites.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <AlertCircle className="h-12 w-12 mb-4" style={{color: eila.colors.textSecondary, opacity: 0.4}} />
            <p className="text-center text-sm" style={{color: eila.colors.textSecondary}}>
              ยังไม่มีเว็บไซต์ที่ได้รับมอบหมาย
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: eila.colors.border}}>
            {websites.map((website) => (
              <EvaluatorWebsiteRow key={website.id} website={website} />
            ))}
          </div>
        )}
      </div>
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
    <div className="space-y-8" style={{fontFamily: eila.typography.fontFamily}}>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" style={{color: eila.colors.primary}}>
          สวัสดี, {name}
        </h1>
        <p className="text-base" style={{color: eila.colors.textSecondary}}>
          ภาพรวมการประเมินคุณภาพเว็บไซต์
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="ฟอร์มทั้งหมด"
          value={stats.total}
          icon={Globe}
          color={eila.colors.primary}
          change="+0%"
        />
        <StatCard
          label="รอการประเมิน"
          value={stats.waiting}
          icon={Clock}
          color={eila.colors.textSecondary}
          change="+0%"
        />
        <StatCard
          label="กำลังดำเนินการ"
          value={stats.inProgress}
          icon={TrendingUp}
          color={eila.colors.warning}
          change="+0%"
        />
        <StatCard
          label="เสร็จสมบูรณ์"
          value={stats.completed}
          icon={CheckCircle2}
          color={eila.colors.success}
          change={stats.total > 0 ? `+${Math.round((stats.completed / stats.total) * 100)}%` : '+0%'}
        />
      </div>

      {/* Data Table */}
      <div
        className="overflow-hidden rounded-xl shadow-sm hover:shadow-md transition-shadow"
        style={{backgroundColor: eila.colors.surface, border: `1px solid ${eila.colors.border}`}}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{borderColor: eila.colors.border, backgroundColor: `${eila.colors.primary}05`}}
        >
          <h2 className="font-semibold text-lg" style={{color: eila.colors.primary}}>
            ภาพรวมเว็บไซต์
          </h2>
          <p className="text-sm" style={{color: eila.colors.textSecondary}}>
            {loading ? 'กำลังโหลดข้อมูล...' : `${websites.length} เว็บไซต์`}
          </p>
        </div>

        {websites.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center px-6 py-16">
            <AlertCircle className="h-12 w-12 mb-4" style={{color: eila.colors.textSecondary, opacity: 0.4}} />
            <p className="text-center text-sm" style={{color: eila.colors.textSecondary}}>
              ยังไม่มีแบบประเมิน
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: eila.colors.border}}>
            {websites.map((website) => (
              <AdminWebsiteRow key={website.id} website={website} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  change,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  change: string;
}) {
  const isPositive = !change.startsWith('-');

  return (
    <div
      className="rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
      style={{
        backgroundColor: eila.colors.surface,
        border: `1px solid ${eila.colors.border}`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium" style={{color: eila.colors.textSecondary}}>
            {label}
          </p>
          <p className="mt-3 text-3xl font-bold" style={{color: eila.colors.primary}}>
            {value}
          </p>
          <div className="mt-2 flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4" style={{color: eila.colors.success}} />
            ) : (
              <TrendingDown className="h-4 w-4" style={{color: eila.colors.danger}} />
            )}
            <span className="text-xs font-medium" style={{color: isPositive ? eila.colors.success : eila.colors.danger}}>
              {change}
            </span>
          </div>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg"
          style={{backgroundColor: `${color}15`, color}}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

function EvaluatorWebsiteRow({website}: {website: EvaluatorWebsite}) {
  const href = `/evaluator/${website.id}${website.status === 'submitted' ? '?readonly=true' : ''}`;

  return (
    <Link
      href={href}
      className="flex items-center justify-between px-6 py-4 hover:bg-[#f8f9fb] transition-colors"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{backgroundColor: `${eila.colors.primary}10`, color: eila.colors.primary}}
        >
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate" style={{color: eila.colors.textPrimary}}>
            {website.name}
          </p>
          <p className="text-xs truncate" style={{color: eila.colors.textSecondary}}>
            {website.url}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 shrink-0">
        <EvaluatorStatusBadge status={website.status} />
        <ChevronRight className="h-4 w-4" style={{color: eila.colors.textSecondary}} />
      </div>
    </Link>
  );
}

function AdminWebsiteRow({website}: {website: AdminWebsite}) {
  const progress = website.totalEvaluators > 0
    ? Math.round((website.submitted / website.totalEvaluators) * 100)
    : 0;

  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-[#f8f9fb] transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{backgroundColor: `${eila.colors.primary}10`, color: eila.colors.primary}}
        >
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{color: eila.colors.textPrimary}}>
            {website.name}
          </p>
          <p className="text-xs truncate" style={{color: eila.colors.textSecondary}}>
            {website.url}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-4 shrink-0">
        {/* Progress Bar - Hidden on Mobile */}
        <div className="hidden sm:block w-40">
          <div className="flex justify-between mb-2">
            <span className="text-xs" style={{color: eila.colors.textSecondary}}>
              {website.submitted}/{website.totalEvaluators}
            </span>
            <span className="text-xs font-medium" style={{color: eila.colors.primary}}>
              {progress}%
            </span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{backgroundColor: eila.colors.border}}
          >
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${Math.min(100, progress)}%`,
                backgroundColor: eila.colors.primary,
              }}
            />
          </div>
        </div>
        <AdminStatusBadge status={website.status} />
        <Link
          href="/forms"
          className="inline-flex items-center justify-center h-9 px-3 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
          style={{
            backgroundColor: eila.colors.primary,
            color: eila.colors.surface,
          }}
        >
          จัดการ
        </Link>
      </div>
    </div>
  );
}

function EvaluatorStatusBadge({status}: {status: EvaluationStatus}) {
  const config = {
    not_started: {
      label: 'ยังไม่เริ่ม',
      icon: AlertCircle,
      bgColor: eila.colors.textSecondary,
    },
    in_progress: {
      label: 'กำลังดำเนินการ',
      icon: Clock,
      bgColor: eila.colors.warning,
    },
    submitted: {
      label: 'ส่งแล้ว',
      icon: CheckCircle2,
      bgColor: eila.colors.success,
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        backgroundColor: `${config.bgColor}15`,
      }}
    >
      <Icon className="h-3.5 w-3.5" style={{color: config.bgColor}} />
      <span
        className="text-xs font-medium whitespace-nowrap"
        style={{color: config.bgColor}}
      >
        {config.label}
      </span>
    </div>
  );
}

function AdminStatusBadge({status}: {status: AdminWebsiteStatus}) {
  const config = {
    waiting: {
      label: 'รอ',
      icon: Clock,
      bgColor: eila.colors.textSecondary,
    },
    in_progress: {
      label: 'กำลังทำ',
      icon: TrendingUp,
      bgColor: eila.colors.warning,
    },
    completed: {
      label: 'เสร็จ',
      icon: CheckCircle2,
      bgColor: eila.colors.success,
    },
    published: {
      label: 'เผยแพร่แล้ว',
      icon: CheckCircle2,
      bgColor: eila.colors.info,
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg"
      style={{
        backgroundColor: `${config.bgColor}15`,
      }}
    >
      <Icon className="h-3.5 w-3.5" style={{color: config.bgColor}} />
      <span
        className="text-xs font-medium whitespace-nowrap"
        style={{color: config.bgColor}}
      >
        {config.label}
      </span>
    </div>
  );
}

function mapFormsToEvaluatorWebsites(forms: DashboardForm[]): EvaluatorWebsite[] {
  return forms
    .filter((form) => form.websiteUrl || form.websiteName || form.title)
    .map((form) => {
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
