'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Plus, Search, Filter, Trash2, ChevronRight, Calendar, Users, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';

const createFormSchema = z.object({
  title: z.string().min(1, 'กรุณาระบุหัวข้อแบบฟอร์ม'),
  description: z.string().optional(),
  roundId: z.string().uuid('กรุณาเลือกรอบการประเมิน'),
  scope: z.enum(['faculty', 'university']),
  ownerFacultyId: z.string().uuid().optional(),
});

type CreateFormValues = z.infer<typeof createFormSchema>;

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
    resolver: zodResolver(createFormSchema),
    defaultValues: {
      scope: 'faculty',
    }
  });

  const currentScope = watch('scope');

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/forms');
      setForms(res.data);
    } catch (err) {
      console.error('Failed to fetch forms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, []);

  const onCreateForm = async (data: CreateFormValues) => {
    try {
      const res = await apiPost('/forms', data);
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
      await apiDelete(`/forms/${id}`);
      fetchForms();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบแบบฟอร์มไม่สำเร็จ');
    }
  };

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
            {(['all', 'draft', 'open', 'closed'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                  filter === t ? "bg-white text-psu-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                {t === 'all' ? 'ทั้งหมด' : statusConfig[t].label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อแบบฟอร์ม..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-psu-navy/20 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-gray-400">กำลังโหลดข้อมูล...</div>
          ) : filteredForms.length === 0 ? (
            <div className="p-20 text-center text-gray-400">ไม่พบแบบฟอร์มประเมิน</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">แบบฟอร์มประเมิน</th>
                  <th className="px-6 py-4 font-semibold">รอบการประเมิน</th>
                  <th className="px-6 py-4 font-semibold">ขอบเขต</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredForms.map((form) => (
                  <tr
                    key={form.id}
                    onClick={() => router.push(`/forms/${form.id}/builder`)}
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
                            <span>มหาวิทยาลัย</span>
                          </>
                        ) : (
                          <>
                            <Users className="h-4 w-4 text-orange-400" />
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
                        <button
                          onClick={(e) => onDeleteForm(form.id, e)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <ChevronRight className="h-5 w-5 text-gray-300 group-hover:translate-x-1 transition-transform" />
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
                <input
                  {...register('title')}
                  type="text"
                  placeholder="เช่น แบบประเมินคุณภาพเว็บไซต์ รอบ 1/2568"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl bg-gray-50 border outline-none focus:ring-2 transition-all",
                    errors.title ? "border-red-300 focus:ring-red-100" : "border-gray-100 focus:ring-psu-navy/10"
                  )}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
              </div>

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
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">คำอธิบาย (ถ้ามี)</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-psu-navy/10 transition-all resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 rounded-xl font-semibold bg-psu-navy text-white hover:bg-psu-blue-container transition-all"
                >
                  สร้างแบบฟอร์ม
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </main>
  );
}
