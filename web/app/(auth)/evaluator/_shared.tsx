'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Monitor,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  History,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Website {
  id: string;
  name: string;
  url: string;
  status: 'pending' | 'in_progress' | 'completed';
  progress: number;
}

export interface FormQuestion {
  id: string;
  label: string;
  questionType: string;
  isRequired: boolean;
  sortOrder: number;
  config?: { options?: Array<{ label: string; value: string }> } | null;
}

// Minimal website shape used by the new [formId] pages (no status/progress needed)
export type WebsiteInfo = {
  id: string;
  name: string;
  url: string;
};

export function StatsSection() {
  const stats = [
    { label: 'รอดำเนินการ', value: '2', color: 'bg-gray-500' },
    { label: 'กำลังคัดกรอง', value: '1', color: 'bg-blue-500' },
    { label: 'เสร็จสมบูรณ์', value: '3', color: 'bg-green-500' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 * i }}
          className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className={cn('h-2.5 w-2.5 rounded-full', stat.color)}></div>
            <span className="text-sm font-medium text-gray-500">{stat.label}</span>
          </div>
          <div className="text-3xl font-bold text-psu-navy">{stat.value}</div>
        </motion.div>
      ))}
    </div>
  );
}

export function WebsiteCard({
  site,
  onClick,
  index,
}: {
  site: Website;
  onClick: () => void;
  index: number;
}) {
  const statusColors = {
    pending: 'bg-gray-100 text-gray-600',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
  } as const;

  const statusLabel = {
    pending: 'ยังไม่เริ่ม',
    in_progress: 'กำลังทำ',
    completed: 'เสร็จสมบูรณ์',
  } as const;

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm cursor-pointer group hover:border-psu-blue-container/30"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="h-12 w-12 rounded-xl bg-psu-navy/5 flex items-center justify-center group-hover:bg-psu-navy transition-all">
          <Globe className="h-6 w-6 text-psu-navy group-hover:text-white" />
        </div>
        <span
          className={cn(
            'text-[11px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter',
            statusColors[site.status]
          )}
        >
          {statusLabel[site.status]}
        </span>
      </div>

      <h3 className="font-bold text-gray-900 group-hover:text-psu-navy transition-colors mb-1 line-clamp-1">
        {site.name}
      </h3>
      <p className="text-xs text-gray-400 mb-6">{site.url}</p>

      <div className="space-y-2">
        <div className="flex justify-between text-[11px] text-gray-400 font-bold uppercase">
          <span>ความคืบหน้า</span>
          <span className="text-psu-navy">{site.progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${site.progress}%` }}
            transition={{ duration: 1, delay: index * 0.1 }}
            className={cn(
              'h-full rounded-full transition-all duration-1000',
              site.status === 'completed' ? 'bg-green-500' : 'bg-psu-blue-container'
            )}
          />
        </div>
      </div>
    </motion.div>
  );
}

export function PreEvaluationCard({
  website,
  onStart,
}: {
  website: WebsiteInfo;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white max-w-[520px] w-full rounded-[24px] shadow-xl border border-gray-100 overflow-hidden"
    >
      <div className="p-8 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-full bg-psu-blue-container text-white flex items-center justify-center mb-6 shadow-md">
          <Globe className="h-10 w-10" />
        </div>

        <h2 className="text-3xl font-bold text-on-surface mb-2">{website.name}</h2>
        <a
          href={website.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-gray-500 hover:text-psu-navy transition-colors mb-4 group text-sm"
        >
          {website.url.replace('https://', '')}
          <Monitor className="h-3 w-3 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      <div className="h-px bg-gray-100 w-full" />

      <div className="p-8">
        <div className="bg-blue-50/50 rounded-xl p-4 flex gap-4 items-start mb-8 border border-blue-100/50">
          <AlertCircle className="h-5 w-5 text-psu-blue-container shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-gray-900">แนะนำให้เปิดดูเว็บไซต์ก่อนประเมิน</span>
            <span className="text-xs text-gray-500 leading-relaxed">
              การเปิดดูเว็บไซต์จริงจะช่วยให้ผลการประเมินแม่นยำขึ้น / Viewing the website helps improve evaluation
              accuracy
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8 px-6">
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-10 h-10 rounded-full bg-psu-blue-container text-white flex items-center justify-center shadow-sm">
              <Monitor className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-gray-900">เปิดดูเว็บ</span>
          </div>
          <div className="h-px flex-1 bg-gray-200 mt-[-24px]" />
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-gray-400">ประเมิน</span>
          </div>
          <div className="h-px flex-1 bg-gray-200 mt-[-24px]" />
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 border border-gray-200 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-medium text-gray-400">ส่งผล</span>
          </div>
        </div>

        <div className="h-px bg-gray-100 w-full mb-6" />

        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              window.open(website.url, '_blank');
              onStart();
            }}
            className="w-full bg-psu-blue-container hover:bg-psu-navy text-white font-bold py-3.5 px-6 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
          >
            <Globe className="h-5 w-5" />
            เปิดเว็บไซต์และเริ่มประเมิน
          </button>
          <button
            onClick={onStart}
            className="w-full bg-transparent hover:bg-gray-50 text-gray-600 border border-gray-200 font-semibold py-3 px-6 rounded-xl transition-all text-sm"
          >
            ข้ามและกรอกแบบประเมินเลย
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-amber-600 text-xs font-medium">
          ⚠️ แนะนำให้เปิดดูเว็บก่อนเพื่อผลที่แม่นยำ
        </div>
      </div>
    </motion.div>
  );
}

export function ConfirmModal({
  website,
  onConfirm,
  onCancel,
}: {
  website: WebsiteInfo;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-[#213145]/80 backdrop-blur-sm z-40 transition-opacity" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 flex flex-col text-center border border-gray-100"
        >
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 bg-psu-navy/10 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-psu-navy" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-psu-navy mb-2">ยืนยันการส่งแบบประเมิน</h2>
          <p className="text-gray-500 mb-6 text-sm">เว็บไซต์: {website.name}</p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3 text-left">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 font-medium">
              เมื่อส่งแล้วจะไม่สามารถแก้ไขได้อีก กรุณาตรวจสอบความถูกต้องก่อนยืนยัน
            </p>
          </div>

          <div className="bg-[#f8f9ff] rounded-lg p-4 mb-8 space-y-3 text-left border border-gray-100">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-psu-navy" />
              <span className="text-sm font-medium text-psu-navy">ตรวจสอบคำตอบแล้ว</span>
            </div>
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-gray-400" />
              <span className="text-xs text-gray-500">กรุณายืนยันเพื่อส่งผลการประเมิน</span>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-xl border border-psu-navy text-psu-navy font-bold hover:bg-blue-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 px-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-sm transition-colors"
            >
              ยืนยันส่ง
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

function QuestionCard({ question, index }: { question: FormQuestion; index: number }) {
  if (question.questionType === 'rating' || question.questionType === 'scale_5') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <h3 className="font-semibold text-gray-900 text-lg mb-8">
          {index + 1}. {question.label}
          {question.isRequired && <span className="text-red-500 ml-1">*</span>}
        </h3>
        <div className="flex justify-between items-center relative">
          <div className="absolute top-2.5 left-6 right-6 h-px bg-gray-200 -z-10" />
          {[
            { val: 1, label: 'ไม่พอใจมาก' },
            { val: 2, label: 'ไม่พอใจ' },
            { val: 3, label: 'ปานกลาง' },
            { val: 4, label: 'พอใจ' },
            { val: 5, label: 'พอใจมาก' },
          ].map((item) => (
            <label key={item.val} className="flex flex-col items-center gap-3 group cursor-pointer bg-white px-2">
              <input type="radio" name={`q_${question.id}`} value={item.val} className="peer sr-only" />
              <div className="h-5 w-5 rounded-full border border-gray-400 flex items-center justify-center transition-all peer-checked:border-psu-navy peer-checked:border-[6px]" />
              <span className="text-xs font-medium text-gray-500 group-hover:text-psu-navy peer-checked:text-psu-navy peer-checked:font-bold">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (question.questionType === 'long_text') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <label className="block font-semibold text-gray-900 text-lg mb-4">
          {index + 1}. {question.label}
          {question.isRequired && <span className="text-red-500 ml-1">*</span>}
        </label>
        <textarea
          name={`q_${question.id}`}
          className="w-full h-32 rounded-xl border border-gray-200 bg-[#f8f9ff] focus:ring-1 focus:ring-psu-navy p-4 outline-none text-sm"
          placeholder="พิมพ์ความคิดเห็น..."
        />
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
      <label className="block font-semibold text-gray-900 text-lg mb-4">
        {index + 1}. {question.label}
        {question.isRequired && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type="text"
        name={`q_${question.id}`}
        className="w-full rounded-xl border border-gray-200 bg-[#f8f9ff] focus:ring-1 focus:ring-psu-navy p-4 outline-none text-sm"
        placeholder="พิมพ์คำตอบ..."
      />
    </div>
  );
}

export function EvaluationForm({
  website,
  questions,
  responseId: _responseId,
  onBack,
  onSubmitConfirmed,
}: {
  website: WebsiteInfo;
  questions: FormQuestion[];
  responseId?: string;
  onBack: () => void;
  onSubmitConfirmed: () => void;
}) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col relative text-on-surface">
      {isConfirming && (
        <ConfirmModal website={website} onConfirm={onSubmitConfirmed} onCancel={() => setIsConfirming(false)} />
      )}

      <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-all text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-xl text-psu-navy">EILA Website Evaluation System</h1>
          </div>
        </div>

        <div className="hidden lg:flex flex-col items-end gap-1">
          <div className="flex justify-between w-64 text-sm font-bold text-psu-navy">
            <span>แบบประเมิน</span>
            <span>{website.name}</span>
          </div>
          <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-psu-navy w-full transition-all duration-300" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <main className="flex-1 p-8 pb-32 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <h2 className="text-3xl font-bold text-on-surface mb-4">{website.name}</h2>
              <hr className="border-gray-200" />

              <div className="space-y-6">
                {questions.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center text-gray-400">
                    ไม่พบคำถามในแบบประเมินนี้
                  </div>
                ) : (
                  questions.map((q, idx) => (
                    <QuestionCard key={q.id} question={q} index={idx} />
                  ))
                )}
              </div>
            </motion.section>
          </div>
        </main>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200 p-4 px-8 flex justify-between items-center z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-300 font-medium text-gray-600 hover:bg-gray-50 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> ย้อนกลับ
        </button>

        <button
          onClick={() => setIsConfirming(true)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 shadow-sm transition-all"
        >
          ตรวจสอบและส่งประเมิน <ShieldCheck className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SuccessCard({
  website,
  remaining,
  onEvaluateNext,
  onDone,
}: {
  website: Website;
  remaining: Website[];
  onEvaluateNext: (site: Website) => void;
  onDone: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-4 relative"
    >
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-psu-navy/5 to-transparent -z-10 pointer-events-none" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-[680px] bg-white rounded-2xl p-8 md:p-12 text-center shadow-xl border border-gray-100"
      >
        <div className="flex justify-center mb-6">
          <Monitor className="h-16 w-16 text-psu-navy" />
        </div>

        <h1 className="text-3xl font-bold text-on-surface mb-3">ส่งแบบประเมินสำเร็จ! 🎉</h1>
        <p className="text-lg text-gray-500 mb-10">ขอบคุณที่ประเมินเว็บไซต์ {website.name}</p>

        <div className="bg-blue-50/50 rounded-xl p-6 mb-10 border border-blue-100">
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-500 text-sm">เว็บไซต์</span>
            <span className="font-bold text-gray-900">{website.name}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-gray-200">
            <span className="text-gray-500 text-sm">วันที่ส่ง</span>
            <span className="font-bold text-gray-900">
              {new Date().toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              น.
            </span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-500 text-sm">สถานะข้อมูล</span>
            <span className="font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs border border-green-200 shadow-sm flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              บันทึกเข้าระบบสำเร็จ
            </span>
          </div>
        </div>

        {remaining.length > 0 ? (
          <>
            <div className="h-px bg-gray-100 w-full mb-8" />
            <div className="text-left mb-10">
              <h2 className="text-xl font-bold text-on-surface mb-5">เว็บไซต์ที่เหลือต้องประเมิน</h2>
              <div className="space-y-3">
                {remaining.map((site) => (
                  <div
                    key={site.id}
                    className="bg-gray-50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-2 border border-gray-100 hover:border-psu-blue-container/30 transition-all group"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <Globe className="h-5 w-5 text-gray-400 group-hover:text-psu-navy transition-colors mt-0.5 sm:mt-0" />
                      <div>
                        <span className="font-medium text-gray-900 text-sm block">{site.name}</span>
                        <span className="text-xs text-gray-400 mt-0.5 block">{site.url.replace('https://', '')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span
                        className={cn(
                          'text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap',
                          site.status === 'in_progress' ? 'bg-psu-gold/20 text-yellow-800' : 'bg-gray-200 text-gray-600'
                        )}
                      >
                        {site.status === 'in_progress' ? 'แบบร่าง' : 'ยังไม่เริ่ม'}
                      </span>
                      <button
                        onClick={() => onEvaluateNext(site)}
                        className={cn(
                          'whitespace-nowrap flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95',
                          site.status === 'in_progress'
                            ? 'bg-white border border-psu-navy text-psu-navy hover:bg-blue-50'
                            : 'bg-psu-navy text-white hover:bg-psu-blue-container'
                        )}
                      >
                        {site.status === 'in_progress' ? 'ทำต่อ' : 'เริ่มประเมิน'} <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 bg-green-50 rounded-full mb-4">
              <ShieldCheck className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-green-600">คุณประเมินครบทุกเว็บไซต์แล้ว!</h2>
            <p className="text-gray-500 mt-2 text-sm">ขอบคุณสำหรับความร่วมมือในการประเมินประสิทธิภาพเว็บไซต์</p>
          </div>
        )}

        <button
          onClick={onDone}
          className="bg-white border border-gray-200 text-gray-700 px-6 w-full py-4 rounded-xl font-bold shadow-sm hover:bg-gray-50 active:scale-[0.98] transition-all flex justify-center items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" /> กลับหน้าหลัก
        </button>
      </motion.div>
    </motion.div>
  );
}
