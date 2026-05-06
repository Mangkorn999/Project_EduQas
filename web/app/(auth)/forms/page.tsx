'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Plus, Search, Trash2, Copy, ChevronRight, Calendar, Users, Globe, ExternalLink, ArrowRight, ArrowLeft, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { useAuthStore } from '@/lib/stores/authStore';

const createFormSchema = z.object({
  title: z.string().min(1, 'กรุณาระบุหัวข้อแบบฟอร์ม'),
  description: z.string().optional(),
  roundId: z.string().min(1, 'กรุณาเลือกรอบการประเมิน').uuid('รูปแบบรอบการประเมินไม่ถูกต้อง'),
  scope: z.enum(['faculty', 'university']),
  ownerFacultyId: z.union([z.string().uuid(), z.literal(''), z.undefined()]),
  websiteTargetId: z.union([z.string().uuid(), z.literal(''), z.undefined()]),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

type FormRecord = {
  id: string;
  title: string;
  description?: string;
  roundId?: string;
  scope?: 'faculty' | 'university';
  ownerFacultyId?: string;
  websiteTargetId?: string;
  websiteName?: string;
  status: 'draft' | 'open' | 'closed';
  updatedAt: string;
};

const statusConfig = {
  draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-700 border-gray-200' },
  open: { label: 'เปิดใช้งาน', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  closed: { label: 'ปิดรับแล้ว', color: 'bg-green-100 text-green-700 border-green-200' },
};

export default function FormsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [websites, setWebsites] = useState<{ id: string; name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingWebsites, setFetchingWebsites] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'open' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState(1);

  const { register, handleSubmit, trigger, control, setValue, formState: { errors }, reset } = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      title: '',
      description: '',
      roundId: '',
      scope: 'faculty',
      ownerFacultyId: '',
      websiteTargetId: '',
    }
  });

  const selectedRoundId = useWatch({ control, name: 'roundId' });
  const selectedWebsiteId = useWatch({ control, name: 'websiteTargetId' });
  const selectedScope = useWatch({ control, name: 'scope' });

  const selectedWebsite = useMemo(() => 
    websites.find(w => w.id === selectedWebsiteId),
  [websites, selectedWebsiteId]);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/api/v1/forms');
      setForms(res.data);
    } catch (err) {
      console.error('Failed to fetch forms:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRounds = async () => {
    try {
      const res = await apiGet('/api/v1/rounds');
      setRounds(res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch rounds:', err);
    }
  };

  const fetchWebsites = async (roundId: string) => {
    try {
      setFetchingWebsites(true);
      const res = await apiGet(`/api/v1/rounds/${roundId}/websites`);
      setWebsites(res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch websites for round:', err);
      setWebsites([]);
    } finally {
      setFetchingWebsites(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchForms();
    fetchRounds();
  }, []);

  useEffect(() => {
    if (selectedRoundId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchWebsites(selectedRoundId);
    } else {
      setWebsites([]);
    }
    setValue('websiteTargetId', undefined);
  }, [selectedRoundId, setValue]);

  const onCreateForm = async (data: CreateFormValues) => {
    try {
      const payload: any = { ...data };
      if (payload.websiteTargetId === '') delete payload.websiteTargetId;
      if (payload.ownerFacultyId === '') delete payload.ownerFacultyId;
      
      const res = await apiPost('/api/v1/forms', payload);
      setIsModalOpen(false);
      setStep(1);
      reset();
      router.push(`/forms/${res.data.id}/builder`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'สร้างแบบฟอร์มไม่สำเร็จ');
    }
  };

  const handleNextStep = async () => {
    const isValid = await trigger(['title', 'scope', 'description']);
    if (isValid) {
      setStep(2);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setStep(1);
      reset();
    }, 200);
  };

  const onDuplicateForm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('คัดลอกแบบฟอร์มนี้?')) return
    try {
      const res = await apiPost(`/api/v1/forms/${id}/duplicate`, {})
      router.push(`/forms/${res.data.id}/builder`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'คัดลอกไม่สำเร็จ')
    }
  };

  const onDeleteForm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแบบฟอร์มนี้? (การลบจะเป็นการ Soft Delete)')) return;
    try {
      await apiDelete(`/api/v1/forms/${id}`);
      fetchForms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบแบบฟอร์มไม่สำเร็จ');
    }
  };

  const filteredForms = forms.filter((f) => {
    const matchesStatus = filter === 'all' || f.status === filter;
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      f.title?.toLowerCase().includes(query) ||
      f.websiteName?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">จัดการแบบฟอร์มประเมิน</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">สร้างและแก้ไขแบบฟอร์มสำหรับรอบการประเมินต่างๆ</p>
        </motion.div>

        <PermissionGate permission="form.create">
          <motion.button
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#1C1917] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-stone-700"
          >
            <Plus className="h-5 w-5" />
            สร้าง Form ใหม่
          </motion.button>
        </PermissionGate>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-[var(--border)] p-4 sm:flex-row">
          <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-subtle)] p-1">
            {(['all', 'draft', 'open', 'closed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors",
                  filter === t ? "bg-white text-stone-950 shadow-sm dark:bg-stone-900 dark:text-stone-50" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {t === 'all' ? 'ทั้งหมด' : statusConfig[t].label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อแบบฟอร์ม..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] py-2 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/30"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-[var(--text-muted)]">กำลังโหลดข้อมูล...</div>
          ) : filteredForms.length === 0 ? (
            <div className="p-20 text-center text-[var(--text-muted)]">ไม่พบแบบฟอร์มประเมิน</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">แบบฟอร์มประเมิน</th>
                  <th className="px-6 py-4 font-semibold">รอบการประเมิน</th>
                  <th className="px-6 py-4 font-semibold">ขอบเขต</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredForms.map((form) => (
                  <tr
                    key={form.id}
                    onClick={() => router.push(`/forms/${form.id}/builder`)}
                    className="group cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[var(--text-primary)] transition-colors group-hover:text-[#92400E]">{form.title}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">แก้ไขล่าสุด: {new Date(form.updatedAt).toLocaleDateString('th-TH')}</p>
                      {form.websiteName && <p className="mt-1 text-[11px] font-medium text-[#92400E]">เป้าหมาย: {form.websiteName}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                        {rounds.find(r => r.id === form.roundId)?.name || 'ไม่ระบุรอบ'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                        {form.scope === 'university' ? (
                          <>
                            <Globe className="h-4 w-4 text-[#CA8A04]" />
                            <span>มหาวิทยาลัย</span>
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 text-[#CA8A04]" />
                            <span>คณะ/หน่วยงาน</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-semibold border",
                        statusConfig[form.status as keyof typeof statusConfig]?.color
                      )}>
                        {statusConfig[form.status as keyof typeof statusConfig]?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PermissionGate permission="form.create">
                          <button
                            title="คัดลอก"
                            onClick={(e) => onDuplicateForm(form.id, e)}
                            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800/50"
                          >
                            <Copy className="h-5 w-5" />
                          </button>
                        </PermissionGate>
                        <PermissionGate permission="form.create">
                          <button
                            onClick={(e) => onDeleteForm(form.id, e)}
                            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </PermissionGate>
                        <ChevronRight className="h-5 w-5 text-[var(--text-disabled)] transition-transform group-hover:translate-x-1" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal (Wizard) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity" onClick={handleCloseModal}></div>
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header & Progress */}
            <div className="bg-stone-50 border-b border-[var(--border)] px-6 py-5 dark:bg-stone-900/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                    <LayoutTemplate className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">สร้างแบบฟอร์มประเมินใหม่</h2>
                    <p className="text-xs font-medium text-[var(--text-muted)]">กำหนดโครงสร้างและเป้าหมายการประเมิน</p>
                  </div>
                </div>
                <button onClick={handleCloseModal} className="rounded-full p-2 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors">✕</button>
              </div>
              
              {/* Stepper */}
              <div className="flex items-center justify-between relative px-2">
                <div className="absolute left-8 right-8 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--border)]"></div>
                <div className="absolute left-8 right-8 top-1/2 h-[2px] -translate-y-1/2 bg-blue-600 transition-all duration-300" style={{ width: step === 2 ? '100%' : '0%' }}></div>
                
                <div className="relative flex flex-col items-center gap-2 z-10 bg-stone-50 dark:bg-stone-900/50 px-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors", step >= 1 ? "bg-blue-600 text-white" : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border)]")}>
                    {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
                  </div>
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", step >= 1 ? "text-blue-600" : "text-[var(--text-muted)]")}>ข้อมูลพื้นฐาน</span>
                </div>
                <div className="relative flex flex-col items-center gap-2 z-10 bg-stone-50 dark:bg-stone-900/50 px-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold shadow-sm transition-colors", step >= 2 ? "bg-blue-600 text-white" : "bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border)]")}>
                    2
                  </div>
                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", step >= 2 ? "text-blue-600" : "text-[var(--text-muted)]")}>เป้าหมายประเมิน</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit(onCreateForm)} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 sm:p-8">
                {step === 1 && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-xl mx-auto">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">หัวข้อแบบฟอร์ม <span className="text-red-500">*</span></label>
                      <input
                        {...register('title')}
                        type="text"
                        placeholder="เช่น แบบประเมินคุณภาพเว็บไซต์ รอบ 1/2568"
                        className={cn(
                          "w-full rounded-xl border bg-[var(--bg-subtle)] px-4 py-3.5 outline-none transition focus:ring-2 font-medium",
                          errors.title ? "border-red-300 focus:ring-red-100" : "border-[var(--border)] focus:ring-blue-500/20 focus:border-blue-500"
                        )}
                      />
                      {errors.title && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.title.message}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">ขอบเขตของแบบฟอร์ม (Scope) <span className="text-red-500">*</span></label>
                      <div className="grid grid-cols-2 gap-4">
                        <label className={cn(
                          "flex cursor-pointer items-center justify-center rounded-xl border p-4 transition-all",
                          selectedScope === 'faculty'
                            ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 ring-1 ring-blue-500" 
                            : "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                        )}>
                          <input type="radio" {...register('scope')} value="faculty" className="sr-only" />
                          <div className="flex flex-col items-center text-center gap-1.5">
                            <div className="flex items-center gap-2">
                              <Users className="h-5 w-5" />
                              <span className="font-semibold text-sm">ระดับหน่วยงาน</span>
                            </div>
                            <span className="text-[11px] font-medium opacity-80 leading-tight">สำหรับประเมินเว็บไซต์ของคณะ/สำนัก</span>
                          </div>
                        </label>
                        {(user?.role === 'super_admin' || user?.role === 'admin') && (
                          <label className={cn(
                            "flex cursor-pointer items-center justify-center rounded-xl border p-4 transition-all",
                            selectedScope === 'university'
                              ? "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 ring-1 ring-amber-500" 
                              : "border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"
                          )}>
                            <input type="radio" {...register('scope')} value="university" className="sr-only" />
                            <div className="flex flex-col items-center text-center gap-1.5">
                              <div className="flex items-center gap-2">
                                <Globe className="h-5 w-5" />
                                <span className="font-semibold text-sm">ระดับมหาวิทยาลัย</span>
                              </div>
                              <span className="text-[11px] font-medium opacity-80 leading-tight">สำหรับประเมินเว็บไซต์ภาพรวมมหาวิทยาลัย</span>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">คำอธิบายเพิ่มเติม</label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        placeholder="ระบุรายละเอียดเพิ่มเติมเกี่ยวกับแบบฟอร์มนี้ (เลือกใส่ได้)"
                        className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      ></textarea>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 max-w-xl mx-auto">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 dark:bg-blue-900/20 dark:border-blue-800/50 mb-4">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        การเลือก <strong>รอบการประเมิน</strong> จะช่วยจัดกลุ่มแบบฟอร์มเข้าด้วยกัน และดึงข้อมูลเว็บไซต์เป้าหมายที่ลงทะเบียนไว้ในรอบนั้นๆ มาให้เลือก
                      </p>
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="block text-sm font-bold text-[var(--text-primary)]">รอบการประเมิน <span className="text-red-500">*</span></label>
                        <a href="/rounds" target="_blank" className="text-xs font-bold text-blue-600 hover:underline">
                          + สร้างรอบใหม่
                        </a>
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                        <select
                          {...register('roundId')}
                          className={cn(
                            "w-full appearance-none rounded-xl border bg-[var(--bg-subtle)] pl-12 pr-4 py-3.5 outline-none transition focus:ring-2 font-medium",
                            errors.roundId ? "border-red-300 focus:ring-red-100" : "border-[var(--border)] focus:ring-blue-500/20 focus:border-blue-500"
                          )}
                        >
                          <option value="" disabled>-- เลือกรอบการประเมิน --</option>
                          {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      {errors.roundId && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.roundId.message}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">เว็บไซต์เป้าหมาย (Optional)</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]" />
                        <select
                          {...register('websiteTargetId')}
                          disabled={!selectedRoundId || fetchingWebsites}
                          className={cn(
                            "w-full appearance-none rounded-xl border bg-[var(--bg-subtle)] pl-12 pr-4 py-3.5 outline-none transition focus:ring-2 font-medium",
                            !selectedRoundId ? "cursor-not-allowed opacity-50" : "border-[var(--border)] focus:ring-blue-500/20 focus:border-blue-500"
                          )}
                        >
                          <option value="">{fetchingWebsites ? 'กำลังโหลดข้อมูล...' : '-- ไม่ระบุ หรือ เลือกจาก Registry --'}</option>
                          {websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                      </div>
                      {!selectedRoundId && <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">กรุณาเลือกรอบการประเมินก่อน เพื่อดึงรายชื่อเว็บไซต์เป้าหมาย</p>}
                      
                      {selectedWebsite && (
                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex items-center justify-between rounded-xl bg-stone-100 border border-[var(--border)] p-4 dark:bg-stone-900/50">
                          <div className="flex flex-col gap-1 overflow-hidden">
                            <span className="text-sm font-bold text-[var(--text-primary)] truncate">{selectedWebsite.name}</span>
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              <span className="truncate">{selectedWebsite.url}</span>
                            </div>
                          </div>
                          <a href={selectedWebsite.url} target="_blank" rel="noreferrer" className="shrink-0 flex items-center justify-center rounded-lg bg-white border border-[var(--border)] px-3 py-1.5 text-[11px] font-bold text-[var(--text-primary)] shadow-sm hover:bg-stone-50 transition-colors">
                            เปิดดูเว็บไซต์
                          </a>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="border-t border-[var(--border)] bg-stone-50 px-6 py-4 flex items-center justify-between dark:bg-stone-900/50">
                {step === 1 ? (
                  <button type="button" onClick={handleCloseModal} className="px-5 py-2.5 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors">
                    ยกเลิก
                  </button>
                ) : (
                  <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors">
                    <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
                  </button>
                )}

                {step === 1 ? (
                  <button type="button" onClick={handleNextStep} className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95">
                    ถัดไป <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="submit" className="flex items-center gap-2 rounded-xl bg-[#CA8A04] px-6 py-2.5 font-bold text-white shadow-sm transition-colors hover:bg-[#A16207] active:scale-95">
                    <CheckCircle2 className="h-4 w-4" /> ยืนยันการสร้าง
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
