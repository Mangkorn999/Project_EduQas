'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Search, Filter, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type AuditLog = {
  id: string;
  action: string;
  actor: string;
  target: string;
  timestamp: string;
  status: 'valid' | 'tampered';
};

// Mock data for placeholder
const MOCK_AUDIT_LOGS: AuditLog[] = [
  { id: '1', action: 'login', actor: 'สมชาย รักไทย', target: 'system', timestamp: '2026-04-29 10:00:00', status: 'valid' },
  { id: '2', action: 'form.publish', actor: 'สมชาย รักไทย', target: 'form-001', timestamp: '2026-04-29 10:05:00', status: 'valid' },
  { id: '3', action: 'response.submit', actor: 'วิชัย มั่นคง', target: 'response-042', timestamp: '2026-04-29 10:10:00', status: 'valid' },
  { id: '4', action: 'user.delete', actor: 'สมชาย รักไทย', target: 'user-099', timestamp: '2026-04-29 10:15:00', status: 'valid' },
];

export default function AuditLogPage() {
  const router = useRouter();
  const [logs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
  const [filter, setFilter] = useState<'all' | 'valid' | 'tampered'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ valid: boolean; brokenAt?: string } | null>(null);

  const handleVerifyChain = async () => {
    // TODO: Replace with actual API call when backend is ready
    // const res = await apiGet('/audit/verify');
    setVerificationResult({ valid: true });
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.status === filter;
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.target.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 sticky top-0 z-10">
        <button
          onClick={() => router.push('/evaluator')}
          aria-label="กลับไปหน้ารายการประเมิน"
          className="flex items-center gap-2 text-sm font-bold text-psu-navy hover:bg-gray-100 px-4 py-2 rounded-lg transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden md:inline">กลับไปหน้าประเมิน</span>
        </button>
        <div className="text-lg font-bold text-psu-navy">
          <span className="hidden sm:inline">Audit Log</span>
        </div>
      </header>

      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-psu-navy flex items-center gap-2">
                <Shield className="h-6 w-6" />
                บันทึกการตรวจสอบ
              </h1>
              <p className="text-sm text-gray-500 mt-1">ตรวจสอบความถูกต้องของ hash chain และดูกิจกรรมสำคัญ</p>
            </div>
            <button
              onClick={handleVerifyChain}
              className={cn(
                "px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all",
                verificationResult?.valid === false
                  ? "bg-red-100 text-red-700"
                  : "bg-psu-navy text-white hover:bg-psu-blue-container"
              )}
            >
              {verificationResult?.valid === false ? (
                <XCircle className="h-4 w-4" />
              ) : verificationResult?.valid === true ? (
                <CheckCircle className="h-4 w-4" />
              ) : null}
              Verify Chain
            </button>
          </div>

          {verificationResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-xl mb-6",
                verificationResult.valid
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              )}
            >
              <div className="flex items-center gap-2 font-semibold">
                {verificationResult.valid ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {verificationResult.valid
                  ? 'Hash chain ถูกต้องครบถ้วน'
                  : `ตรวจพบการแก้ไขที่ entry: ${verificationResult.brokenAt}`}
              </div>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl w-fit">
              {(['all', 'valid', 'tampered'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    filter === t ? "bg-white text-psu-navy shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {t === 'all' ? 'ทั้งหมด' : t === 'valid' ? 'ปกติ' : 'ถูกแก้ไข'}
                </button>
              ))}
            </div>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหา action, actor, target..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-psu-navy/20 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Target</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{log.action}</td>
                    <td className="px-4 py-3 text-gray-600">{log.actor}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.target}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{log.timestamp}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
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
            {filteredLogs.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                ไม่พบบันทึกการตรวจสอบ
              </div>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
