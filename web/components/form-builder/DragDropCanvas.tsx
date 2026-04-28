'use client';

import React from 'react';
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
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Type, 
  AlignLeft, 
  CheckSquare, 
  List, 
  Star, 
  Hash, 
  Calendar, 
  Upload, 
  ToggleLeft,
  Settings2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = {
  short_text: Type,
  long_text: AlignLeft,
  single_choice: CheckSquare,
  multi_choice: List,
  rating: Star,
  scale_5: Hash,
  scale_10: Hash,
  boolean: ToggleLeft,
  date: Calendar,
  number: Hash,
  file: Upload,
};

function SortableItem({ id, question, criteria, isSelected, onClick }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
  };

  const Icon = typeIcons[question.questionType] || Type;
  const criterion = criteria.find((c: any) => c.id === question.criterionId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-white border rounded-2xl p-4 mb-3 transition-all cursor-pointer shadow-sm",
        isSelected ? "border-psu-navy ring-4 ring-psu-navy/5 shadow-md" : "border-gray-100 hover:border-psu-navy/30",
        isDragging && "opacity-50 scale-105"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-50 rounded-lg">
          <GripVertical className="h-5 w-5 text-gray-300 group-hover:text-gray-400" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-gray-50 rounded-lg">
              <Icon className="h-4 w-4 text-psu-navy/60" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">{question.questionType.replace('_', ' ')}</span>
            {question.isRequired && (
              <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Required</span>
            )}
          </div>
          <h4 className="font-bold text-psu-navy text-sm mb-1">{question.label || 'ไม่มีชื่อคำถาม'}</h4>
          {question.helpText && <p className="text-xs text-gray-400 line-clamp-1">{question.helpText}</p>}
        </div>

        {criterion ? (
          <div className="text-right">
            <span className="text-[10px] block font-bold text-gray-400 uppercase tracking-tighter mb-1">Criterion</span>
            <div className="bg-blue-50 text-psu-navy px-2 py-1 rounded-lg text-xs font-bold border border-blue-100">
              {criterion.name}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 text-gray-400 px-2 py-1 rounded-lg text-[10px] font-bold">
            Feedback Only
          </div>
        )}
      </div>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all">
        <Settings2 className="h-5 w-5 text-psu-navy/30" />
      </div>
    </div>
  );
}

export function DragDropCanvas({ questions, criteria, selectedId, onReorder, onSelect }: any) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q: any) => q.id === active.id);
      const newIndex = questions.findIndex((q: any) => q.id === over.id);
      
      const newItems = arrayMove(questions, oldIndex, newIndex);
      onReorder(newItems);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-psu-navy">โครงสร้างคำถาม</h3>
        <p className="text-xs text-gray-400">ลากเพื่อเปลี่ยนลำดับ หรือคลิกเพื่อแก้ไข</p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q: any) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          {questions.map((question: any) => (
            <SortableItem
              key={question.id}
              id={question.id}
              question={question}
              criteria={criteria}
              isSelected={selectedId === question.id}
              onClick={() => onSelect(question.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {questions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50/50 border-2 border-dashed border-gray-100 rounded-3xl">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <Plus className="h-8 w-8 text-gray-200" />
          </div>
          <p className="text-gray-400 font-medium">ยังไม่มีคำถามในส่วนนี้</p>
          <p className="text-xs text-gray-300 mt-1">กดปุ่ม "เพิ่มคำถาม" เพื่อเริ่มต้น</p>
        </div>
      )}
    </div>
  );
}

function Plus(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
