'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertCircle, CalendarClock, ChevronRight } from 'lucide-react';
import { StatsSection, WebsiteCard, WEBSITES, type Website } from './_shared';
import { useAuthStore } from '@/lib/stores/authStore';

export default function EvaluatorDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();

  const handleEvaluate = (site: Website) => {
    router.push(`/evaluator/evaluate/${site.id}/gate`);
  };

  const pendingWebsites = WEBSITES.filter(s => s.status !== 'completed');
  const completedWebsites = WEBSITES.filter(s => s.status === 'completed');

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">สวัสดี, {user?.name || 'ผู้ใช้งาน'} 👋</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> รอบประเมิน: ภาคเรียนที่ 1/2568
          </p>
        </div>
      </motion.div>

      <StatsSection />

      <motion.div 
        initial={{ y: 20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        transition={{ delay: 0.1 }}
        className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start sm:items-center gap-3 shadow-sm"
      >
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
        <span className="font-medium text-amber-800 text-sm">
          เหลือเวลาอีก <strong className="text-amber-900">3 วัน</strong> ก่อนปิดรอบการประเมิน (สิ้นสุด 15 พ.ค. 2568) กรุณาดำเนินการให้เสร็จสิ้น
        </span>
      </motion.div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-psu-navy flex items-center gap-2">
            เว็บไซต์ที่รอประเมิน
            <span className="bg-blue-100 text-blue-700 text-xs py-0.5 px-2 rounded-full">{pendingWebsites.length}</span>
          </h2>
        </div>
        
        {pendingWebsites.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingWebsites.map((site, index) => (
              <WebsiteCard key={site.id} site={site} index={index} onClick={() => handleEvaluate(site)} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-12 text-center">
            <p className="text-gray-500 font-medium">คุณประเมินเว็บไซต์ครบทั้งหมดแล้ว 🎉</p>
          </div>
        )}
      </div>

      {completedWebsites.length > 0 && (
        <div className="space-y-6 pt-8 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-500 flex items-center gap-2">
            เว็บไซต์ที่ประเมินแล้ว
            <span className="bg-green-100 text-green-700 text-xs py-0.5 px-2 rounded-full">{completedWebsites.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-75 hover:opacity-100 transition-opacity">
            {completedWebsites.map((site, index) => (
              <WebsiteCard key={site.id} site={site} index={index} onClick={() => handleEvaluate(site)} />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

