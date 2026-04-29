'use client';

import React, { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, FileText, X } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type ExportFormat = 'json' | 'xlsx' | 'pdf';
type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ExportMenuProps {
  roundId?: string;
  onExport?: (format: ExportFormat) => Promise<void>;
}

export function ExportMenu({ roundId, onExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<Record<ExportFormat, ExportStatus>>({
    json: 'idle',
    xlsx: 'idle',
    pdf: 'idle',
  });

  const handleExport = async (format: ExportFormat) => {
    setStatus(prev => ({ ...prev, [format]: 'loading' }));

    try {
      if (onExport) {
        await onExport(format);
      } else {
        // Fallback: simulate export
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      setStatus(prev => ({ ...prev, [format]: 'success' }));
      setTimeout(() => {
        setStatus(prev => ({ ...prev, [format]: 'idle' }));
      }, 2000);
    } catch (err) {
      setStatus(prev => ({ ...prev, [format]: 'error' }));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-psu-navy text-white rounded-lg hover:bg-psu-blue-container transition-all"
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">ส่งออก</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm text-psu-navy">รูปแบบการส่งออก</span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="ปิดเมนู"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-2">
              <ExportOption
                icon={FileJson}
                label="JSON"
                description="ข้อมูลดิบสำหรับพัฒนาต่อ"
                status={status.json}
                onClick={() => handleExport('json')}
              />
              <ExportOption
                icon={FileSpreadsheet}
                label="Excel"
                description="รายงานแบบตารางพร้อมจัดพิมพ์"
                status={status.xlsx}
                onClick={() => handleExport('xlsx')}
              />
              <ExportOption
                icon={FileText}
                label="PDF"
                description="รายงานทางการพร้อมลายเซ็น"
                status={status.pdf}
                onClick={() => handleExport('pdf')}
              />
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

type ExportOptionProps = {
  icon: React.ElementType;
  label: string;
  description: string;
  status: ExportStatus;
  onClick: () => void;
};

function ExportOption({ icon: Icon, label, description, status, onClick }: ExportOptionProps) {
  const isLoading = status === 'loading';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        isSuccess
          ? "bg-green-50 text-green-700"
          : isError
          ? "bg-red-50 text-red-700"
          : "hover:bg-gray-50"
      )}
    >
      <Icon className={cn(
        "h-5 w-5",
        isSuccess ? "text-green-600" : isError ? "text-red-600" : "text-gray-400"
      )} />
      <div className="flex-1 text-left">
        <p className={cn(
          "text-sm font-medium",
          isSuccess || isError ? "" : "text-gray-700"
        )}>
          {label}
        </p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {isLoading && (
        <div className="h-4 w-4 border-2 border-psu-navy border-t-transparent rounded-full animate-spin" />
      )}
      {isSuccess && <span className="text-xs">✓</span>}
      {isError && <span className="text-xs">✗</span>}
    </button>
  );
}
