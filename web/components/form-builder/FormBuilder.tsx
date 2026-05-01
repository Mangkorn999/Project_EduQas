'use client';

<<<<<<< HEAD
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
=======
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Eye,
  ChevronLeft,
  Check,
  History,
  FileText,
  Layout,
  Send,
  AlertCircle,
  CheckCircle2,
  Globe,
  Link as LinkIcon,
  Building2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SortableItem, Question, QuestionType } from './SortableItem';
import { FormPreview } from './FormPreview';

interface FormBuilderProps {
  formId: string;
}

type ToastType = 'success' | 'error' | 'info';
>>>>>>> feature/ux-login-role-test

export function FormBuilder({ formId }: FormBuilderProps) {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
<<<<<<< HEAD
  const [criteria, setCriteria] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
=======
  const [round, setRound] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'preview'>('questions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [websites, setWebsites] = useState<{ id: string; name: string; url: string }[]>([]);
  const [fetchingWebsites, setFetchingWebsites] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // Local state for title/description/website info to avoid per-keystroke API calls
  const [localTitle, setLocalTitle] = useState('');
  const [localDescription, setLocalDescription] = useState('');
  const [localWebsiteName, setLocalWebsiteName] = useState('');
  const [localWebsiteUrl, setLocalWebsiteUrl] = useState('');
  const [localWebsiteOwnerFaculty, setLocalWebsiteOwnerFaculty] = useState('');

  const mapTypeFromBackend = (type: string): QuestionType => {
    switch (type) {
      case 'short_text': return 'short';
      case 'long_text': return 'long';
      case 'single_choice': return 'multiple';
      case 'multi_choice': return 'checkbox';
      case 'rating': return 'rating';
      default: return 'short';
    }
  };

  const mapTypeToBackend = (type: QuestionType): string => {
    switch (type) {
      case 'short': return 'short_text';
      case 'long': return 'long_text';
      case 'multiple': return 'single_choice';
      case 'checkbox': return 'multi_choice';
      case 'rating': return 'rating';
      case 'dropdown': return 'single_choice';
      default: return 'short_text';
    }
  };

  const mapFromBackend = (q: any): Question => ({
    id: q.id,
    label: q.label,
    type: mapTypeFromBackend(q.questionType),
    required: q.isRequired,
    options: q.config?.options?.map((o: any) => o.label) || []
  });

  const fetchWebsites = async (roundId: string) => {
    try {
      setFetchingWebsites(true);
      const res = await apiGet(`/api/v1/rounds/${roundId}/websites`);
      setWebsites(res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch websites:', err);
      setWebsites([]);
    } finally {
      setFetchingWebsites(false);
    }
  };
>>>>>>> feature/ux-login-role-test

  const fetchData = async () => {
    try {
      setLoading(true);
<<<<<<< HEAD
      const res = await apiGet(`/forms/${formId}`);
      setForm(res.data);
      setCriteria(res.data.criteria || []);
      setQuestions(res.data.questions || []);
=======
      const res = await apiGet(`/api/v1/forms/${formId}`);
      setForm(res.data);
      setLocalTitle(res.data.title || '');
      setLocalDescription(res.data.description || '');
      setLocalWebsiteName(res.data.websiteName || '');
      setLocalWebsiteUrl(res.data.websiteUrl || '');
      setLocalWebsiteOwnerFaculty(res.data.websiteOwnerFaculty || '');
      setQuestions((res.data.questions || []).map(mapFromBackend));

      if (res.data.roundId) {
        const roundRes = await apiGet(`/api/v1/rounds/${res.data.roundId}`);
        setRound(roundRes.data);
        await fetchWebsites(res.data.roundId);
      }
>>>>>>> feature/ux-login-role-test
    } catch (err) {
      console.error(err);
      router.push('/forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
<<<<<<< HEAD
  }, [formId]);

  const handleSaveForm = async () => {
    try {
      setSaving(true);
      await apiPatch(`/forms/${formId}`, { title: form.title });
      setSaving(false);
    } catch (err) {
      alert('บันทึกไม่สำเร็จ');
=======
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [formId]);

  // --- Title / Description / Metadata ---
  const handleSaveField = async (field: string, value: string, prevValue: string) => {
    if (value === prevValue) return;
    try {
      setSaving(true);
      await apiPatch(`/api/v1/forms/${formId}`, { [field]: value });
      setForm((prev: any) => ({ ...prev, [field]: value }));
      showToast('บันทึกข้อมูลแล้ว');
    } catch (err: any) {
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
      if (field === 'title') setLocalTitle(prevValue);
      if (field === 'description') setLocalDescription(prevValue);
      if (field === 'websiteName') setLocalWebsiteName(prevValue);
      if (field === 'websiteUrl') setLocalWebsiteUrl(prevValue);
      if (field === 'websiteOwnerFaculty') setLocalWebsiteOwnerFaculty(prevValue);
    } finally {
>>>>>>> feature/ux-login-role-test
      setSaving(false);
    }
  };

<<<<<<< HEAD
  const handlePublish = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการ Publish แบบฟอร์มนี้? (แบบฟอร์มจะถูกล็อกและเปิดใช้งานจริง)')) return;
    try {
      await apiPost(`/forms/${formId}/publish`, {});
      router.push('/forms');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Publish ไม่สำเร็จ');
    }
  };

  const handleAddCriterion = async () => {
    try {
      const res = await apiPost(`/forms/${formId}/criteria`, {
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
      const res = await apiPatch(`/forms/${formId}/criteria/${id}`, data);
      setCriteria(criteria.map((c: any) => c.id === id ? res.data : c));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCriterion = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบเกณฑ์นี้? คำถามที่ผูกอยู่จะกลายเป็น Feedback เท่านั้น')) return;
    try {
      await apiDelete(`/forms/${formId}/criteria/${id}`);
      setCriteria(criteria.filter(c => c.id !== id));
      setQuestions(questions.map((q: any) => q.criterionId === id ? { ...q, criterionId: null } : q));
    } catch (err) {
      alert('ลบไม่สำเร็จ');
=======
  // --- Questions ---
  const handleUpdateQuestion = async (id: string, updates: Partial<Question>) => {
    // Optimistic UI update
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    
    try {
      setSaving(true);
      const payload: any = {};
      if (updates.label !== undefined) payload.label = updates.label;
      if (updates.required !== undefined) payload.isRequired = updates.required;
      if (updates.type !== undefined) payload.questionType = mapTypeToBackend(updates.type);
      if (updates.options !== undefined) {
        payload.config = {
          options: updates.options.map(o => ({ label: o, value: o }))
        };
      }
      if (Object.keys(payload).length === 0) return;

      await apiPatch(`/api/v1/forms/${formId}/questions/${id}`, payload);
      showToast('บันทึกแล้ว');
    } catch (err: any) {
      // Revert on error
      showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
      await fetchData(); // Re-fetch to sync state
    } finally {
      setSaving(false);
>>>>>>> feature/ux-login-role-test
    }
  };

  const handleAddQuestion = async () => {
<<<<<<< HEAD
    try {
      const res = await apiPost(`/forms/${formId}/questions`, {
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
      const res = await apiPatch(`/forms/${formId}/questions/${data.id}`, data);
      setQuestions(questions.map((q: any) => q.id === data.id ? res.data : q));
      setSelectedQuestionId(null);
    } catch (err) {
      alert('บันทึกไม่สำเร็จ');
=======
    if (form?.status !== 'draft') {
      showToast('แก้ไขได้เฉพาะแบบฟอร์มที่เป็นร่าง (Draft) เท่านั้น', 'error');
      return;
    }
    try {
      setSaving(true);
      const res = await apiPost(`/api/v1/forms/${formId}/questions`, {
        label: 'คำถามใหม่',
        questionType: 'short_text',
        isRequired: false,
        sortOrder: questions.length
      });
      const newQuestion = mapFromBackend(res.data);
      setQuestions(prev => [...prev, newQuestion]);
      setSelectedId(newQuestion.id);
      showToast('เพิ่มคำถามแล้ว');
    } catch (err: any) {
      showToast(err.message || 'เพิ่มคำถามไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
>>>>>>> feature/ux-login-role-test
    }
  };

  const handleDeleteQuestion = async (id: string) => {
<<<<<<< HEAD
    try {
      await apiDelete(`/forms/${formId}/questions/${id}`);
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
      await apiPatch(`/forms/${formId}/questions/reorder`, 
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
=======
    if (!confirm('ต้องการลบคำถามนี้หรือไม่?')) return;
    const backup = questions;
    setQuestions(prev => prev.filter(q => q.id !== id));
    if (selectedId === id) setSelectedId(null);
    
    try {
      setSaving(true);
      // use delete - use apiDelete via lib
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/forms/${formId}/questions/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'ลบไม่สำเร็จ');
      }
      showToast('ลบคำถามแล้ว');
    } catch (err: any) {
      setQuestions(backup);
      showToast(err.message || 'ลบคำถามไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateQuestion = async (id: string) => {
    const original = questions.find(q => q.id === id);
    if (!original) return;
    if (form?.status !== 'draft') {
      showToast('แก้ไขได้เฉพาะแบบฟอร์มที่เป็นร่าง (Draft) เท่านั้น', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await apiPost(`/api/v1/forms/${formId}/questions`, {
        label: `${original.label} (สำเนา)`,
        questionType: mapTypeToBackend(original.type),
        isRequired: original.required,
        config: { options: original.options?.map(o => ({ label: o, value: o })) },
        sortOrder: questions.length
      });
      const newQuestion = mapFromBackend(res.data);
      setQuestions(prev => [...prev, newQuestion]);
      setSelectedId(newQuestion.id);
      showToast('คัดลอกคำถามแล้ว');
    } catch (err: any) {
      showToast(err.message || 'คัดลอกไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = questions.findIndex(q => q.id === active.id);
    const newIndex = questions.findIndex(q => q.id === over.id);
    const reordered = arrayMove(questions, oldIndex, newIndex);
    setQuestions(reordered);

    try {
      setSaving(true);
      await apiPatch(`/api/v1/forms/${formId}/questions/reorder`, 
        reordered.map((q, i) => ({ id: q.id, sortOrder: i }))
      );
      showToast('เรียงลำดับแล้ว');
    } catch (err: any) {
      setQuestions(questions); // revert
      showToast(err.message || 'เรียงลำดับไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  // --- Publish ---
  const handlePublish = async () => {
    if (form?.status !== 'draft') {
      showToast('แบบฟอร์มนี้ได้รับการเผยแพร่แล้วหรือปิดใช้งาน', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('ต้องมีอย่างน้อย 1 คำถามก่อนเผยแพร่', 'error');
      return;
    }
    if (!confirm('ต้องการเผยแพร่แบบฟอร์มนี้หรือไม่? หลังจากเผยแพร่แล้วจะไม่สามารถแก้ไขคำถามได้')) return;
    
    try {
      setPublishing(true);
      await apiPost(`/api/v1/forms/${formId}/publish`, {});
      setForm((prev: any) => ({ ...prev, status: 'open' }));
      showToast('เผยแพร่แบบฟอร์มสำเร็จ! ✅');
    } catch (err: any) {
      showToast(err.message || 'เผยแพร่ไม่สำเร็จ', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 font-medium">กำลังเตรียมเครื่องมือสร้างแบบฟอร์ม...</p>
    </div>
  );

  const isDraft = form?.status === 'draft';
  const statusLabels: Record<string, string> = {
    draft: 'ร่าง',
    open: 'เปิดใช้งาน',
    closed: 'ปิดรับแล้ว',
  };
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    open: 'bg-green-100 text-green-700',
    closed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20 font-sans text-gray-900">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold",
              toast.type === 'error'
                ? "bg-red-600 text-white"
                : "bg-gray-900 text-white"
            )}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Back + Title + Status */}
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => router.push('/forms')}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors flex-shrink-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-gray-900 text-sm md:text-base truncate max-w-[200px]">
                    {form?.title}
                  </h1>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide hidden sm:inline-flex",
                    statusColors[form?.status] || 'bg-gray-100 text-gray-600'
                  )}>
                    {statusLabels[form?.status] || form?.status}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {saving && (
                    <span className="text-[10px] font-bold text-blue-500 uppercase">บันทึก...</span>
                  )}
                  {!saving && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase">พร้อม</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Center: Tabs */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('questions')}
              className={cn(
                "px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap",
                activeTab === 'questions' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:bg-gray-200"
              )}
            >
              <Layout className="h-4 w-4" /> 
              <span className="hidden sm:inline">คำถาม</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap",
                activeTab === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:bg-gray-200"
              )}
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">ดูตัวอย่าง</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button 
              onClick={() => router.push(`/forms/${formId}/versions`)}
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors"
              title="ประวัติ Version"
            >
              <History className="h-4 w-4" />
            </button>
            {isDraft ? (
              <button 
                onClick={handlePublish}
                disabled={publishing || questions.length === 0}
                className={cn(
                  "flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all whitespace-nowrap active:scale-95",
                  "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <Send className="h-4 w-4" />
                {publishing ? 'กำลังเผยแพร่...' : 'เผยแพร่'}
              </button>
            ) : (
              <span className={cn(
                "px-4 py-2 rounded-xl font-bold text-xs sm:text-sm",
                statusColors[form?.status]
              )}>
                {statusLabels[form?.status]}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="sm:hidden flex gap-1 mt-3 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('questions')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1",
              activeTab === 'questions' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            <Layout className="h-3 w-3" /> แก้ไข
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1",
              activeTab === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            <Eye className="h-3 w-3" /> ดูตัวอย่าง
          </button>
        </div>
      </header>

      {/* Status Banner: show if not draft */}
      {!isDraft && (
        <div className={cn(
          "sticky top-[73px] z-40 py-2 px-6 text-center text-sm font-semibold",
          form?.status === 'open' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        )}>
          {form?.status === 'open'
            ? '✅ แบบฟอร์มนี้เปิดใช้งานแล้ว — ไม่สามารถแก้ไขคำถามได้ หากต้องการแก้ไขให้ Rollback หรือ Duplicate ก่อน'
            : '🔒 แบบฟอร์มนี้ถูกปิดรับแล้ว'}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-3xl mx-auto pt-8 px-4 pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'questions' ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Website & Round Info Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-center gap-2 text-psu-navy font-bold text-lg border-b border-gray-50 pb-2">
                  <Globe className="h-5 w-5" />
                  <span>ข้อมูลเว็บไซต์และรอบการประเมิน</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> รอบการประเมิน
                    </label>
                    <p className="text-sm font-semibold text-gray-700">{round?.name || 'ไม่ระบุรอบ'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> หน่วยงานเจ้าของ
                    </label>
                    <input
                      type="text"
                      value={localWebsiteOwnerFaculty}
                      onChange={(e) => setLocalWebsiteOwnerFaculty(e.target.value)}
                      onBlur={() => handleSaveField('websiteOwnerFaculty', localWebsiteOwnerFaculty, form?.websiteOwnerFaculty)}
                      disabled={!isDraft}
                      className="w-full text-sm font-semibold text-gray-700 bg-transparent border-b border-transparent focus:border-blue-300 outline-none transition-colors disabled:cursor-not-allowed"
                      placeholder="ชื่อคณะ/หน่วยงาน"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <Globe className="h-3 w-3" /> เว็บไซต์เป้าหมาย (จาก Registry)
                  </label>
                  <select
                    value={form?.websiteTargetId || ''}
                    onChange={async (e) => {
                      const websiteTargetId = e.target.value;
                      const selectedWebsite = websites.find(w => w.id === websiteTargetId);
                      if (selectedWebsite) {
                        setLocalWebsiteName(selectedWebsite.name);
                        setLocalWebsiteUrl(selectedWebsite.url);
                        try {
                          setSaving(true);
                          await apiPatch(`/api/v1/forms/${formId}`, {
                            websiteTargetId: websiteTargetId || null,
                            websiteName: selectedWebsite ? selectedWebsite.name : '',
                            websiteUrl: selectedWebsite ? selectedWebsite.url : '',
                          });
                          setForm((prev: any) => ({ ...prev, websiteTargetId, websiteName: selectedWebsite?.name || '', websiteUrl: selectedWebsite?.url || '' }));
                          showToast('บันทึกเว็บไซต์แล้ว');
                        } catch (err: any) {
                          showToast(err.message || 'บันทึกไม่สำเร็จ', 'error');
                        } finally {
                          setSaving(false);
                        }
                      }
                    }}
                    disabled={!isDraft || fetchingWebsites}
                    className={cn(
                      "w-full text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 transition-all disabled:cursor-not-allowed disabled:opacity-50",
                      !isDraft && "bg-gray-50"
                    )}
                  >
                    <option value="">-- เลือกเว็บไซต์ --</option>
                    {websites.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  {form?.websiteTargetId && websites.find(w => w.id === form.websiteTargetId) && (
                    <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2 mt-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <ExternalLink className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="text-xs text-blue-700 truncate font-medium">{websites.find(w => w.id === form.websiteTargetId)?.url}</span>
                      </div>
                      <a
                        href={websites.find(w => w.id === form.websiteTargetId)?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-700 hover:underline shrink-0"
                      >
                        เปิดดู
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" /> URL เว็บไซต์
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={localWebsiteUrl}
                      onChange={(e) => setLocalWebsiteUrl(e.target.value)}
                      onBlur={() => handleSaveField('websiteUrl', localWebsiteUrl, form?.websiteUrl)}
                      disabled={!isDraft}
                      className="flex-1 text-sm font-mono text-blue-600 bg-transparent border-b border-transparent focus:border-blue-300 outline-none transition-colors disabled:cursor-not-allowed"
                      placeholder="https://..."
                    />
                    {localWebsiteUrl && (
                      <a href={localWebsiteUrl} target="_blank" rel="noreferrer" className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Title & Description */}
              <div className="bg-white rounded-xl border-t-[8px] border-t-blue-600 shadow-sm p-8 space-y-4">
                <input
                  type="text"
                  value={localTitle}
                  onChange={(e) => setLocalTitle(e.target.value)}
                  onBlur={() => handleSaveField('title', localTitle, form?.title)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).blur()}
                  disabled={!isDraft}
                  className="w-full text-4xl font-bold text-gray-900 border-b-2 border-transparent focus:border-blue-300 outline-none py-2 transition-colors disabled:cursor-not-allowed"
                  placeholder="ชื่อแบบฟอร์ม"
                />
                <textarea
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  onBlur={() => handleSaveField('description', localDescription, form?.description)}
                  disabled={!isDraft}
                  className="w-full text-sm text-gray-600 border-b border-transparent focus:border-blue-300 outline-none py-1 resize-none disabled:cursor-not-allowed"
                  placeholder="คำอธิบายแบบฟอร์ม (ถ้ามี)"
                  rows={2}
                />
              </div>

              {/* Questions List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={isDraft ? handleDragEnd : undefined}
              >
                <SortableContext
                  items={questions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {questions.length === 0 && (
                      <div className="bg-white rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                        <p className="text-gray-400 font-medium">ยังไม่มีคำถาม กดปุ่มด้านล่างเพื่อเพิ่มคำถามแรก</p>
                      </div>
                    )}
                    {questions.map((question, index) => (
                      <SortableItem
                        key={question.id}
                        question={question}
                        index={index}
                        isSelected={selectedId === question.id}
                        onSelect={setSelectedId}
                        onUpdate={handleUpdateQuestion}
                        onDelete={handleDeleteQuestion}
                        onDuplicate={handleDuplicateQuestion}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {/* Add Question Button */}
              {isDraft && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={handleAddQuestion}
                    disabled={saving}
                    className="group flex items-center gap-3 px-8 py-4 bg-white hover:bg-blue-50 disabled:opacity-50 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl transition-all shadow-sm active:scale-95 disabled:cursor-not-allowed"
                  >
                    <div className="p-2 bg-blue-50 group-hover:bg-blue-600 rounded-lg transition-colors">
                      <Plus className="h-6 w-6 text-blue-600 group-hover:text-white" />
                    </div>
                    <span className="font-bold text-gray-600 group-hover:text-blue-600">เพิ่มคำถาม</span>
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <FormPreview 
                questions={questions} 
                title={form?.title} 
                description={form?.description} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
>>>>>>> feature/ux-login-role-test
    </div>
  );
}
