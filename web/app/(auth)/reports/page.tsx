'use client';

import React, { useEffect, useState } from 'react';
import { FileJson, FileSpreadsheet, FileText, BarChart3, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { apiGet } from '@/lib/api';

type ExportFormat = 'json' | 'xlsx' | 'pdf';
type ExportStatus = 'idle' | 'loading' | 'success' | 'error';
type Round = { id: string; name: string; academicYear: number; semester: number; status: string };

export default function ReportsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [exportStatus, setExportStatus] = useState<Record<ExportFormat, ExportStatus>>({
    json: 'idle',
    xlsx: 'idle',
    pdf: 'idle',
  });

  // ดึงรอบการประเมินจริงจาก API แทนการ hardcode
  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const res = await apiGet('/api/v1/rounds');
        setRounds(res.data ?? []);
      } catch {
        // แสดง empty state
      } finally {
        setLoadingRounds(false);
      }
    };
    fetchRounds();
  }, []);

  const handleExport = async (format: ExportFormat) => {
    if (!selectedRound) {
      alert('กรุณาเลือกรอบการประเมิน');
      return;
    }

    setExportStatus(prev => ({ ...prev, [format]: 'loading' }));

    // TODO: เชื่อมต่อกับ /api/v1/reports/export เมื่อ backend พร้อม
    setTimeout(() => {
      setExportStatus(prev => ({ ...prev, [format]: 'success' }));
      setTimeout(() => {
        setExportStatus(prev => ({ ...prev, [format]: 'idle' }));
      }, 2000);
    }, 1000);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <motion.div initial={{x: -20, opacity: 0}} animate={{x: 0, opacity: 1}}>
          <h1 className="text-[28px] font-semibold leading-tight text-[var(--text-primary)] flex items-center gap-3">
            <BarChart3 className="h-7 w-7" />
            รายงานผลการประเมิน
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">ส่งออกข้อมูลผลการประเมินคุณภาพเว็บไซต์</p>
        </motion.div>
      </div>

      <motion.section
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm p-6 sm:p-8 mb-6"
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">ส่งออกข้อมูลการประเมิน</h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">เลือกรอบการประเมินและรูปแบบไฟล์ที่ต้องการ</p>

        <div className="mb-6">
          <label htmlFor="round-select" className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
            รอบการประเมิน
          </label>
          {loadingRounds ? (
            <div className="text-sm text-[var(--text-muted)]">กำลังโหลดรอบการประเมิน...</div>
          ) : (
            <select
              id="round-select"
              value={selectedRound}
              onChange={(e) => setSelectedRound(e.target.value)}
              className="w-full max-w-md px-4 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-[#CA8A04]/20 transition-all appearance-none"
            >
              <option value="">-- เลือกรอบการประเมิน --</option>
              {rounds.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.academicYear}/{r.semester})
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h3 className="font-semibold text-[var(--text-primary)]">รูปแบบการส่งออก</h3>
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
              <PermissionGate permission="report.export_pdf">
                <ExportButton
                  icon={FileText}
                  label="PDF"
                  description="รายงานทางการพร้อมลายเซ็น"
                  status={exportStatus.pdf}
                  onClick={() => handleExport('pdf')}
                />
              </PermissionGate>
            </div>
          </motion.div>
        )}
      </motion.section>

      <motion.section
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">ข้อมูลสรุป</h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">ข้อมูลจะแสดงเมื่อเลือกรอบการประเมิน</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <SummaryCard label="เว็บไซต์ทั้งหมด" value="—" />
          <SummaryCard label="ที่ประเมินแล้ว" value="—" />
          <SummaryCard label="คะแนนเฉลี่ย" value="—" />
          <SummaryCard label="อัตราการตอบกลับ" value="—" />
        </div>
      </motion.section>
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
          ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30"
          : "border-[var(--border)] bg-[var(--bg-subtle)] hover:border-[#CA8A04]/30 hover:bg-[var(--bg-surface)]"
      )}
    >
      <Icon
        className={cn(
          "h-8 w-8",
          isSuccess ? "text-green-600" : "text-[var(--text-muted)]"
        )}
      />
      <div className="text-center">
        <p className="font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">{description}</p>
      </div>
      {isLoading && (
        <div className="h-4 w-4 border-2 border-[#CA8A04] border-t-transparent rounded-full animate-spin" />
      )}
      {isSuccess && (
        <span className="text-xs text-green-600 font-medium">สำเร็จ!</span>
      )}
    </button>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--bg-subtle)] rounded-xl p-4 text-center">
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
    </div>
  );
}
