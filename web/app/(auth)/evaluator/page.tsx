'use client';

import Link from 'next/link';
import {ArrowLeft, FileText} from 'lucide-react';

export default function EvaluatorIndexPage() {
  return (
    <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
      <section className="w-full max-w-xl rounded-xl border border-[#E7E5E4] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
          <FileText className="h-6 w-6" />
        </div>
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-[#0C0A09]">เลือกเว็บไซต์จากแดชบอร์ด</h1>
        <p className="mt-2 text-sm leading-6 text-[#78716C]">
          หน้านี้ใช้สำหรับกรอกแบบประเมินของเว็บไซต์ที่ได้รับมอบหมาย กรุณาเริ่มจากรายการเว็บไซต์ในหน้าแดชบอร์ด
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1917] px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปแดชบอร์ด
        </Link>
      </section>
    </div>
  );
}
