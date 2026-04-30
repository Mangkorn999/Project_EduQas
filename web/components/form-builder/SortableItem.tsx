'use client';

import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Copy, 
  Trash2, 
  Plus, 
  X,
  Type,
  AlignLeft,
  List,
  ChevronDown,
  Star,
  CheckSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export type QuestionType = 'short' | 'long' | 'multiple' | 'dropdown' | 'rating' | 'checkbox';

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

interface SortableItemProps {
  question: Question;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Question>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const typeConfig: Record<QuestionType, { label: string; icon: any }> = {
  short: { label: 'Short Answer', icon: Type },
  long: { label: 'Long Answer', icon: AlignLeft },
  multiple: { label: 'Multiple Choice', icon: List },
  dropdown: { label: 'Dropdown', icon: ChevronDown },
  rating: { label: 'Rating (1-5)', icon: Star },
  checkbox: { label: 'Checkboxes', icon: CheckSquare },
};

export function SortableItem({ 
  question, 
  index, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onDelete, 
  onDuplicate 
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  // Local state for label — only call onUpdate (API) on blur or Enter key
  // This prevents an API call per keystroke
  const [localLabel, setLocalLabel] = useState(question.label);

  useEffect(() => {
    setLocalLabel(question.label);
  }, [question.label]);

  const commitLabel = () => {
    if (localLabel !== question.label) {
      onUpdate(question.id, { label: localLabel });
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const Icon = typeConfig[question.type].icon;

  const handleAddOption = () => {
    const options = [...(question.options || []), `ตัวเลือก ${(question.options?.length || 0) + 1}`];
    onUpdate(question.id, { options });
  };

  const handleUpdateOption = (idx: number, value: string) => {
    const options = [...(question.options || [])];
    options[idx] = value;
    onUpdate(question.id, { options });
  };

  const handleRemoveOption = (idx: number) => {
    const options = (question.options || []).filter((_, i) => i !== idx);
    onUpdate(question.id, { options });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(question.id)}
      className={cn(
        "group relative bg-white border border-gray-200 rounded-xl transition-all duration-200 ease-in-out",
        isSelected
          ? "border-blue-500 ring-2 ring-blue-200 shadow-lg bg-blue-50/30 z-10"
          : "hover:border-gray-300 hover:shadow-md",
        isDragging && "opacity-50 scale-[1.01]"
      )}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-6 -top-2.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1.5 bg-white border border-gray-200 rounded-lg shadow-md z-20 hover:border-gray-300"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-gray-500" />
      </div>

      <div className="p-5 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-xs font-bold text-gray-400 pt-1.5 w-5 shrink-0">{index + 1}.</span>

          <div className="flex-1 space-y-3">
            {isSelected ? (
              <div className="flex flex-col md:flex-row gap-3 items-start">
                <input
                  autoFocus
                  type="text"
                  value={localLabel}
                  onChange={(e) => setLocalLabel(e.target.value)}
                  onBlur={commitLabel}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitLabel();
                    }
                  }}
                  placeholder="พิมพ์คำถาม..."
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 w-full text-base font-semibold border-b border-gray-200 focus:border-blue-500 outline-none py-1.5 transition-colors bg-transparent"
                />
                <select
                  value={question.type}
                  onChange={(e) => onUpdate(question.id, { type: e.target.value as QuestionType })}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full md:w-48 p-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
                >
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-base font-semibold text-gray-900">
                    {question.label || 'คำถามใหม่'}
                    {question.required && <span className="text-red-500 ml-0.5">*</span>}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                      {typeConfig[question.type].label}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Editing Controls / Preview */}
            <div className={cn("pt-1", !isSelected && "pointer-events-none opacity-50")}>
              {renderEditorContent(question, isSelected, {
                handleUpdateOption,
                handleRemoveOption,
                handleAddOption
              })}
            </div>
          </div>
        </div>

        {/* Footer Toolbar */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pt-3 border-t border-gray-100 flex items-center justify-end gap-1.5"
            >
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(question.id); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Duplicate"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(question.id); }}
                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="h-4 w-px bg-gray-200 mx-1" />
              <label className="flex items-center gap-2 cursor-pointer group" onClick={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-gray-600">บังคับตอบ</span>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => onUpdate(question.id, { required: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function renderEditorContent(q: Question, isSelected: boolean, handlers: any) {
  const { handleUpdateOption, handleRemoveOption, handleAddOption } = handlers;

  switch (q.type) {
    case 'short':
      return <div className="text-gray-400 text-sm border-b border-gray-100 border-dashed pb-1 w-1/2">คำตอบสั้น...</div>;
    case 'long':
      return <div className="text-gray-400 text-sm border-b border-gray-100 border-dashed pb-1 w-full">คำตอบยาว...</div>;
    case 'multiple':
    case 'checkbox':
    case 'dropdown':
      return (
        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
          {(q.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-2 group/opt">
              {q.type === 'multiple' && <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />}
              {q.type === 'checkbox' && <div className="w-4 h-4 rounded border-2 border-gray-300 shrink-0" />}
              {q.type === 'dropdown' && <span className="text-gray-300 font-mono text-[10px] w-4">{i + 1}.</span>}

              <input
                type="text"
                value={opt}
                onChange={(e) => handleUpdateOption(i, e.target.value)}
                className="flex-1 bg-transparent border-b border-gray-100 focus:border-blue-300 outline-none py-0.5 text-sm text-gray-700"
              />

              {isSelected && (q.options?.length || 0) > 1 && (
                <button
                  onClick={() => handleRemoveOption(i)}
                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {isSelected && (
            <button
              onClick={handleAddOption}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold pt-1"
            >
              <Plus className="h-3.5 w-3.5" /> เพิ่มตัวเลือก
            </button>
          )}
        </div>
      );
    case 'rating':
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((v) => (
            <div key={v} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-xs text-gray-400 font-bold bg-gray-50/50">
              {v}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
