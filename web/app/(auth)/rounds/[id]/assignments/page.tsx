'use client';

import {useEffect, useMemo, useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft, Globe, Trash2, UserPlus} from 'lucide-react';
import {apiDelete, apiGet} from '@/lib/api';
import {useAuthStore} from '@/lib/stores/authStore';
import {AssignmentDialog} from '@/components/assignment/AssignmentDialog';

type Round = {
  id: string;
  name: string;
  academicYear: number;
  semester: number;
  scope: 'faculty' | 'university';
  status: 'draft' | 'active' | 'closed';
};

type Assignment = {
  id: string;
  userId: string;
  userName: string;
  websiteId: string;
  websiteName: string;
  websiteUrl: string;
  role: string;
};

type RawAssignment = {
  id: string;
  roundId: string;
  websiteId: string;
  createdAt: string;
  user: {id: string; displayName: string; email: string; role: string};
};

type WebsiteMap = Map<string, {name: string; url: string}>;
type FacultyMap = Map<string, string>;

export default function AssignmentsPage() {
  const params = useParams<{id: string}>();
  const roundId = params.id;
  const {user} = useAuthStore();

  const [round, setRound] = useState<Round | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignDialog, setAssignDialog] = useState<{isOpen: boolean; websiteId: string | null}>({isOpen: false, websiteId: null});
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [userFacultyName, setUserFacultyName] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roundsRes, assignmentsRes, websitesRes, facultiesRes] = await Promise.all([
        apiGet('/api/v1/rounds'),
        apiGet(`/api/v1/rounds/${roundId}/assignments`),
        apiGet('/api/v1/websites'),
        apiGet('/api/v1/faculties'),
      ]);

      setRound((roundsRes.data ?? []).find((r: Round) => r.id === roundId) ?? null);

      const websiteMap: WebsiteMap = new Map(
        (websitesRes.data ?? []).map((w: {id: string; name: string; url: string}) => [w.id, {name: w.name, url: w.url}])
      );

      const facultyMap: FacultyMap = new Map(
        (facultiesRes.data ?? []).map((f: {id: string; nameTh: string}) => [f.id, f.nameTh])
      );

      if (user?.faculty) {
        setUserFacultyName(facultyMap.get(user.faculty) ?? null);
      }

      const mapped: Assignment[] = (assignmentsRes.data ?? []).map((raw: RawAssignment) => ({
        id: raw.id,
        userId: raw.user.id,
        userName: raw.user.displayName,
        websiteId: raw.websiteId,
        websiteName: websiteMap.get(raw.websiteId)?.name ?? raw.websiteId,
        websiteUrl: websiteMap.get(raw.websiteId)?.url ?? '',
        role: raw.user.role,
      }));

      setAssignments(mapped);
    } catch {
      // empty state shown in UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const websiteCards = useMemo(() => {
    const map = new Map<string, {id: string; name: string; url: string; count: number}>();
    for (const a of assignments) {
      const existing = map.get(a.websiteId);
      if (existing) { existing.count += 1; }
      else { map.set(a.websiteId, {id: a.websiteId, name: a.websiteName, url: a.websiteUrl, count: 1}); }
    }
    return Array.from(map.values());
  }, [assignments]);

  const handleRemove = async (assignmentId: string) => {
    if (!confirm('ยืนยันการยกเลิกการมอบหมายนี้?')) return;
    try {
      setRemovingId(assignmentId);
      await apiDelete(`/api/v1/rounds/${roundId}/assignments/${assignmentId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ยกเลิกไม่สำเร็จ');
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-[var(--text-muted)]">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/rounds" className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="h-4 w-4" /> กลับไปรายการรอบ
        </Link>

        {round ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#1B2D5B]">{round.name}</h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  ปีการศึกษา {round.academicYear} ภาคเรียนที่ {round.semester}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-xs font-semibold text-[#1B2D5B]">
                  {round.scope === 'university' ? 'มหาวิทยาลัย' : 'คณะ/หน่วยงาน'}
                </span>
                {round.status === 'active'
                  ? <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">เปิดอยู่</span>
                  : round.status === 'draft'
                    ? <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">แบบร่าง</span>
                    : <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">ปิดแล้ว</span>}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">ไม่พบข้อมูลรอบ</p>
        )}
      </div>

      <section>
        <h2 className="mb-4 text-base font-bold text-[#1B2D5B]">เว็บไซต์ในรอบนี้</h2>
        {websiteCards.length === 0 ? (
          <p className="rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-10 text-center text-sm text-[var(--text-muted)]">ยังไม่มีการมอบหมาย</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {websiteCards.map((website) => (
              <div key={website.id} className="flex items-start justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-sm">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#1B2D5B]">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{website.name}</p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{website.url}</p>
                    <span className="mt-1 inline-block rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-semibold text-[#1B2D5B]">{website.count} คน</span>
                  </div>
                </div>
                <button
                  onClick={() => setAssignDialog({isOpen: true, websiteId: website.id})}
                  className="ml-3 shrink-0 flex items-center gap-1.5 rounded-lg bg-[#1B2D5B] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#2D5FA6]"
                >
                  <UserPlus className="h-3.5 w-3.5" /> มอบหมาย
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-base font-bold text-[#1B2D5B]">รายการผู้ประเมิน</h2>
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="overflow-x-auto">
            {assignments.length === 0 ? (
              <div className="p-16 text-center text-sm text-[var(--text-muted)]">ยังไม่มีการมอบหมาย</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">ผู้ประเมิน</th>
                    <th className="px-6 py-4 font-semibold">เว็บไซต์</th>
                    <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {assignments.map((a) => (
                    <tr key={a.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{a.userName}</p>
                        <p className="text-xs text-[var(--text-muted)]">{a.role}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{a.websiteName}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleRemove(a.id)} disabled={removingId === a.id}
                          className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <AssignmentDialog
        roundId={roundId}
        websiteId={assignDialog.websiteId}
        isOpen={assignDialog.isOpen}
        onClose={() => { setAssignDialog({isOpen: false, websiteId: null}); fetchData(); }}
        isSuperAdmin={user?.role === 'super_admin'}
        userFacultyId={user?.faculty ?? null}
        userFacultyName={userFacultyName}
      />
    </div>
  );
}
