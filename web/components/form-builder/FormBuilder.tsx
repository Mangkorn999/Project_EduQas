'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  Settings, 
  ChevronLeft, 
  Check,
  History,
  FileText,
  Layout
} from 'lucide-react';
import { apiGet, apiPatch, apiPost, apiDelete } from '@/lib/api';
import { cn } from '@/lib/utils';
import { SortableItem, Question, QuestionType } from './SortableItem';
import { FormPreview } from './FormPreview';

interface FormBuilderProps {
  formId: string;
}

export function FormBuilder({ formId }: FormBuilderProps) {
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeTab, setActiveTab] = useState<'questions' | 'preview'>('questions');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(false);

  const mapFromBackend = (q: any): Question => ({
    id: q.id,
    label: q.label,
    type: mapTypeFromBackend(q.questionType),
    required: q.isRequired,
    options: q.config?.options?.map((o: any) => o.label) || []
  });

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await apiGet(`/api/v1/forms/${formId}`);
      setForm(res.data);
      setQuestions(res.data.questions.map(mapFromBackend) || []);
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

  const showAutoSave = useCallback(() => {
    setAutoSave(true);
    setTimeout(() => setAutoSave(false), 1500);
  }, []);

  const handleUpdateQuestion = async (id: string, updates: Partial<Question>) => {
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
      showAutoSave();
    } catch (err) {
      console.error('❌ Failed to update question:', err);
      setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
      alert(`Update failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    try {
      setSaving(true);
      const res = await apiPost(`/api/v1/forms/${formId}/questions`, {
        label: 'Question',
        questionType: 'short_text',
        isRequired: false,
        sortOrder: questions.length
      });
      const newQuestion = mapFromBackend(res.data);
      setQuestions([...questions, newQuestion]);
      setSelectedId(newQuestion.id);
      showAutoSave();
    } catch (err) {
      console.error('❌ Add failed:', err);
      alert(`Add failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    try {
      setSaving(true);
      await apiDelete(`/api/v1/forms/${formId}/questions/${id}`);
      setQuestions(prev => prev.filter(q => q.id !== id));
      if (selectedId === id) setSelectedId(null);
      showAutoSave();
    } catch (err) {
      console.error('❌ Failed to delete question:', err);
      alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateQuestion = async (id: string) => {
    const original = questions.find(q => q.id === id);
    if (!original) return;

    try {
      setSaving(true);
      const res = await apiPost(`/api/v1/forms/${formId}/questions`, {
        label: `${original.label} (Copy)`,
        questionType: mapTypeToBackend(original.type),
        isRequired: original.required,
        config: { options: original.options?.map(o => ({ label: o, value: o })) },
        sortOrder: questions.length
      });
      const newQuestion = mapFromBackend(res.data);
      setQuestions([...questions, newQuestion]);
      setSelectedId(newQuestion.id);
      showAutoSave();
    } catch (err) {
      console.error('❌ Duplicate failed:', err);
      alert(`Duplicate failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex(q => q.id === active.id);
      const newIndex = questions.findIndex(q => q.id === over.id);
      const newItems = arrayMove(questions, oldIndex, newIndex);
      
      setQuestions(newItems);
      
      try {
        setSaving(true);
        await apiPatch(`/api/v1/forms/${formId}/questions/reorder`, 
          newItems.map((q, i) => ({ id: q.id, sortOrder: i }))
        );
        showAutoSave();
      } catch (err) {
        console.error('❌ Reorder failed:', err);
        setQuestions(questions);
        alert(`Reorder failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setSaving(false);
      }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 pb-20 font-sans text-gray-900">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Back Button + Title */}
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
                <h1 className="font-bold text-gray-900 text-sm md:text-base truncate">
                  {form?.title}
                </h1>
                <AnimatePresence mode="wait">
                  {autoSave ? (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase"
                    >
                      <Check className="h-3 w-3" /> บันทึกแล้ว
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      className="text-[10px] font-bold text-gray-400 uppercase"
                    >
                      {saving ? 'บันทึก...' : 'พร้อม'}
                    </motion.div>
                  )}
                </AnimatePresence>
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
              <span className="hidden sm:inline">Questions</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap",
                activeTab === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:bg-gray-200"
              )}
            >
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors hidden md:block">
              <Settings className="h-5 w-5" />
            </button>
            <button 
              onClick={() => router.push(`/forms/${formId}/versions`)}
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 hover:text-blue-600 transition-colors"
            >
              <History className="h-4 w-4" />
            </button>
            <button className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded-xl font-bold text-xs sm:text-sm shadow-md hover:bg-blue-700 active:scale-95 transition-all whitespace-nowrap">
              Send
            </button>
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
            <Layout className="h-3 w-3" /> Edit
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1",
              activeTab === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
            )}
          >
            <Eye className="h-3 w-3" /> View
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto pt-8 px-4">
        <AnimatePresence mode="wait">
          {activeTab === 'questions' ? (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Form Title & Description */}
              <div className="bg-white rounded-xl border-t-[8px] border-t-blue-600 shadow-sm p-8 space-y-4">
                <input
                  type="text"
                  value={form?.title || ''}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onBlur={() => apiPatch(`/api/v1/forms/${formId}`, { title: form?.title }).then(showAutoSave).catch(err => console.error('Update title failed:', err))}
                  className="w-full text-4xl font-bold text-gray-900 border-b-2 border-transparent focus:border-blue-300 outline-none py-2 transition-colors"
                  placeholder="Untitled Form"
                />
                <textarea
                  value={form?.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  onBlur={() => apiPatch(`/api/v1/forms/${formId}`, { description: form?.description }).then(showAutoSave).catch(err => console.error('Update description failed:', err))}
                  className="w-full text-sm text-gray-600 border-b border-transparent focus:border-blue-300 outline-none py-1 resize-none"
                  placeholder="Form description"
                  rows={1}
                />
              </div>

              {/* Questions List */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map(q => q.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
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

              {/* Add Question Button - Clean & Centered */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleAddQuestion}
                  disabled={saving}
                  className="group flex items-center gap-3 px-8 py-4 bg-white hover:bg-blue-50 disabled:opacity-50 border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl transition-all shadow-sm active:scale-95 disabled:cursor-not-allowed"
                >
                  <div className="p-2 bg-blue-50 group-hover:bg-blue-600 rounded-lg transition-colors">
                    <Plus className="h-6 w-6 text-blue-600 group-hover:text-white" />
                  </div>
                  <span className="font-bold text-gray-600 group-hover:text-blue-600">Add Question</span>
                </button>
              </div>
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
    </div>
  );
}
