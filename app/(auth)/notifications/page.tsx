'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell } from 'lucide-react';

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

        <div className="flex items-center gap-3 text-sm font-medium text-gray-500">
          <span className="hidden md:inline">Notifications</span>
        </div>

        <button className="p-2.5 rounded-full bg-gray-50 text-gray-500 hover:bg-gray-100 relative transition-all">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
      </header>

      <main className="p-8 max-w-4xl mx-auto" />
    </div>
  );
}

