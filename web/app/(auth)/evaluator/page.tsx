'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AlertCircle, CalendarClock, ChevronRight } from 'lucide-react';
import { StatsSection, WebsiteCard, type Website } from './_shared';
import { useAuthStore } from '@/lib/stores/authStore';
import { apiGet } from '@/lib/api';

export default function EvaluatorDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setLoading(true);
        // Phase 1: Fetch all 'open' forms as mock assignments
        const res = await apiGet('/api/v1/forms?status=open');
        const activeForms = res.data || [];
        
        // Map to Website format used by WebsiteCard
        const mappedWebsites = activeForms.map((form: any) => ({
          id: form.id, // Using form id as the evaluation target
          name: form.websiteName || 'Unnamed Website',
          url: form.websiteUrl || '#',
          faculty: form.websiteOwnerFaculty || 'Unknown Faculty',
          status: 'pending', // all open forms are pending by default until response endpoint is implemented
          dueDate: form.closeAt ? new Date(form.closeAt).toISOString() : undefined,
          progress: 0,
        }));
        
        setWebsites(mappedWebsites);
      } catch (err) {
        console.error('Failed to fetch assigned forms', err);
      } finally {
        setLoading(false);
      }
    };
    fetchForms();
  }, []);

  const handleEvaluate = (site: Website) => {
    router.push(`/evaluator/evaluate/${site.id}/gate`);
  };

  const pendingWebsites = websites.filter(s => s.status !== 'completed');
  const completedWebsites = websites.filter(s => s.status === 'completed');

  if (loading) {
    return (
      <main className="p-8 max-w-6xl mx-auto flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">สวัสดี, {user?.name || 'ผู้ใช้งาน'} 👋</h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> แบบฟอร์มประเมินที่เปิดรับในขณะนี้
          </p>
        </div>
      </motion.div>

      <StatsSection />

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
            <p className="text-gray-500 font-medium">ไม่มีแบบฟอร์มเปิดให้ประเมินในขณะนี้ 🎉</p>
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

