'use client';

import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-on-surface">
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
        <button
          onClick={() => router.push('/evaluator')}
          className="flex items-center gap-2 text-sm font-bold text-psu-navy hover:bg-gray-100 px-4 py-2 rounded-lg transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </button>

        <div className="flex items-center gap-6">
          <button className="p-2.5 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 relative transition-all">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <div className="flex items-center gap-3 pl-4 border-l border-gray-100 cursor-pointer hover:bg-gray-50 py-1.5 px-2 rounded-lg transition-all">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-900 leading-none">สมชาย รักไทย</p>
              <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wider">คณะวิศวกรรมศาสตร์</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-psu-navy overflow-hidden border-2 border-psu-gold shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Profile"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="p-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-psu-navy overflow-hidden border-2 border-psu-gold shadow-sm shrink-0">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Profile"
              />
            </div>
            <div className="flex-1">
              <div className="text-xl font-bold text-psu-navy">สมชาย รักไทย</div>
              <div className="text-sm text-gray-500 mt-1">คณะวิศวกรรมศาสตร์</div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

