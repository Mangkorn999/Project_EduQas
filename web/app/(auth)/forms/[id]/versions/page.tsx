'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ChevronLeft, History, RotateCcw, Calendar, User, Hash } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/v1/forms/${id}/versions`);
      setVersions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [id]);

  const handleRollback = async (versionId: string, versionNumber: number) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการ Rollback กลับไปที่ Version ${versionNumber}? ข้อมูลปัจจุบันจะถูกเขียนทับและกลายเป็นร่างใหม่`)) return;
    try {
      await apiPost(`/api/v1/forms/${id}/versions/${versionId}/rollback`, {});
      router.push(`/forms/${id}/builder`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rollback ไม่สำเร็จ');
    }
  };

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-psu-navy flex items-center gap-3">
            <History className="h-8 w-8" />
            ประวัติ Version
          </h1>
          <p className="text-gray-500">เรียกคืนข้อมูลแบบฟอร์มจากประวัติที่เคย Publish ไว้</p>
        </div>
      </div>

      <div className="relative pl-8 border-l-2 border-gray-100 space-y-8 py-4">
        {loading ? (
          <div className="text-gray-400 py-20 text-center">กำลังโหลดประวัติ...</div>
        ) : versions.length === 0 ? (
          <div className="text-gray-400 py-20 text-center">ยังไม่มีประวัติการ Publish แบบฟอร์มนี้</div>
        ) : (
          versions.map((v: any, index: number) => (
            <motion.div
              key={v.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Timeline Dot */}
              <div className={cn(
                "absolute left-[-41px] top-4 w-5 h-5 rounded-full border-4 border-white shadow-sm ring-2",
                index === 0 ? "bg-psu-navy ring-psu-navy/20 scale-125" : "bg-gray-300 ring-gray-100"
              )}></div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="bg-psu-navy text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        Version {v.versionNumber}
                      </span>
                      {index === 0 && (
                        <span className="bg-blue-50 text-psu-navy px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-blue-100">Latest</span>
                      )}
                    </div>
                    <h3 className="font-bold text-psu-navy text-xl">{v.snapshot.form.title}</h3>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(v.createdAt).toLocaleString('th-TH')}
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        {v.snapshot.criteria.length} Criteria / {v.snapshot.questions.length} Questions
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRollback(v.id, v.versionNumber)}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-psu-navy bg-blue-50 hover:bg-psu-navy hover:text-white transition-all active:scale-95 border border-blue-100/50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    เรียกคืน (Rollback)
                  </button>
                </div>
                
                {v.snapshot.form.description && (
                  <div className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-400 italic">
                    "{v.snapshot.form.description}"
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </main>
  );
}
