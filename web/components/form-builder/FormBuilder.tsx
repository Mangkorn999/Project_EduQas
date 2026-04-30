'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Rocket, History, ChevronLeft, Plus, Check } from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';
import { WeightInput } from './WeightInput';
import { DragDropCanvas } from './DragDropCanvas';
import { FieldEditor } from './FieldEditor';
import { cn } from '@/lib/utils';

type FormBuilderProps = {
  formId: string;
};

export function FormBuilder({ formId }: FormBuilderProps) {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/v1/forms/${formId}`);
      setForm(res.data);
      setCriteria(res.data.criteria || []);
      setQuestions(res.data.questions || []);
    } catch (err) {
      console.error(err);
      router.push('/forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [formId]);

  const handleSaveForm = async () => {
    try {
      setSaving(true);
      await apiPatch(`/api/v1/forms/${formId}`, { title: form.title });
      setSaving(false);
    } catch (err) {
      alert('บันทึกไม่สำเร็จ');
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการ Publish แบบฟอร์มนี้? (แบบฟอร์มจะถูกล็อกและเปิดใช้งานจริง)')) return;
    try {
      await apiPost(`/api/v1/forms/${formId}/publish`, {});
      router.push('/forms');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Publish ไม่สำเร็จ');
    }
  };

  const handleAddCriterion = async () => {
    try {
      const res = await apiPost(`/api/v1/forms/${formId}/criteria`, {
        name: 'หัวข้อการประเมินใหม่',
        weight: 0
      });
      setCriteria([...criteria, res.data]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เพิ่มเกณฑ์ไม่สำเร็จ');
    }
  };

  const handleUpdateCriterion = async (id: string, data: any) => {
    try {
      const res = await apiPatch(`/api/v1/forms/${formId}/criteria/${id}`, data);
      setCriteria(criteria.map((c: any) => c.id === id ? res.data : c));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCriterion = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเกณฑ์นี้? คำถามที่ผูกอยู่จะกลายเป็น Feedback เท่านั้น')) return;
    try {
      await apiDelete(`/api/v1/forms/${formId}/criteria/${id}`);
      setCriteria(criteria.filter(c => c.id !== id));
      setQuestions(questions.map((q: any) => q.criterionId === id ? { ...q, criterionId: null } : q));
    } catch (err) {
      alert('ลบไม่สำเร็จ');
    }
  };

  const handleAddQuestion = async () => {
    try {
      const res = await apiPost(`/api/v1/forms/${formId}/questions`, {
        questionType: 'short_text',
        label: 'คำถามใหม่',
        sortOrder: questions.length
      });
      setQuestions([...questions, res.data]);
      setSelectedQuestionId(res.data.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'เพิ่มคำถามไม่สำเร็จ');
    }
  };

  const handleUpdateQuestion = async (data: any) => {
    try {
      const res = await apiPatch(`/api/v1/forms/${formId}/questions/${data.id}`, data);
      setQuestions(questions.map((q: any) => q.id === data.id ? res.data : q));
      setSelectedQuestionId(null);
    } catch (err) {
      alert('บันทึกไม่สำเร็จ');
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      await apiDelete(`/api/v1/forms/${formId}/questions/${id}`);
      setQuestions(questions.filter(q => q.id !== id));
      setSelectedQuestionId(null);
    } catch (err) {
      alert('ลบไม่สำเร็จ');
    }
  };

  const handleReorderQuestions = async (newItems: any[]) => {
    const originalItems = [...questions];
    setQuestions(newItems);
    try {
      await apiPatch(`/api/v1/forms/${formId}/questions/reorder`, 
        newItems.map((q, i) => ({ id: q.id, sortOrder: i }))
      );
    } catch (err) {
      setQuestions(originalItems);
      alert('จัดลำดับใหม่ไม่สำเร็จ');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-[calc(100vh-80px)] text-gray-400">กำลังโหลดข้อมูล Builder...</div>;

  const isDraft = form.status === 'draft';

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden bg-[#f8f9ff]">
      {/* Header Bar */}
      <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/forms')} className="p-2 hover:bg-gray-50 rounded-full text-gray-400">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="h-8 w-px bg-gray-100"></div>
          <div>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              onBlur={handleSaveForm}
              disabled={!isDraft}
              className="font-bold text-psu-navy bg-transparent border-none outline-none focus:ring-0 p-0 text-lg"
            />
            <div className="flex items-center gap-2 mt-0.5">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] font-black uppercase rounded-md tracking-widest">{form.status}</span>
              <span className="text-[10px] text-gray-300">ID: {form.id.slice(0, 8)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/forms/${formId}/versions`)}
            className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-psu-navy flex items-center gap-2 transition-all"
          >
            <History className="h-4 w-4" />
            ประวัติ Version
          </button>
          <div className="h-8 w-px bg-gray-100 mx-2"></div>
          {isDraft && (
            <>
              <button
                onClick={handleSaveForm}
                className={cn(
                  "px-4 py-2 text-sm font-bold flex items-center gap-2 rounded-xl transition-all",
                  saving ? "text-psu-navy opacity-50" : "text-psu-navy hover:bg-blue-50"
                )}
              >
                {saving ? <Check className="h-4 w-4 animate-bounce" /> : <Save className="h-4 w-4" />}
                {saving ? 'กำลังบันทึก...' : 'บันทึกร่าง'}
              </button>
              <button
                onClick={handlePublish}
                className="bg-psu-navy text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-psu-blue-container transition-all shadow-lg active:scale-95"
              >
                <Rocket className="h-4 w-4" />
                Publish
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Criteria */}
        <aside className="w-80 bg-white border-r border-gray-100 flex flex-col p-6 overflow-y-auto shrink-0 shadow-sm">
          <WeightInput
            criteria={criteria}
            onUpdate={handleUpdateCriterion}
            onDelete={handleDeleteCriterion}
            onAdd={handleAddCriterion}
          />
        </aside>

        {/* Center Panel: Questions Canvas */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-psu-navy tracking-tight">Form Content</h2>
              {isDraft && (
                <button
                  onClick={handleAddQuestion}
                  className="bg-white text-psu-navy border-2 border-psu-navy px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-psu-navy hover:text-white transition-all shadow-sm active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มคำถาม
                </button>
              )}
            </div>
            
            <div className="bg-white/50 rounded-3xl border border-gray-100 shadow-sm overflow-hidden backdrop-blur-sm">
              <DragDropCanvas
                questions={questions}
                criteria={criteria}
                selectedId={selectedQuestionId}
                onReorder={handleReorderQuestions}
                onSelect={setSelectedQuestionId}
              />
            </div>
          </div>
        </main>

        {/* Right Panel: Editor Drawer */}
        <AnimatePresence>
          {selectedQuestionId && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-96 shrink-0 z-30"
            >
              <FieldEditor
                question={questions.find((q: any) => q.id === selectedQuestionId)}
                criteria={criteria}
                onSave={handleUpdateQuestion}
                onDelete={handleDeleteQuestion}
                onClose={() => setSelectedQuestionId(null)}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
