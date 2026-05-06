'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';
import { PermissionGate } from '@/components/auth/PermissionGate';

type AuditLog = {
  id: string;
  uuid: string;
  action: string;
  userId: string | null;
  entityType: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  hash: string;
  prevHash: string;
};

type AuditLogDisplay = AuditLog & { status: 'valid' | 'tampered' };

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'tampered'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; brokenAt?: string; count?: number } | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await apiGet('/api/v1/audit');
        const data = (res.data ?? []).map((log: AuditLog) => ({ ...log, status: 'valid' as const }));
        setLogs(data);
      } catch (err: unknown) {
        console.error('Failed to fetch audit logs:', err);
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const handleVerifyChain = async () => {
    try {
      setVerifying(true);
      const res = await apiGet('/api/v1/audit/verify');
      if (res.status === 'pass') {
        setVerificationResult({ valid: true, count: res.count });
      } else {
        setVerificationResult({ valid: false, brokenAt: String(res.failedAt), count: res.count });
      }
    } catch (err) {
      console.error('Verify failed:', err);
      setVerificationResult({ valid: false, brokenAt: 'Unknown' });
    } finally {
      setVerifying(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.status === filter;
    const matchesSearch =
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.userId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entityType || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!loading && error) {
    return (
      <PermissionGate
        permission="audit.view"
        fallback={<div className="flex h-64 items-center justify-center text-[var(--text-muted)]">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>}
      >
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          ไม่สามารถโหลดบันทึกระบบได้: {error}
        </div>
      </PermissionGate>
    );
  }

  return (
    <PermissionGate
      permission="audit.view"
      fallback={<div className="flex h-64 items-center justify-center text-[var(--text-muted)]">ไม่มีสิทธิ์เข้าถึงหน้านี้</div>}
    >
      <div>
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <motion.div initial={{x: -20, opacity: 0}} animate={{x: 0, opacity: 1}}>
            <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)] flex items-center gap-3">
              <ShieldCheck className="h-7 w-7" />
              บันทึกการตรวจสอบ (Audit Log)
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">ตรวจสอบความถูกต้องของ hash chain และดูกิจกรรมสำคัญในระบบ</p>
          </motion.div>

          <motion.button
            initial={{x: 20, opacity: 0}}
            animate={{x: 0, opacity: 1}}
            onClick={handleVerifyChain}
            disabled={verifying}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-3 font-semibold shadow-sm transition-colors",
              verificationResult?.valid === false
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-[#1C1917] text-white hover:bg-stone-700",
              verifying && "opacity-60 cursor-wait"
            )}
          >
            {verifying ? (
              <span className="animate-spin">⟳</span>
            ) : verificationResult?.valid === false ? (
              <XCircle className="h-4 w-4" />
            ) : verificationResult?.valid === true ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {verifying ? 'กำลังตรวจสอบ...' : 'Verify Hash Chain'}
          </motion.button>
        </div>

        {verificationResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "p-4 rounded-xl mb-6 border",
              verificationResult.valid
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            )}
          >
            <div className="flex items-center gap-2 font-semibold">
              {verificationResult.valid ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {verificationResult.valid
                ? `Hash chain ถูกต้องครบถ้วน (ตรวจสอบ ${verificationResult.count ?? 0} รายการ)`
                : `ตรวจพบการแก้ไขที่ entry: ${verificationResult.brokenAt}`}
            </div>
          </motion.div>
        )}

        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
          <div className="border-b border-[var(--border)] p-4 flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 bg-[var(--bg-subtle)] p-1 rounded-xl w-fit">
              {(['all', 'valid', 'tampered'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    filter === t ? "bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                  )}
                >
                  {t === 'all' ? 'ทั้งหมด' : t === 'valid' ? 'ปกติ' : 'ถูกแก้ไข'}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="ค้นหา action, user, entity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[var(--border)] bg-[var(--bg-surface)] rounded-xl text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/30"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-20 text-center text-[var(--text-muted)]">กำลังโหลดข้อมูล...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-20 text-center text-[var(--text-muted)]">ไม่พบบันทึกการตรวจสอบ</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Action</th>
                    <th className="px-6 py-4 font-semibold">User ID</th>
                    <th className="px-6 py-4 font-semibold">Entity</th>
                    <th className="px-6 py-4 font-semibold">IP</th>
                    <th className="px-6 py-4 font-semibold">เวลา</th>
                    <th className="px-6 py-4 font-semibold text-right">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredLogs.map((log) => (
                    <tr key={log.uuid || log.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                      <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">{log.action}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)] font-mono text-xs max-w-[120px] truncate">{log.userId || 'System'}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">
                        <span className="text-xs font-medium text-[var(--text-muted)]">{log.entityType}</span>
                        {log.entityId && (
                          <span className="ml-1.5 font-mono text-xs text-[var(--text-secondary)]">{log.entityId.substring(0, 8)}...</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[var(--text-muted)] font-mono text-xs">{log.ip || '-'}</td>
                      <td className="px-6 py-4 text-[var(--text-muted)] text-xs">{new Date(log.createdAt).toLocaleString('th-TH')}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                          log.status === 'valid'
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {log.status === 'valid' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {log.status === 'valid' ? 'ปกติ' : 'ถูกแก้ไข'}
                        </span>
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
