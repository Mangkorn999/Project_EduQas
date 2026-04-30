'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileJson, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

type ImportStep = 'upload' | 'preview' | 'confirm';
type ImportFormat = 'json' | 'xlsx';
type ValidationError = { row: number; field: string; message: string };

export interface ImportWizardProps {
  onImport?: (file: File, data: any[]) => Promise<void>;
  onClose?: () => void;
}

export function ImportWizard({ onImport, onClose }: ImportWizardProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'json' && ext !== 'xlsx') {
      alert('กรุณาอัปโหลดไฟล์ .json หรือ .xlsx');
      return;
    }

    setFile(selectedFile);
    setFormat(ext as ImportFormat);
    setStep('preview');

    // TODO: Parse file and validate schema
    // For now, simulate preview
    setTimeout(() => {
      setData([
        { id: 1, name: 'เว็บไซต์ทดสอบ 1', url: 'https://example.com/1' },
        { id: 2, name: 'เว็บไซต์ทดสอบ 2', url: 'https://example.com/2' },
        { id: 3, name: 'เว็บไซต์ทดสอบ 3', url: 'https://example.com/3' },
      ]);
      setErrors([]);
    }, 500);
  };

  const handleImport = async () => {
    if (!file || !data.length) return;

    setIsImporting(true);
    try {
      if (onImport) {
        await onImport(file, data);
      } else {
        // Simulate import
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      setImportComplete({ success: data.length, failed: errors.length });
      setStep('confirm');
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการนำเข้า');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    setData([]);
    setErrors([]);
    setImportComplete(null);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-psu-navy/40 backdrop-blur-sm" onClick={handleClose} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-psu-navy">นำเข้าข้อมูล</h2>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'upload' && 'อัปโหลดไฟล์ JSON หรือ Excel'}
              {step === 'preview' && 'ตรวจสอบข้อมูลก่อนนำเข้า'}
              {step === 'confirm' && 'นำเข้าข้อมูลสำเร็จ'}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 bg-gray-50 flex items-center gap-2">
          <StepIndicator step={1} current={step} label="อัปโหลด" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepIndicator step={2} current={step} label="ตรวจสอบ" />
          <div className="flex-1 h-px bg-gray-200" />
          <StepIndicator step={3} current={step} label="ยืนยัน" />
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'upload' && (
            <UploadStep onFileSelect={handleFileSelect} />
          )}

          {step === 'preview' && (
            <PreviewStep
              file={file!}
              data={data}
              errors={errors}
              onBack={() => setStep('upload')}
              onNext={handleImport}
              isImporting={isImporting}
            />
          )}

          {step === 'confirm' && (
            <ConfirmStep
              result={importComplete!}
              onComplete={handleClose}
            />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StepIndicator({ step, current, label }: { step: number; current: ImportStep; label: string }) {
  const stepNames: ImportStep[] = ['upload', 'preview', 'confirm'];
  const currentIdx = stepNames.indexOf(current);
  const isActive = stepNames.indexOf(current as ImportStep) >= step - 1;

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm",
      isActive ? "text-psu-navy" : "text-gray-400"
    )}>
      <div className={cn(
        "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold",
        isActive ? "bg-psu-navy text-white" : "bg-gray-200 text-gray-500"
      )}>
        {step}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function UploadStep({ onFileSelect }: { onFileSelect: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center hover:border-psu-navy/30 transition-all cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".json,.xlsx"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
      />
      <Upload className="h-12 w-12 text-gray-300 mx-auto mb-4" />
      <p className="font-semibold text-gray-700">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกไฟล์</p>
      <p className="text-sm text-gray-500 mt-2">รองรับไฟล์ .json และ .xlsx</p>
    </div>
  );
}

function PreviewStep({
  file,
  data,
  errors,
  onBack,
  onNext,
  isImporting,
}: {
  file: File;
  data: any[];
  errors: ValidationError[];
  onBack: () => void;
  onNext: () => void;
  isImporting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
        {file.name.endsWith('.json') ? <FileJson className="h-6 w-6 text-blue-500" /> : <FileSpreadsheet className="h-6 w-6 text-green-500" />}
        <div className="flex-1">
          <p className="font-medium text-gray-700">{file.name}</p>
          <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
        </div>
        <span className="text-sm text-gray-500">{data.length} แถว์</span>
      </div>

      {errors.length > 0 && (
        <div className="border border-red-200 rounded-xl p-4 bg-red-50">
          <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
            <AlertCircle className="h-5 w-5" />
            พบข้อผิดพลาด {errors.length} แถว์
          </div>
          <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-auto">
            {errors.slice(0, 5).map((err, i) => (
              <li key={i}>แถว {err.row}: {err.message}</li>
            ))}
            {errors.length > 5 && <li>และอีก {errors.length - 5} ข้อผิดพลาด...</li>}
          </ul>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {data[0] && Object.keys(data[0]).map(key => (
                <th key={key} className="px-4 py-2 text-left font-medium">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.slice(0, 5).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {Object.values(row).map((val: any, j) => (
                  <td key={j} className="px-4 py-2 text-gray-700">{String(val)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 5 && (
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
            แสดง 5 จาก {data.length} แถว์
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onBack}
          disabled={isImporting}
          className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-100 transition-all disabled:opacity-50"
        >
          ย้อนกลับ
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={isImporting}
          className="flex-1 px-4 py-3 rounded-xl font-semibold bg-psu-navy text-white hover:bg-psu-blue-container transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isImporting && <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          นำเข้าข้อมูล
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({ result, onComplete }: { result: { success: number; failed: number }; onComplete: () => void }) {
  return (
    <div className="text-center py-8">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-psu-navy mb-2">นำเข้าข้อมูลสำเร็จ</h3>
      <p className="text-gray-500 mb-6">
        สำเร็จ {result.success} แถว์{result.failed > 0 && ` (ล้มเหลว ${result.failed} แถว์)`}
      </p>
      <button
        onClick={onComplete}
        className="px-8 py-3 bg-psu-navy text-white rounded-xl font-semibold hover:bg-psu-blue-container transition-all"
      >
        เสร็จสิ้น
      </button>
    </div>
  );
}
