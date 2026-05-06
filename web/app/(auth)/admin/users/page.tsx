'use client';

import {useEffect, useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {Search, Trash2} from 'lucide-react';
import {useLocale} from 'next-intl';
import {apiDelete, apiGet, apiPatch} from '@/lib/api';
import {cn} from '@/lib/utils';
import {PermissionGate} from '@/components/auth/PermissionGate';
import {ALL_ROLES, getRoleLabel} from '@/lib/roles';
import type {UserRole} from '@/lib/permissions';

type ManagedUser = {
  id: string;
  displayName: string;
  email: string;
  role: UserRole;
  facultyId: string | null;
};

type Faculty = {id: string; nameTh: string};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  executive: 'bg-amber-100 text-amber-700',
  teacher: 'bg-green-100 text-green-700',
  staff: 'bg-gray-100 text-gray-700',
  student: 'bg-slate-100 text-slate-700',
};

export default function UsersPage() {
  const locale = useLocale();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const facultyMap = useMemo(
    () => new Map(faculties.map((f) => [f.id, f.nameTh])),
    [faculties]
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [usersRes, facultiesRes] = await Promise.all([
        apiGet('/api/v1/users'),
        apiGet('/api/v1/faculties'),
      ]);
      setUsers(usersRes.data ?? []);
      setFaculties(facultiesRes.data ?? []);
    } catch {
      // empty state shown in UI
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingId(userId);
      await apiPatch(`/api/v1/users/${userId}`, {role: newRole});
      setUsers((prev) => prev.map((u) => (u.id === userId ? {...u, role: newRole} : u)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'อัปเดต role ไม่สำเร็จ');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`ยืนยันการลบผู้ใช้ "${name}"?`)) return;
    try {
      setDeletingId(userId);
      await apiDelete(`/api/v1/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ลบผู้ใช้ไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PermissionGate
      permission="user.manage"
      fallback={<div className="flex h-64 items-center justify-center text-[var(--text-muted)]">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>}
    >
      <div>
        <div className="mb-8">
          <motion.div initial={{x: -20, opacity: 0}} animate={{x: 0, opacity: 1}}>
            <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)]">จัดการผู้ใช้งาน</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">ผู้ใช้ถูกสร้างอัตโนมัติเมื่อเข้าสู่ระบบผ่าน PSU Passport</p>
          </motion.div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="border-b border-[var(--border)] p-4">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อหรืออีเมล..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] py-2 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/30" />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center text-[var(--text-muted)]">กำลังโหลดข้อมูล...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-20 text-center text-[var(--text-muted)]">ไม่พบผู้ใช้งาน</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">ชื่อ</th>
                    <th className="px-6 py-4 font-semibold">อีเมล</th>
                    <th className="px-6 py-4 font-semibold">บทบาท</th>
                    <th className="px-6 py-4 font-semibold">คณะ</th>
                    <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                      <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">{u.displayName}</td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', ROLE_COLORS[u.role])}>
                            {getRoleLabel(u.role, locale)}
                          </span>
                          <select value={u.role} disabled={updatingId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            className="appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] px-2 py-1 text-xs outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20 disabled:opacity-50">
                            {ALL_ROLES.map((role) => (
                              <option key={role} value={role}>{getRoleLabel(role, locale)}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{u.facultyId ? (facultyMap.get(u.facultyId) ?? '—') : '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(u.id, u.displayName)} disabled={deletingId === u.id}
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
      </div>
    </PermissionGate>
  );
}
