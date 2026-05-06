'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function Page({ params }: { params: Promise<{ formId: string }> }) {
  const { formId: _ } = use(params);
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 text-center shadow-xl border border-gray-100">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ส่งแบบประเมินสำเร็จ!</h1>
        <p className="text-gray-500 mb-8 text-sm">ขอบคุณสำหรับการประเมิน</p>
        <p className="text-xs text-gray-400 mb-6">
          {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-psu-navy text-white py-3 rounded-xl font-bold hover:bg-psu-blue-container transition-colors"
        >
          กลับงานของฉัน
        </button>
      </div>
    </div>
  );
}
