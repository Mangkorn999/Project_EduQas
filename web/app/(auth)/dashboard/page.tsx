'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Activity, Users, Globe, ArrowUpRight } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/authStore';
import { apiGet } from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalForms: 0,
    activeForms: 0,
    totalWebsites: 0,
  });

  useEffect(() => {
    // Fetch actual form counts
    const fetchStats = async () => {
      try {
        const res = await apiGet('/api/v1/forms');
        const forms = res.data || [];
        setStats({
          totalForms: forms.length,
          activeForms: forms.filter((f: any) => f.status === 'open').length,
          totalWebsites: new Set(forms.map((f: any) => f.websiteUrl).filter(Boolean)).size,
        });
      } catch (err) {
        console.error('Failed to fetch forms for dashboard', err);
      }
    };
    fetchStats();
  }, []);

  return (
    <main className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">Dashboard สรุปผล</h1>
          <p className="text-gray-500 mt-1">
            ภาพรวมการประเมินคุณภาพเว็บไซต์ {user?.role === 'super_admin' || user?.role === 'executive' ? 'ระดับมหาวิทยาลัย' : 'ระดับคณะ'}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<BarChart3 />} 
          label="ฟอร์มทั้งหมด" 
          value={stats.totalForms} 
          trend="+2" 
          color="bg-blue-50 text-blue-600" 
        />
        <StatCard 
          icon={<Activity />} 
          label="ฟอร์มที่กำลังเปิดรับ" 
          value={stats.activeForms} 
          trend="กำลังดำเนินการ" 
          color="bg-green-50 text-green-600" 
        />
        <StatCard 
          icon={<Globe />} 
          label="เว็บไซต์ที่ถูกประเมิน" 
          value={stats.totalWebsites} 
          trend="+5%" 
          color="bg-purple-50 text-purple-600" 
        />
        <StatCard 
          icon={<Users />} 
          label="ผู้ประเมินรวม (Mock)" 
          value="1,240" 
          trend="+12%" 
          color="bg-orange-50 text-orange-600" 
        />
      </div>

      {/* Mock Charts & Ranking Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 border-dashed">
          <BarChart3 className="h-12 w-12 mb-4 text-gray-300" />
          <p className="font-semibold text-gray-500">พื้นที่สำหรับกราฟสรุปคะแนน</p>
          <p className="text-sm">จะดึงข้อมูลจาก Analytics API (Phase 2)</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[400px]">
          <h3 className="font-bold text-lg mb-4 text-psu-navy">Top 5 เว็บไซต์คะแนนสูงสุด (Mock)</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {i}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">เว็บไซต์ตัวอย่างที่ {i}</p>
                    <p className="text-xs text-gray-500">คณะวิทยาศาสตร์</p>
                  </div>
                </div>
                <div className="font-bold text-green-600">
                  {98 - i * 2}.50
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ icon, label, value, trend, color }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          {React.cloneElement(icon, { className: 'w-6 h-6' })}
        </div>
        <div className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
          <ArrowUpRight className="w-4 h-4" />
          {trend}
        </div>
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{label}</p>
        <h3 className="text-3xl font-bold text-gray-900 mt-1">{value}</h3>
      </div>
    </motion.div>
  );
}
