'use client';

<<<<<<< HEAD
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { StatsSection, WebsiteCard, WEBSITES, type Website } from './_shared';

export default function Page() {
  const router = useRouter();

  const handleEvaluate = (site: Website) => {
    router.push(`/evaluator/evaluate/${site.id}/gate`);
  };

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8">
        <h1 className="text-3xl font-bold text-on-surface">สวัสดี, คุณสมชาย 👋</h1>
        <p className="text-gray-500">รอบประเมิน: ภาคเรียนที่ 1/2568</p>
      </motion.div>

      <StatsSection />

      <div className="bg-psu-gold/20 border border-psu-gold/30 rounded-xl p-4 flex items-center gap-3 mb-8 shadow-sm">
        <AlertCircle className="h-5 w-5 text-psu-navy" />
        <span className="font-medium text-psu-navy">เหลืออีก 3 วันก่อนปิดรอบการประเมิน (สิ้นสุด 15 พ.ค.)</span>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-psu-navy mb-4">เว็บไซต์ที่รอประเมิน</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {WEBSITES.map((site, index) => (
            <WebsiteCard key={site.id} site={site} index={index} onClick={() => handleEvaluate(site)} />
          ))}
        </div>
      </div>
    </main>
  );
}

=======
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
>>>>>>> feature/ux-login-role-test
