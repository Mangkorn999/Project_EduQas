'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileJson, FileSpreadsheet, FileText, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type ExportFormat = 'json' | 'xlsx' | 'pdf';
type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ReportsPage() {
  const router = useRouter();
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [exportStatus, setExportStatus] = useState<Record<ExportFormat, ExportStatus>>({
    json: 'idle',
    xlsx: 'idle',
    pdf: 'idle',
  });

  const handleExport = async (format: ExportFormat) => {
    if (!selectedRound) {
      alert('กรุณาเลือกรอบการประเมิน');
      return;
    }

    setExportStatus(prev => ({ ...prev, [format]: 'loading' }));

    // TODO: Replace with actual API call when backend is ready
    // const res = await apiPost('/export', { roundId: selectedRound, format });
    setTimeout(() => {
      setExportStatus(prev => ({ ...prev, [format]: 'success' }));
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [format]: 'idle' }));
      }, 2000);
    }, 1000);
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
          <span className="hidden sm:inline">รายงาน</span>
        </div>
      </header>

      <main className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8"
        >
          <h1 className="text-2xl font-bold text-psu-navy mb-2">ส่งออกข้อมูลการประเมิน</h1>
          <p className="text-sm text-gray-500 mb-6">เลือกรอบการประเมินและรูปแบบไฟล์ที่ต้องการ</p>

          <div className="mb-6">
            <label htmlFor="round-select" className="block text-sm font-semibold text-gray-700 mb-2">
              รอบการประเมิน
            </label>
            <select
              id="round-select"
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="w-full max-w-md px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-psu-navy/20 transition-all"
            >
              <option value="">-- เลือกรอบการประเมิน --</option>
              <option value="round-1">รอบที่ 1/2568</option>
              <option value="round-2">รอบที่ 2/2568</option>
            </select>
          </div>

          {selectedRound && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="font-semibold text-psu-navy">รูปแบบการส่งออก</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ExportButton
                  icon={FileJson}
                  label="JSON"
                  description="ข้อมูลดิบสำหรับพัฒนาต่อ"
                  status={exportStatus.json}
                  onClick={() => handleExport('json')}
                />
                <ExportButton
                  icon={FileSpreadsheet}
                  label="Excel"
                  description="รายงานแบบตารางพร้อมจัดพิมพ์"
                  status={exportStatus.xlsx}
                  onClick={() => handleExport('xlsx')}
                />
                <ExportButton
                  icon={FileText}
                  label="PDF"
                  description="รายงานทางการพร้อมลายเซ็น"
                  status={exportStatus.pdf}
                  onClick={() => handleExport('pdf')}
                />
              </div>
            </motion.div>
          )}
        </motion.section>

        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 sm:p-8"
        >
          <h2 className="text-lg font-bold text-psu-navy mb-4">ข้อมูลสรุป</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard label="เว็บไซต์ทั้งหมด" value="12" />
            <SummaryCard label="ที่ประเมินแล้ว" value="8" />
            <SummaryCard label="คะแนนเฉลี่ย" value="78.5" />
            <SummaryCard label="อัตราการตอบกลับ" value="66.7%" />
          </div>
        </motion.section>
      </main>
    </div>
  );
}

type ExportButtonProps = {
  icon: React.ElementType;
  label: string;
  description: string;
  status: ExportStatus;
  onClick: () => void;
};

function ExportButton({ icon: Icon, label, description, status, onClick }: ExportButtonProps) {
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all",
        isSuccess
          ? "border-green-300 bg-green-50"
          : "border-gray-100 bg-gray-50 hover:border-psu-navy/30 hover:bg-white"
      )}
    >
      <Icon
        className={cn(
          "h-8 w-8",
          isSuccess ? "text-green-600" : "text-gray-400"
        )}
      />
      <div className="text-center">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      {isLoading && (
        <div className="h-4 w-4 border-2 border-psu-navy border-t-transparent rounded-full animate-spin" />
      )}
      {isSuccess && (
        <span className="text-xs text-green-600 font-medium">สำเร็จ!</span>
      )}
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-psu-navy">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
