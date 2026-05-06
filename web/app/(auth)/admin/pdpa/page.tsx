'use client';

import React, {useState} from 'react';
import {Eye, FileText, CheckCircle, XCircle, Clock} from 'lucide-react';
import {motion} from 'motion/react';
import {cn} from '@/lib/utils';

type PdpaRequest = {
  id: string;
  requester: string;
  type: 'access' | 'delete' | 'anonymize';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  submittedAt: string;
  completedAt?: string;
};

const MOCK_REQUESTS: PdpaRequest[] = [
  {id: '1', requester: 'วิชัย มั่นคง', type: 'access', status: 'pending', submittedAt: '2026-04-29 09:00:00'},
  {id: '2', requester: 'สมชาย รักไทย', type: 'delete', status: 'approved', submittedAt: '2026-04-28 14:00:00', completedAt: '2026-04-28 16:00:00'},
  {id: '3', requester: 'มานี มีตา', type: 'anonymize', status: 'completed', submittedAt: '2026-04-27 10:00:00', completedAt: '2026-04-27 12:00:00'},
];

const STATUS_CONFIG: Record<PdpaRequest['status'], {label: string; cls: string}> = {
  pending:   {label: 'รอพิจารณา',       cls: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50'},
  approved:  {label: 'อนุมัติแล้ว',     cls: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50'},
  rejected:  {label: 'ปฏิเสธแล้ว',      cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50'},
  completed: {label: 'ดำเนินการเสร็จ',  cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50'},
};

const TYPE_LABELS: Record<PdpaRequest['type'], string> = {
  access:    'ขอเข้าถึงข้อมูล',
  delete:    'ขอลบข้อมูล',
  anonymize: 'ขอทำ Anonymize',
};

function StatusIcon({status}: {status: PdpaRequest['status']}) {
  if (status === 'pending')   return <Clock className="h-3.5 w-3.5" />;
  if (status === 'rejected')  return <XCircle className="h-3.5 w-3.5" />;
  return <CheckCircle className="h-3.5 w-3.5" />;
}

export default function PdpaPage() {
  const [requests] = useState<PdpaRequest[]>(MOCK_REQUESTS);
  const [selected, setSelected] = useState<PdpaRequest | null>(null);

  const handleApprove = async (id: string) => {
    // TODO: apiPost(`/api/v1/pdpa/${id}/approve`)
    alert(`อนุมัติคำขอ ${id} แล้ว`);
  };

  const handleReject = async (id: string) => {
    // TODO: apiPost(`/api/v1/pdpa/${id}/reject`)
    alert(`ปฏิเสธคำขอ ${id} แล้ว`);
  };

  return (
    <div>
      <div className="mb-8">
        <motion.div initial={{x: -20, opacity: 0}} animate={{x: 0, opacity: 1}}>
          <h1 className="flex items-center gap-3 text-[28px] font-semibold leading-tight text-[var(--text-primary)]">
            <FileText className="h-7 w-7" />
            คำขอตามสิทธิ PDPA
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">จัดการคำขอเข้าถึง ลบ หรือทำ Anonymize ข้อมูลส่วนบุคคล</p>
        </motion.div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="p-20 text-center text-[var(--text-muted)]">ไม่มีคำขอ PDPA</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-subtle)] text-xs uppercase tracking-wider text-[var(--text-muted)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">ผู้ขอ</th>
                  <th className="px-6 py-4 font-semibold">ประเภท</th>
                  <th className="px-6 py-4 font-semibold">สถานะ</th>
                  <th className="px-6 py-4 font-semibold">ยื่นเมื่อ</th>
                  <th className="px-6 py-4 font-semibold">เสร็จเมื่อ</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {requests.map((req) => {
                  const cfg = STATUS_CONFIG[req.status];
                  return (
                    <tr key={req.id} className="transition-colors hover:bg-[var(--bg-subtle)]">
                      <td className="px-6 py-4 font-semibold text-[var(--text-primary)]">{req.requester}</td>
                      <td className="px-6 py-4 text-[var(--text-secondary)]">{TYPE_LABELS[req.type]}</td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', cfg.cls)}>
                          <StatusIcon status={req.status} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{req.submittedAt}</td>
                      <td className="px-6 py-4 font-mono text-xs text-[var(--text-muted)]">{req.completedAt ?? '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelected(req)}
                            className="rounded-lg p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                            aria-label="ดูรายละเอียด"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {req.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-100 transition-colors hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                              >
                                อนุมัติ
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 bg-red-100 transition-colors hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                              >
                                ปฏิเสธ
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && (
        <RequestDetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onApprove={() => {handleApprove(selected.id); setSelected(null);}}
          onReject={() => {handleReject(selected.id); setSelected(null);}}
        />
      )}
    </div>
  );
}

function RequestDetailModal({
  request,
  onClose,
  onApprove,
  onReject,
}: {
  request: PdpaRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const cfg = STATUS_CONFIG[request.status];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{scale: 0.95, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">รายละเอียดคำขอ</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--text-muted)]">ผู้ขอ</p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">{request.requester}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">ประเภท</p>
              <p className="mt-1 font-semibold text-[var(--text-primary)]">{TYPE_LABELS[request.type]}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">สถานะ</p>
              <span className={cn('mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold', cfg.cls)}>
                <StatusIcon status={request.status} />
                {cfg.label}
              </span>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">ยื่นเมื่อ</p>
              <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{request.submittedAt}</p>
            </div>
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Timeline</h3>
            <div className="space-y-2 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />
                <span>ยื่นคำขอ: {request.submittedAt}</span>
              </div>
              {request.completedAt && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>ดำเนินการเสร็จ: {request.completedAt}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-[var(--border)] p-6">
          {request.status === 'pending' ? (
            <>
              <button
                onClick={onReject}
                className="flex-1 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                ปฏิเสธ
              </button>
              <button
                onClick={onApprove}
                className="flex-1 rounded-xl bg-[#1B2D5B] px-4 py-3 font-semibold text-white transition-colors hover:bg-[#2D5FA6]"
              >
                อนุมัติ
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 rounded-xl px-4 py-3 font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)]"
            >
              ปิด
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
