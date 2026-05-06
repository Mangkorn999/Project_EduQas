'use client';

import {useEffect, useState} from 'react';
import {motion} from 'motion/react';
import {X} from 'lucide-react';
import {apiGet, apiPost} from '@/lib/api';
import {cn} from '@/lib/utils';

type Props = {
  roundId: string;
  websiteId: string | null;
  isOpen: boolean;
  onClose: () => void;
  isSuperAdmin: boolean;
  userFacultyId: string | null;
  userFacultyName: string | null;
};

type PreviewResult = {total: number; byRole: Record<string, number>};

type Faculty = {id: string; nameTh: string};

const ASSIGNABLE_ROLES = ['teacher', 'staff', 'student'] as const;
const ROLE_LABELS: Record<string, string> = {
  teacher: 'อาจารย์',
  staff: 'บุคลากร',
  student: 'นักศึกษา',
};

export function AssignmentDialog({roundId, websiteId, isOpen, onClose, isSuperAdmin, userFacultyId, userFacultyName}: Props) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['teacher', 'staff']);
  const [facultyId, setFacultyId] = useState<string>('all');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedRoles(['teacher', 'staff']);
    setFacultyId(isSuperAdmin ? 'all' : (userFacultyId ?? 'all'));
    setPreview(null);
    setError(null);
    if (isSuperAdmin) {
      apiGet('/api/v1/faculties').then((res) => setFaculties(res.data ?? [])).catch(() => {});
    }
  }, [isOpen, isSuperAdmin, userFacultyId]);

  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    setPreview(null);
  };

  const handlePreview = async () => {
    if (selectedRoles.length === 0) { setError('เลือกอย่างน้อย 1 บทบาท'); return; }
    setError(null);
    setPreviewLoading(true);
    try {
      const params = new URLSearchParams({roles: selectedRoles.join(','), facultyId});
      const res = await apiGet(`/api/v1/assignments/preview-count?${params}`);
      setPreview(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลด preview ไม่สำเร็จ');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!websiteId) return;
    if (selectedRoles.length === 0) { setError('เลือกอย่างน้อย 1 บทบาท'); return; }
    setError(null);
    setSubmitting(true);
    try {
      await apiPost('/api/v1/assignments/bulk-by-role', {roundId, websiteId, roles: selectedRoles, facultyId});
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'มอบหมายไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{scale: 0.9, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">มอบหมายผู้ประเมิน</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">เลือกบทบาท</p>
            <div className="flex flex-wrap gap-2">
              {ASSIGNABLE_ROLES.map((role) => (
                <button
                  key={role}
                  onClick={() => toggleRole(role)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                    selectedRoles.includes(role)
                      ? 'border-[#1B2D5B] bg-[#1B2D5B] text-white'
                      : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-[#1B2D5B]'
                  )}
                >
                  {ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          {isSuperAdmin && (
            <div>
              <p className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">คณะ/หน่วยงาน</p>
              <select
                value={facultyId}
                onChange={(e) => { setFacultyId(e.target.value); setPreview(null); }}
                className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20"
              >
                <option value="all">ทุกคณะ/หน่วยงาน</option>
                {faculties.map((f) => <option key={f.id} value={f.id}>{f.nameTh}</option>)}
              </select>
            </div>
          )}

          {!isSuperAdmin && userFacultyName && (
            <p className="text-sm text-[var(--text-muted)]">
              คณะ: <span className="font-semibold text-[var(--text-primary)]">{userFacultyName}</span>
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          {preview && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-4">
              <p className="mb-2 text-sm font-semibold text-[var(--text-primary)]">จำนวนที่จะมอบหมาย: {preview.total} คน</p>
              <div className="space-y-1">
                {Object.entries(preview.byRole).map(([role, count]) => (
                  <p key={role} className="text-xs text-[var(--text-muted)]">
                    {ROLE_LABELS[role] ?? role}: {count} คน
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={handlePreview}
              disabled={previewLoading || selectedRoles.length === 0}
              className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-subtle)] disabled:opacity-50"
            >
              {previewLoading ? 'กำลังโหลด...' : 'ดูตัวอย่าง'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || selectedRoles.length === 0}
              className="flex-1 rounded-xl bg-[#1B2D5B] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2D5FA6] disabled:opacity-50"
            >
              {submitting ? 'กำลังบันทึก...' : 'ยืนยันมอบหมาย'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
