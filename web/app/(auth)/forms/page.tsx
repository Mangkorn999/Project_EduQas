'use client';

<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Plus, Search, Filter, Trash2, ChevronRight, Calendar, Users, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
=======
import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Plus, Search, Trash2, ChevronRight, Calendar, Users, Globe, ExternalLink } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
>>>>>>> feature/ux-login-role-test
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';
<<<<<<< HEAD
=======
import { PermissionGate } from '@/components/auth/PermissionGate';
>>>>>>> feature/ux-login-role-test

const createFormSchema = z.object({
  title: z.string().min(1, 'กรุณาระบุหัวข้อแบบฟอร์ม'),
  description: z.string().optional(),
  roundId: z.string().uuid('กรุณาเลือกรอบการประเมิน'),
  scope: z.enum(['faculty', 'university']),
  ownerFacultyId: z.string().uuid().optional(),
<<<<<<< HEAD
=======
  websiteTargetId: z.string().uuid().optional(),
>>>>>>> feature/ux-login-role-test
});

type CreateFormValues = z.infer<typeof createFormSchema>;

<<<<<<< HEAD
const statusConfig = {
  draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  open: { label: 'เปิดใช้งาน', color: 'bg-green-100 text-green-700 border-green-200' },
  closed: { label: 'ปิดรับแล้ว', color: 'bg-red-100 text-red-700 border-red-200' },
};

// Mock rounds for now
const MOCK_ROUNDS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'รอบที่ 1/2568' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'รอบที่ 2/2568' },
];

export default function FormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'open' | 'closed'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, watch, formState: { errors }, reset } = useForm<CreateFormValues>({
=======
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
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [rounds, setRounds] = useState<{ id: string; name: string }[]>([]);
  const [websites, setWebsites] = useState<{ id: string; name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingWebsites, setFetchingWebsites] = useState(false);
  const [filter, setFilter] = useState<'all' | 'draft' | 'open' | 'closed'>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { register, handleSubmit, control, setValue, formState: { errors }, reset } = useForm<CreateFormValues>({
>>>>>>> feature/ux-login-role-test
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      scope: 'faculty',
    }
  });

<<<<<<< HEAD
  const currentScope = watch('scope');
=======
  const selectedRoundId = useWatch({ control, name: 'roundId' });
  const selectedWebsiteId = useWatch({ control, name: 'websiteTargetId' });

  const selectedWebsite = useMemo(() => 
    websites.find(w => w.id === selectedWebsiteId),
  [websites, selectedWebsiteId]);
>>>>>>> feature/ux-login-role-test

  const fetchForms = async () => {
    try {
      setLoading(true);
<<<<<<< HEAD
      const res = await apiGet('/forms');
=======
      const res = await apiGet('/api/v1/forms');
>>>>>>> feature/ux-login-role-test
      setForms(res.data);
    } catch (err) {
      console.error('Failed to fetch forms:', err);
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  useEffect(() => {
    fetchForms();
  }, []);

  const onCreateForm = async (data: CreateFormValues) => {
    try {
      const res = await apiPost('/forms', data);
=======
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
      const res = await apiPost('/api/v1/forms', data);
>>>>>>> feature/ux-login-role-test
      setIsModalOpen(false);
      reset();
      router.push(`/forms/${res.data.id}/builder`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'สร้างแบบฟอร์มไม่สำเร็จ');
    }
  };

  const onDeleteForm = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแบบฟอร์มนี้? (การลบจะเป็นการ Soft Delete)')) return;
    try {
<<<<<<< HEAD
      await apiDelete(`/forms/${id}`);
=======
      await apiDelete(`/api/v1/forms/${id}`);
>>>>>>> feature/ux-login-role-test
      fetchForms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบแบบฟอร์มไม่สำเร็จ');
    }
  };

<<<<<<< HEAD
  const filteredForms = forms.filter(f => filter === 'all' || f.status === filter);

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-3xl font-bold text-on-surface">จัดการแบบฟอร์มประเมิน</h1>
          <p className="text-gray-500 mt-1">สร้างและแก้ไขแบบฟอร์มสำหรับรอบการประเมินต่างๆ</p>
        </motion.div>

        <motion.button
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          onClick={() => setIsModalOpen(true)}
          className="bg-psu-navy text-white px-5 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-psu-blue-container transition-all shadow-md active:scale-95"
        >
          <Plus className="h-5 w-5" />
          สร้าง Form ใหม่
        </motion.button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
=======
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
>>>>>>> feature/ux-login-role-test
            {(['all', 'draft', 'open', 'closed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
<<<<<<< HEAD
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                  filter === t ? "bg-white text-psu-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
=======
                  "rounded-lg px-4 py-2 text-sm font-medium capitalize transition-colors",
                  filter === t ? "bg-white text-stone-950 shadow-sm dark:bg-stone-900 dark:text-stone-50" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
>>>>>>> feature/ux-login-role-test
                )}
              >
                {t === 'all' ? 'ทั้งหมด' : statusConfig[t].label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
<<<<<<< HEAD
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อแบบฟอร์ม..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-psu-navy/20 outline-none"
=======
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาชื่อแบบฟอร์ม..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] py-2 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/30"
>>>>>>> feature/ux-login-role-test
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
<<<<<<< HEAD
            <div className="p-20 text-center text-gray-400">กำลังโหลดข้อมูล...</div>
          ) : filteredForms.length === 0 ? (
            <div className="p-20 text-center text-gray-400">ไม่พบแบบฟอร์มประเมิน</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
=======
            <div className="p-20 text-center text-[var(--text-muted)]">กำลังโหลดข้อมูล...</div>
          ) : filteredForms.length === 0 ? (
            <div className="p-20 text-center text-[var(--text-muted)]">ไม่พบแบบฟอร์มประเมิน</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
>>>>>>> feature/ux-login-role-test
                <tr>
                  <th className="px-6 py-4 font-semibold">แบบฟอร์มประเมิน</th>
                  <th className="px-6 py-4 font-semibold">รอบการประเมิน</th>
                  <th className="px-6 py-4 font-semibold">ขอบเขต</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
<<<<<<< HEAD
              <tbody className="divide-y divide-gray-50">
=======
              <tbody className="divide-y divide-[var(--border)]">
>>>>>>> feature/ux-login-role-test
                {filteredForms.map((form) => (
                  <tr
                    key={form.id}
                    onClick={() => router.push(`/forms/${form.id}/builder`)}
<<<<<<< HEAD
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <p className="font-bold text-psu-navy group-hover:text-blue-700 transition-colors">{form.title}</p>
                      <p className="text-xs text-gray-400 mt-1">แก้ไขล่าสุด: {new Date(form.updatedAt).toLocaleDateString('th-TH')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {MOCK_ROUNDS.find(r => r.id === form.roundId)?.name || 'ไม่ระบุรอบ'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {form.scope === 'university' ? (
                          <>
                            <Globe className="h-4 w-4 text-blue-400" />
=======
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
>>>>>>> feature/ux-login-role-test
                            <span>มหาวิทยาลัย</span>
                          </>
                        ) : (
                          <>
<<<<<<< HEAD
                            <Users className="h-4 w-4 text-orange-400" />
=======
                            <Users className="h-4 w-4 text-[#CA8A04]" />
>>>>>>> feature/ux-login-role-test
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
<<<<<<< HEAD
                        <button
                          onClick={(e) => onDeleteForm(form.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
=======
                        <PermissionGate permission="form.create">
                          <button
                            onClick={(e) => onDeleteForm(form.id, e)}
                            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </PermissionGate>
                        <ChevronRight className="h-5 w-5 text-[var(--text-disabled)] transition-transform group-hover:translate-x-1" />
>>>>>>> feature/ux-login-role-test
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<<<<<<< HEAD
          <div className="absolute inset-0 bg-psu-navy/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-psu-navy">สร้างแบบฟอร์มประเมินใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <form onSubmit={handleSubmit(onCreateForm)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">หัวข้อแบบฟอร์ม</label>
=======
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">สร้างแบบฟอร์มประเมินใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">×</button>
            </div>
            <form onSubmit={handleSubmit(onCreateForm)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">หัวข้อแบบฟอร์ม</label>
>>>>>>> feature/ux-login-role-test
                <input
                  {...register('title')}
                  type="text"
                  placeholder="เช่น แบบประเมินคุณภาพเว็บไซต์ รอบ 1/2568"
                  className={cn(
<<<<<<< HEAD
                    "w-full px-4 py-3 rounded-xl bg-gray-50 border outline-none focus:ring-2 transition-all",
                    errors.title ? "border-red-300 focus:ring-red-100" : "border-gray-100 focus:ring-psu-navy/10"
=======
                    "w-full rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2",
                    errors.title ? "border-red-300 focus:ring-red-100" : "border-[var(--border)] focus:ring-[#CA8A04]/20"
>>>>>>> feature/ux-login-role-test
                  )}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

<<<<<<< HEAD
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">รอบการประเมิน</label>
                <select
                  {...register('roundId')}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl bg-gray-50 border outline-none focus:ring-2 transition-all appearance-none",
                    errors.roundId ? "border-red-300 focus:ring-red-100" : "border-gray-100 focus:ring-psu-navy/10"
                  )}
                >
                  <option value="">เลือกสรรรอบการประเมิน</option>
                  {MOCK_ROUNDS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                {errors.roundId && <p className="text-red-500 text-xs mt-1">{errors.roundId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ขอบเขต (Scope)</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['faculty', 'university'] as const).map((s) => (
                    <label
                      key={s}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        currentScope === s ? "border-psu-navy bg-blue-50 text-psu-navy" : "border-gray-100 bg-gray-50 text-gray-500"
                      )}
                    >
                      <input type="radio" value={s} {...register('scope')} className="accent-psu-navy" />
                      <span className="text-sm font-medium">{s === 'faculty' ? 'คณะ/หน่วยงาน' : 'มหาวิทยาลัย'}</span>
                    </label>
                  ))}
=======
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">ขอบเขต (Scope)</label>
                  <select
                    {...register('scope')}
                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20"
                  >
                    <option value="faculty">คณะ/หน่วยงาน</option>
                    <option value="university">มหาวิทยาลัย</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">รอบการประเมิน</label>
                  <select
                    {...register('roundId')}
                    className={cn(
                      "w-full appearance-none rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2",
                      errors.roundId ? "border-red-300 focus:ring-red-100" : "border-[var(--border)] focus:ring-[#CA8A04]/20"
                    )}
                  >
                    <option value="">เลือกสรรรอบการประเมิน</option>
                    {rounds.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  {errors.roundId && <p className="text-red-500 text-xs mt-1">{errors.roundId.message}</p>}
>>>>>>> feature/ux-login-role-test
                </div>
              </div>

              <div>
<<<<<<< HEAD
                <label className="block text-sm font-semibold text-gray-700 mb-1">คำอธิบาย (ถ้ามี)</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-psu-navy/10 transition-all resize-none"
=======
                <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">เว็บไซต์เป้าหมาย (จาก Registry)</label>
                <select
                  {...register('websiteTargetId')}
                  disabled={!selectedRoundId || fetchingWebsites}
                  className={cn(
                    "w-full appearance-none rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2",
                    !selectedRoundId ? "cursor-not-allowed opacity-50" : "border-[var(--border)] focus:ring-[#CA8A04]/20"
                  )}
                >
                  <option value="">เลือกเว็บไซต์เป้าหมาย (Optional)</option>
                  {websites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                {!selectedRoundId && <p className="mt-1 text-[10px] italic text-[var(--text-muted)]">กรุณาเลือกรอบการประเมินก่อนเพื่อเลือกเว็บไซต์</p>}
                {selectedWebsite && (
                  <div className="mt-2 flex items-center justify-between rounded-xl bg-amber-50 p-3">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <ExternalLink className="h-3 w-3 shrink-0 text-[#CA8A04]" />
                      <span className="truncate text-xs text-[#92400E]">{selectedWebsite.url}</span>
                    </div>
                    <a href={selectedWebsite.url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[#92400E] underline">เปิดดู</a>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">คำอธิบาย (ถ้ามี)</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20"
>>>>>>> feature/ux-login-role-test
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
<<<<<<< HEAD
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all"
=======
                  className="flex-1 rounded-xl px-4 py-3 font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
>>>>>>> feature/ux-login-role-test
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
<<<<<<< HEAD
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-psu-navy text-white hover:bg-psu-blue-container transition-all"
=======
                  className="flex-1 rounded-xl bg-[#CA8A04] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#A16207]"
>>>>>>> feature/ux-login-role-test
                >
                  สร้างแบบฟอร์ม
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
<<<<<<< HEAD
    </main>
=======
    </div>
>>>>>>> feature/ux-login-role-test
  );
}
