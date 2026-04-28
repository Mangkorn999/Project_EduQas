'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertCircle } from 'lucide-react';
import { Sidebar, StatsSection, TopNav, WebsiteCard, WEBSITES, type Website } from './_shared';

export default function Page() {
  const router = useRouter();

  const handleEvaluate = (site: Website) => {
    router.push(`/evaluator/evaluate/${site.id}/gate`);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <TopNav />
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
      </div>
    </div>
  );
}

