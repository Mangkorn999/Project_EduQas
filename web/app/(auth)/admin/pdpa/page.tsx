'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileText, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type PdpaRequest = {
  id: string;
  requester: string;
  type: 'access' | 'delete' | 'anonymize';
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  submittedAt: string;
  completedAt?: string;
};

const MOCK_REQUESTS: PdpaRequest[] = [
  { id: '1', requester: 'วิชัย มั่นคง', type: 'access', status: 'pending', submittedAt: '2026-04-29 09:00:00' },
  { id: '2', requester: 'สมชาย รักไทย', type: 'delete', status: 'approved', submittedAt: '2026-04-28 14:00:00', completedAt: '2026-04-28 16:00:00' },
  { id: '3', requester: 'มานี มีตา', type: 'anonymize', status: 'completed', submittedAt: '2026-04-27 10:00:00', completedAt: '2026-04-27 12:00:00' },
];

export default function PdpaPage() {
  const router = useRouter();
  const [requests] = useState<PdpaRequest[]>(MOCK_REQUESTS);
  const [selectedRequest, setSelectedRequest] = useState<PdpaRequest | null>(null);

  const handleApprove = async (id: string) => {
    // TODO: Replace with actual API call when backend is ready
    // await apiPost(`/api/v1/pdpa/${id}/approve`);
    alert(`อนุมัติคำขอ ${id} แล้ว`);
  };

  const handleReject = async (id: string) => {
    // TODO: Replace with actual API call when backend is ready
    // await apiPost(`/api/v1/pdpa/${id}/reject`);
    alert(`ปฏิเสธคำขอ ${id} แล้ว`);
  };

  const getStatusIcon = (status: PdpaRequest['status']) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-orange-500" />;
      case 'approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusLabel = (status: PdpaRequest['status']) => {
    switch (status) {
      case 'pending': return 'รอพิจารณา';
      case 'approved': return 'อนุมัติแล้ว';
      case 'rejected': return 'ปฏิเสธแล้ว';
      case 'completed': return 'ดำเนินการเสร็จ';
    }
  };

  const getStatusColor = (status: PdpaRequest['status']) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'completed': return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getTypeLabel = (type: PdpaRequest['type']) => {
    switch (type) {
      case 'access': return 'ขอเข้าถึงข้อมูล';
      case 'delete': return 'ขอลบข้อมูล';
      case 'anonymize': return 'ขอทำ anonymize';
    }
  };

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
          <span className="hidden sm:inline">PDPA Requests</span>
        </div>
      </header>

      <main className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6">
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8"
        >
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-psu-navy flex items-center gap-2">
              <FileText className="h-6 w-6" />
              คำขอตามสิทธิ PDPA
            </h1>
            <p className="text-sm text-gray-500 mt-1">จัดการคำขอเข้าถึง ลบ หรือทำ anonymize ข้อมูลส่วนบุคคล</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">ผู้ขอ</th>
                  <th className="px-4 py-3 font-medium">ประเภท</th>
                  <th className="px-4 py-3 font-medium">สถานะ</th>
                  <th className="px-4 py-3 font-medium">ยื่นเมื่อ</th>
                  <th className="px-4 py-3 font-medium">เสร็จเมื่อ</th>
                  <th className="px-4 py-3 font-medium text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{req.requester}</td>
                    <td className="px-4 py-3 text-gray-600">{getTypeLabel(req.type)}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                        getStatusColor(req.status)
                      )}>
                        {getStatusIcon(req.status)}
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{req.submittedAt}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{req.completedAt || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="p-2 text-gray-400 hover:text-psu-navy hover:bg-psu-navy/10 rounded-lg transition-all"
                          aria-label="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {req.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="px-3 py-1 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 rounded-lg transition-all"
                            >
                              อนุมัติ
                            </button>
                            <button
                              onClick={() => handleReject(req.id)}
                              className="px-3 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-all"
                            >
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {requests.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                ไม่มีคำขอ PDPA
              </div>
            )}
          </div>
        </motion.section>
      </main>

      {/* Detail Modal */}
      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => {
            handleApprove(selectedRequest.id);
            setSelectedRequest(null);
          }}
          onReject={() => {
            handleReject(selectedRequest.id);
            setSelectedRequest(null);
          }}
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-psu-navy/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-psu-navy">รายละเอียดคำขอ</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">ผู้ขอ</p>
              <p className="font-medium text-gray-700">{request.requester}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ประเภท</p>
              <p className="font-medium text-gray-700">
                {request.type === 'access' && 'ขอเข้าถึงข้อมูล'}
                {request.type === 'delete' && 'ขอลบข้อมูล'}
                {request.type === 'anonymize' && 'ขอทำ anonymize'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">สถานะ</p>
              <p className="font-medium">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs",
                  request.status === 'pending' && "bg-orange-100 text-orange-700",
                  request.status === 'approved' && "bg-green-100 text-green-700",
                  request.status === 'rejected' && "bg-red-100 text-red-700",
                  request.status === 'completed' && "bg-blue-100 text-blue-700",
                )}>
                  {request.status === 'pending' && 'รอพิจารณา'}
                  {request.status === 'approved' && 'อนุมัติแล้ว'}
                  {request.status === 'rejected' && 'ปฏิเสธแล้ว'}
                  {request.status === 'completed' && 'ดำเนินการเสร็จ'}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ยื่นเมื่อ</p>
              <p className="font-medium text-gray-700">{request.submittedAt}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-psu-navy mb-2">Timeline</h3>
            <div className="space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-psu-navy" />
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
        <div className="p-6 border-t border-gray-100 flex gap-3">
          {request.status === 'pending' ? (
            <>
              <button
                onClick={onReject}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-red-700 bg-red-50 hover:bg-red-100 transition-all"
              >
                ปฏิเสธ
              </button>
              <button
                onClick={onApprove}
                className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-psu-navy hover:bg-psu-blue-container transition-all"
              >
                อนุมัติ
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all"
            >
              ปิด
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
