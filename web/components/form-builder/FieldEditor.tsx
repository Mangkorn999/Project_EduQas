'use client';

import React from 'react';
import { X, Trash2, HelpCircle, GripVertical, Plus } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

const questionSchema = z.object({
  label: z.string().min(1, 'กรุณาระบุหัวข้อคำถาม'),
  helpText: z.string().optional(),
  isRequired: z.boolean(),
  questionType: z.string(),
  criterionId: z.string().uuid().nullable().optional(),
  config: z.object({
    options: z.array(z.object({
      label: z.string(),
      value: z.string()
    })).optional(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional(),
    step: z.number().optional(),
    placeholder: z.string().optional(),
  }).optional().nullable()
});

type QuestionValues = z.infer<typeof questionSchema>;

type FieldEditorProps = {
  question: any;
  criteria: any[];
  onSave: (data: any) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function FieldEditor({ question, criteria, onSave, onDelete, onClose }: FieldEditorProps) {
  const { register, handleSubmit, control, watch, formState: { isDirty } } = useForm<QuestionValues>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      label: question.label,
      helpText: question.helpText || '',
      isRequired: question.isRequired,
      questionType: question.questionType,
      criterionId: question.criterionId,
      config: question.config || { options: [] }
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "config.options" as any
  });

  const selectedType = watch('questionType');

  const onSubmit = (data: QuestionValues) => {
    onSave({ ...data, id: question.id });
  };

  const hasOptions = ['single_choice', 'multi_choice', 'select'].includes(selectedType);
  const hasMinMax = ['rating', 'scale_5', 'scale_10'].includes(selectedType);

  return (
    <div className="flex flex-col h-full bg-white shadow-2xl border-l border-gray-100">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-psu-navy">แก้ไขคำถาม</h2>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">Question Settings</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full text-gray-400">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        <form id="field-editor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">หัวข้อคำถาม</label>
            <textarea
              {...register('label')}
              rows={2}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-psu-navy/10 transition-all font-medium text-psu-navy resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">คำอธิบายเพิ่มเติม (Help Text)</label>
            <input
              {...register('helpText')}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-psu-navy/10 transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ผูกกับเกณฑ์</label>
              <select
                {...register('criterionId')}
                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-psu-navy/10"
              >
                <option value="">ไม่คำนวณคะแนน (Feedback Only)</option>
                {criteria.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" {...register('isRequired')} className="w-4 h-4 accent-psu-navy rounded border-gray-300" />
                <span className="text-sm font-semibold text-gray-600 group-hover:text-psu-navy transition-colors">บังคับตอบ</span>
              </label>
            </div>
          </div>

          <div className="h-px bg-gray-50 my-6"></div>

          {hasOptions && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-400 uppercase">ตัวเลือก (Options)</label>
                <button
                  type="button"
                  onClick={() => append({ label: '', value: '' })}
                  className="text-xs font-bold text-psu-navy flex items-center gap-1 hover:underline"
                >
                  <Plus className="h-3 w-3" /> เพิ่มตัวเลือก
                </button>
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 group">
                    <GripVertical className="h-4 w-4 text-gray-300 cursor-move" />
                    <input
                      {...register(`config.options.${index}.label` as any)}
                      placeholder={`ตัวเลือกที่ ${index + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-psu-navy/10"
                    />
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasMinMax && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Label เริ่มต้น</label>
                <input
                  {...register('config.minLabel')}
                  placeholder="เช่น น้อยที่สุด"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-psu-navy/10"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Label สุดท้าย</label>
                <input
                  {...register('config.maxLabel')}
                  placeholder="เช่น มากที่สุด"
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100 text-sm outline-none focus:ring-2 focus:ring-psu-navy/10"
                />
              </div>
            </div>
          )}

          {/* Placeholder for text types */}
          {['short_text', 'long_text', 'number'].includes(selectedType) && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">ข้อความใบ้ (Placeholder)</label>
              <input
                {...register('config.placeholder')}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-psu-navy/10 transition-all text-sm"
              />
            </div>
          )}
        </form>
      </div>

      <div className="p-6 border-t border-gray-50 bg-gray-50/50 flex flex-col gap-3">
        <button
          type="submit"
          form="field-editor-form"
          disabled={!isDirty}
          className={cn(
            "w-full py-4 rounded-2xl font-bold transition-all shadow-md active:scale-95",
            isDirty ? "bg-psu-navy text-white hover:bg-psu-blue-container" : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          บันทึกการแก้ไข
        </button>
        <button
          onClick={() => {
            if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบคำถามนี้?')) {
              onDelete(question.id);
            }
          }}
          className="w-full py-3 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all text-sm"
        >
          ลบคำถาม
        </button>
      </div>
    </div>
  );
}
