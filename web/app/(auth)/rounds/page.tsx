'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {motion} from 'motion/react';
import {ChevronRight, Plus, Users, X} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {apiGet, apiPost} from '@/lib/api';
import {cn} from '@/lib/utils';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {useAuthStore} from '@/lib/stores/authStore';

type Round = {
  id: string;
  name: string;
  academicYear: number;
  semester: number;
  scope: 'faculty' | 'university';
  status: 'draft' | 'active' | 'closed';
  createdAt: string;
};

const roundSchema = z.object({
  name: z.string().min(1, 'กรุณาระบุชื่อรอบ'),
  academicYear: z.coerce.number().int().min(2500, 'ปีการศึกษาไม่ถูกต้อง'),
  semester: z.coerce.number().int().min(1).max(3),
  scope: z.enum(['faculty', 'university']),
});

type RoundFormValues = z.infer<typeof roundSchema>;

export default function RoundsPage() {
  const {user} = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [closingId, setClosingId] = useState<string | null>(null);

  const {register, handleSubmit, formState: {errors}, reset} = useForm<RoundFormValues>({
    resolver: zodResolver(roundSchema),
    defaultValues: {scope: 'faculty', semester: 1},
  });

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/api/v1/rounds');
      setRounds(res.data ?? []);
    } catch {
      // empty state shown in UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
  }, []);

  const onCreateRound = async (data: RoundFormValues) => {
    try {
      await apiPost('/api/v1/rounds', data);
      setIsModalOpen(false);
      reset();
      await fetchRounds();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'สร้างรอบไม่สำเร็จ');
    }
  };

  const handleCloseRound = async (id: string) => {
    if (!confirm('ยืนยันการปิดรอบการประเมินนี้?')) return;
    try {
      setClosingId(id);
      await apiPost(`/api/v1/rounds/${id}/close`, {});
      await fetchRounds();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ปิดรอบไม่สำเร็จ');
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <motion.div initial={{x: -20, opacity: 0}} animate={{x: 0, opacity: 1}}>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">รอบการประเมิน</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">จัดการรอบการประเมินคุณภาพเว็บไซต์</p>
        </motion.div>

        <PermissionGate permission="round.create.faculty">
          <motion.button
            initial={{x: 20, opacity: 0}}
            animate={{x: 0, opacity: 1}}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#1C1917] px-5 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-stone-700"
          >
            <Plus className="h-5 w-5" />
            สร้างรอบใหม่
          </motion.button>
        </PermissionGate>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 text-center text-[var(--text-muted)]">กำลังโหลดข้อมูล...</div>
          ) : rounds.length === 0 ? (
            <div className="p-20 text-center text-[var(--text-muted)]">ยังไม่มีรอบการประเมิน</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">ชื่อรอบ</th>
                  <th className="px-6 py-4 font-semibold">ปีการศึกษา</th>
                  <th className="px-6 py-4 font-semibold">ภาคเรียน</th>
                  <th className="px-6 py-4 font-semibold">ขอบเขต</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {rounds.map((round) => (
                  <tr key={round.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[var(--text-primary)]">{round.name}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{round.academicYear}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{round.semester}</td>
                    <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                      {round.scope === 'university' ? 'มหาวิทยาลัย' : 'คณะ/หน่วยงาน'}
                    </td>
                    <td className="px-6 py-4">
                      {round.status === 'active' ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">เปิดอยู่</span>
                      ) : round.status === 'draft' ? (
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">แบบร่าง</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">ปิดแล้ว</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/rounds/${round.id}/assignments`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)]"
                        >
                          <Users className="h-3.5 w-3.5" />
                          มอบหมาย
                        </Link>
                        <PermissionGate permission="round.create.faculty">
                          <button
                            onClick={() => handleCloseRound(round.id)}
                            disabled={round.status !== 'active' || closingId === round.id}
                            className={cn(
                              'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                              round.status !== 'active'
                                ? 'cursor-not-allowed opacity-40 bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            )}
                          >
                            {closingId === round.id ? 'กำลังปิด...' : 'ปิดรอบ'}
                          </button>
                        </PermissionGate>
                        <ChevronRight className="h-4 w-4 text-[var(--text-disabled)]" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div
            initial={{scale: 0.9, opacity: 0}}
            animate={{scale: 1, opacity: 1}}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
              <h2 className="text-xl font-semibold text-[var(--text-primary)]">สร้างรอบการประเมินใหม่</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onCreateRound)} className="max-h-[80vh] overflow-y-auto p-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">ชื่อรอบ</label>
                <input
                  {...register('name')}
                  type="text"
                  placeholder="เช่น รอบประเมิน 1/2568"
                  className={cn(
                    'w-full rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2',
                    errors.name ? 'border-red-300 focus:ring-red-100' : 'border-[var(--border)] focus:ring-[#CA8A04]/20'
                  )}
                />
                {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">ปีการศึกษา</label>
                  <input
                    {...register('academicYear')}
                    type="number"
                    placeholder="เช่น 2568"
                    className={cn(
                      'w-full rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2',
                      errors.academicYear ? 'border-red-300 focus:ring-red-100' : 'border-[var(--border)] focus:ring-[#CA8A04]/20'
                    )}
                  />
                  {errors.academicYear && <p className="mt-1 text-xs text-red-500">{errors.academicYear.message}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">ภาคเรียน</label>
                  <select
                    {...register('semester')}
                    className={cn(
                      'w-full appearance-none rounded-xl border bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2',
                      errors.semester ? 'border-red-300 focus:ring-red-100' : 'border-[var(--border)] focus:ring-[#CA8A04]/20'
                    )}
                  >
                    <option value={1}>ภาคเรียนที่ 1</option>
                    <option value={2}>ภาคเรียนที่ 2</option>
                    <option value={3}>ภาคฤดูร้อน</option>
                  </select>
                  {errors.semester && <p className="mt-1 text-xs text-red-500">{errors.semester.message}</p>}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-[var(--text-secondary)]">ขอบเขต</label>
                {isSuperAdmin ? (
                  <select
                    {...register('scope')}
                    className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20"
                  >
                    <option value="faculty">คณะ/หน่วยงาน</option>
                    <option value="university">มหาวิทยาลัย</option>
                  </select>
                ) : (
                  <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3">
                    <span className="text-sm text-[var(--text-secondary)]">ระดับคณะ</span>
                    <input {...register('scope')} type="hidden" value="faculty" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); reset(); }}
                  className="flex-1 rounded-xl px-4 py-3 font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#CA8A04] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#A16207]"
                >
                  สร้างรอบ
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
