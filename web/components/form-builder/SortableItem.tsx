'use client';

import React from 'react';
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
  AlertCircle
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const Icon = typeConfig[question.type].icon;

  const handleAddOption = () => {
    const options = [...(question.options || []), `Option ${(question.options?.length || 0) + 1}`];
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
        "group relative bg-white border rounded-xl transition-all duration-200 ease-in-out",
        isSelected 
          ? "border-blue-400 ring-2 ring-blue-100 shadow-xl bg-blue-50/20 z-10" 
          : "border-gray-200 hover:border-gray-300 shadow-sm",
        isDragging && "opacity-50 scale-[1.02]"
      )}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners} 
        className="absolute left-1/2 -top-3 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-white border border-gray-200 rounded-md shadow-sm"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      <div className="p-6 space-y-4">
        {/* Normal Mode Header (Always visible or swapped) */}
        <div className="flex items-start gap-4">
          <span className="text-sm font-bold text-gray-400 pt-3 w-6">{index + 1}.</span>
          
          <div className="flex-1 space-y-4">
            {isSelected ? (
              <div className="flex flex-col md:flex-row gap-4 items-start">
                <input
                  autoFocus
                  type="text"
                  value={question.label}
                  onChange={(e) => onUpdate(question.id, { label: e.target.value })}
                  placeholder="Question text"
                  className="flex-1 w-full text-lg font-medium border-b-2 border-gray-100 focus:border-blue-600 outline-none py-2 transition-colors bg-transparent"
                />
                <select
                  value={question.type}
                  onChange={(e) => onUpdate(question.id, { type: e.target.value as QuestionType })}
                  className="w-full md:w-56 p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none"
                >
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="text-lg font-medium text-gray-900">
                    {question.label || 'Question'}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
                      {typeConfig[question.type].label}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Editing Controls / Preview */}
            <div className={cn("pt-2", !isSelected && "pointer-events-none opacity-60")}>
              {renderEditorContent(question, isSelected, {
                handleUpdateOption,
                handleRemoveOption,
                handleAddOption
              })}
            </div>
          </div>
        </div>

        {/* Footer Toolbar (Edit mode only) */}
        <AnimatePresence>
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2"
            >
              <button
                onClick={(e) => { e.stopPropagation(); onDuplicate(question.id); }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                title="Duplicate"
              >
                <Copy className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(question.id); }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-5 w-5" />
              </button>
              <div className="h-6 w-px bg-gray-200 mx-2" />
              <label className="flex items-center gap-3 cursor-pointer group">
                <span className="text-sm font-medium text-gray-600">Required</span>
                <div className="relative inline-flex items-center">
                  <input 
                    type="checkbox" 
                    checked={question.required}
                    onChange={(e) => onUpdate(question.id, { required: e.target.checked })}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
      return <div className="text-gray-400 text-sm border-b border-gray-100 border-dashed pb-1 w-1/2">Short answer text</div>;
    case 'long':
      return <div className="text-gray-400 text-sm border-b border-gray-100 border-dashed pb-1 w-full">Long answer text</div>;
    case 'multiple':
    case 'checkbox':
    case 'dropdown':
      return (
        <div className="space-y-2">
          {(q.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-3 group/opt">
              {q.type === 'multiple' && <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />}
              {q.type === 'checkbox' && <div className="w-5 h-5 rounded border-2 border-gray-300 shrink-0" />}
              {q.type === 'dropdown' && <span className="text-gray-300 font-mono text-xs w-5">{i + 1}.</span>}
              
              <input
                type="text"
                value={opt}
                onChange={(e) => handleUpdateOption(i, e.target.value)}
                className="flex-1 bg-transparent border-b border-transparent focus:border-gray-200 outline-none py-1 text-sm text-gray-700"
              />
              
              {isSelected && (q.options?.length || 0) > 1 && (
                <button
                  onClick={() => handleRemoveOption(i)}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover/opt:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {isSelected && (
            <button
              onClick={handleAddOption}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium pt-2"
            >
              <Plus className="h-4 w-4" /> Add option
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
