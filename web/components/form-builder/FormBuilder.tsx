'use client';

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

export function FormBuilder({ formId }: FormBuilderProps) {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [round, setRound] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'preview'>('questions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [faculties, setFaculties] = useState<{id: string; nameTh: string}[]>([]);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(['teacher', 'staff', 'student']));

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [formRes, facultiesRes] = await Promise.all([
        apiGet(`/api/v1/forms/${formId}`),
        apiGet('/api/v1/faculties'),
      ]);
      setForm(formRes.data);
      setLocalTitle(formRes.data.title || '');
      setLocalDescription(formRes.data.description || '');
      setLocalWebsiteName(formRes.data.websiteName || '');
      setLocalWebsiteUrl(formRes.data.websiteUrl || '');
      setLocalWebsiteOwnerFaculty(formRes.data.websiteOwnerFaculty || '');
      setQuestions((formRes.data.questions || []).map(mapFromBackend));
      setFaculties(facultiesRes.data ?? []);

      if (formRes.data.roundId) {
        const roundRes = await apiGet(`/api/v1/rounds/${formRes.data.roundId}`);
        setRound(roundRes.data);
      }
    } catch (err) {
      console.error(err);
      router.push('/forms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      setSaving(false);
    }
  };

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
    }
  };

  const handleAddQuestion = async () => {
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
    }
  };

  const handleDeleteQuestion = async (id: string) => {
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
  const handleOpenPublishModal = () => {
    if (form?.status !== 'draft') {
      showToast('แบบฟอร์มนี้ได้รับการเผยแพร่แล้วหรือปิดใช้งาน', 'error');
      return;
    }
    if (questions.length === 0) {
      showToast('ต้องมีอย่างน้อย 1 คำถามก่อนเผยแพร่', 'error');
      return;
    }
    // เลือกทุกคณะเป็น default
    setSelectedFacultyIds(new Set(faculties.map(f => f.id)));
    setSelectedRoles(new Set(['teacher', 'staff', 'student']));
    setShowPublishModal(true);
  };

  const handleConfirmPublish = async () => {
    try {
      setPublishing(true);
      await apiPost(`/api/v1/forms/${formId}/publish`, {
        targetFacultyIds: Array.from(selectedFacultyIds),
        targetRoles: Array.from(selectedRoles),
      });
      setForm((prev: any) => ({ ...prev, status: 'open' }));
      setShowPublishModal(false);
      showToast('เผยแพร่แบบฟอร์มสำเร็จ! ✅');
    } catch (err: any) {
      showToast(err.message || 'เผยแพร่ไม่สำเร็จ', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const toggleFaculty = (id: string) => {
    setSelectedFacultyIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFaculties = () => {
    if (selectedFacultyIds.size === faculties.length) {
      setSelectedFacultyIds(new Set());
    } else {
      setSelectedFacultyIds(new Set(faculties.map(f => f.id)));
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
                onClick={handleOpenPublishModal}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    <label className="text-[11px] font-bold text-blue-500 uppercase flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> รอบการประเมิน
                    </label>
                    <p className="text-sm font-bold text-blue-900 px-1 py-0.5">{round?.name || 'ไม่ระบุรอบ'}</p>
                  </div>
                  <div className="space-y-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5" /> หน่วยงานเจ้าของ
                    </label>
                    <input
                      type="text"
                      value={localWebsiteOwnerFaculty}
                      onChange={(e) => setLocalWebsiteOwnerFaculty(e.target.value)}
                      onBlur={() => handleSaveField('websiteOwnerFaculty', localWebsiteOwnerFaculty, form?.websiteOwnerFaculty)}
                      disabled={!isDraft}
                      className="w-full text-sm font-semibold text-gray-800 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none pb-1 transition-colors disabled:cursor-not-allowed"
                      placeholder="เช่น คณะวิศวกรรมศาสตร์"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5" /> ชื่อเว็บไซต์เป้าหมาย
                    </label>
                    <input
                      type="text"
                      value={localWebsiteName}
                      onChange={(e) => setLocalWebsiteName(e.target.value)}
                      onBlur={() => handleSaveField('websiteName', localWebsiteName, form?.websiteName)}
                      disabled={!isDraft}
                      className="w-full text-sm font-semibold text-gray-800 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none pb-1 transition-colors disabled:cursor-not-allowed"
                      placeholder="เช่น ระบบลงทะเบียนเรียน"
                    />
                  </div>

                  <div className="space-y-2 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <label className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5" /> URL เว็บไซต์เป้าหมาย
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={localWebsiteUrl}
                        onChange={(e) => setLocalWebsiteUrl(e.target.value)}
                        onBlur={() => handleSaveField('websiteUrl', localWebsiteUrl, form?.websiteUrl)}
                        disabled={!isDraft}
                        className="flex-1 text-sm font-mono text-blue-600 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none pb-1 transition-colors disabled:cursor-not-allowed"
                        placeholder="https://..."
                      />
                      {localWebsiteUrl && (
                        <a href={localWebsiteUrl} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors bg-white shadow-sm border border-gray-200">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
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

      {/* Publish Modal — เลือกคณะที่จะส่งแบบฟอร์มให้ */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-950/60 backdrop-blur-sm"
              onClick={() => setShowPublishModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-blue-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">เผยแพร่แบบฟอร์ม</h2>
                    <p className="text-blue-100 text-xs mt-0.5">เลือกคณะ/หน่วยงานที่ต้องการส่งแบบฟอร์มประเมิน</p>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                  <p className="text-xs font-medium text-amber-800">
                    ⚠️ หลังจากเผยแพร่แล้ว จะไม่สามารถแก้ไขคำถามได้ หากต้องการแก้ไขให้ Rollback หรือ Duplicate ก่อน
                  </p>
                </div>

                {/* Role Selection — show only for non-university scope */}
                {form?.scope !== 'university' && (
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <p className="text-sm font-bold text-gray-700 mb-2">ผู้ประเมิน</p>
                    <div className="flex flex-wrap gap-4">
                      {[
                        { role: 'teacher', label: 'อาจารย์' },
                        { role: 'staff', label: 'บุคลากร' },
                        { role: 'student', label: 'นักศึกษา' },
                      ].map(({ role, label }) => (
                        <label key={role} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedRoles.has(role)}
                            onChange={(e) => {
                              setSelectedRoles(prev => {
                                const next = new Set(prev);
                                e.target.checked ? next.add(role) : next.delete(role);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Select All */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-700">
                    คณะ/หน่วยงานเป้าหมาย ({selectedFacultyIds.size}/{faculties.length})
                  </span>
                  <button
                    type="button"
                    onClick={toggleAllFaculties}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {selectedFacultyIds.size === faculties.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                </div>

                {/* Faculty List */}
                <div className="space-y-1.5">
                  {faculties.map(faculty => (
                    <label
                      key={faculty.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                        selectedFacultyIds.has(faculty.id)
                          ? "bg-blue-50 border-blue-200"
                          : "bg-white border-gray-100 hover:bg-gray-50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedFacultyIds.has(faculty.id)}
                        onChange={() => toggleFaculty(faculty.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={cn(
                        "text-sm font-medium",
                        selectedFacultyIds.has(faculty.id) ? "text-blue-800" : "text-gray-700"
                      )}>
                        {faculty.nameTh}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPublish}
                  disabled={publishing || selectedFacultyIds.size === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  {publishing ? 'กำลังเผยแพร่...' : `ยืนยันเผยแพร่ (${selectedFacultyIds.size} คณะ)`}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
