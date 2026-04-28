'use client';

import React from 'react';
import { Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Criterion = {
  id: string;
  name: string;
  dimension?: string | null;
  weight: number;
};

type WeightInputProps = {
  criteria: Criterion[];
  onUpdate: (id: string, data: Partial<Criterion>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
};

export function WeightInput({ criteria, onUpdate, onDelete, onAdd }: WeightInputProps) {
  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);
  const isValid = totalWeight === 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-psu-navy flex items-center gap-2">
          เกณฑ์การประเมิน
          <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {criteria.length} รายการ
          </span>
        </h3>
        <button
          onClick={onAdd}
          className="p-1.5 text-psu-navy hover:bg-blue-50 rounded-lg transition-all"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-3">
        {criteria.map((c) => (
          <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm group">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={c.name}
                  onChange={(e) => onUpdate(c.id, { name: e.target.value })}
                  placeholder="ชื่อเกณฑ์..."
                  className="w-full font-semibold text-sm text-psu-navy bg-transparent border-none outline-none focus:ring-0 p-0"
                />
                <input
                  type="text"
                  value={c.dimension || ''}
                  onChange={(e) => onUpdate(c.id, { dimension: e.target.value })}
                  placeholder="มิติ (Dimension)..."
                  className="w-full text-xs text-gray-400 bg-transparent border-none outline-none focus:ring-0 p-0 mt-0.5"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="number"
                    value={c.weight}
                    onChange={(e) => onUpdate(c.id, { weight: parseInt(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-sm text-right font-bold text-psu-navy outline-none focus:ring-2 focus:ring-psu-navy/10"
                  />
                  <span className="absolute right-[-14px] top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                </div>
                <button
                  onClick={() => onDelete(c.id)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {criteria.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
            <p className="text-sm text-gray-400">ยังไม่มีเกณฑ์การประเมิน</p>
            <button onClick={onAdd} className="text-xs text-psu-navy font-semibold mt-2 hover:underline">
              + เพิ่มเกณฑ์แรก
            </button>
          </div>
        )}
      </div>

      <div className={cn(
        "mt-6 p-4 rounded-2xl border flex items-center justify-between transition-all shadow-sm",
        isValid 
          ? "bg-green-50 border-green-200 text-green-700" 
          : "bg-amber-50 border-amber-200 text-amber-700"
      )}>
        <div className="flex items-center gap-3">
          {isValid ? (
            <CheckCircle2 className="h-6 w-6 text-green-500" />
          ) : (
            <AlertCircle className="h-6 w-6 text-amber-500 animate-pulse" />
          )}
          <div>
            <p className="text-sm font-bold">น้ำหนักรวม</p>
            {!isValid && <p className="text-[10px] opacity-80">ต้องรวมให้ได้ 100% พอดี</p>}
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black">{totalWeight}</span>
          <span className="text-sm font-bold ml-1">%</span>
        </div>
      </div>
    </div>
  );
}
