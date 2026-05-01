'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Star, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type QuestionType = 'short' | 'long' | 'multiple' | 'dropdown' | 'rating' | 'checkbox';

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

interface FormPreviewProps {
  questions: Question[];
  title?: string;
  description?: string;
}

export function FormPreview({ questions, title, description }: FormPreviewProps) {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Form Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border-t-[10px] border-t-blue-600 shadow-sm p-8 space-y-3"
      >
        <h1 className="text-3xl font-bold text-gray-900">{title || 'Untitled Form'}</h1>
        <p className="text-gray-600">{description || 'No description provided.'}</p>
        <div className="h-px bg-gray-100 pt-2" />
        <p className="text-xs text-red-500">* Required</p>
      </motion.div>

      {/* Questions */}
      {questions.map((q, index) => (
        <motion.div
          key={q.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 space-y-4"
        >
          <div className="flex items-start gap-1">
            <span className="text-base font-medium text-gray-900">
              {q.label || 'Question'}
              {q.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </div>

          <div className="pt-2">
            {renderInput(q)}
          </div>
        </motion.div>
      ))}

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: questions.length * 0.1 }}
        className="flex justify-between items-center pt-4"
      >
        <button
          disabled
          className="px-6 py-2 bg-blue-600 text-white rounded font-medium opacity-50 cursor-not-allowed shadow-md"
        >
          Submit
        </button>
        <button
          disabled
          className="text-blue-600 font-medium text-sm hover:bg-blue-50 px-4 py-2 rounded transition-all opacity-50"
        >
          Clear form
        </button>
      </motion.div>

      <footer className="text-center pt-8">
        <p className="text-xs text-gray-400 font-medium tracking-tight">PSU Eila Evaluation System</p>
      </footer>
    </div>
  );
}

function renderInput(q: Question) {
  switch (q.type) {
    case 'short':
      return (
        <input
          type="text"
          disabled
          placeholder="Short answer text"
          className="w-full max-w-md border-b border-gray-200 py-2 focus:border-blue-600 outline-none bg-transparent"
        />
      );
    case 'long':
      return (
        <textarea
          disabled
          placeholder="Long answer text"
          rows={3}
          className="w-full border-b border-gray-200 py-2 focus:border-blue-600 outline-none bg-transparent resize-none"
        />
      );
    case 'multiple':
      return (
        <div className="space-y-3">
          {(q.options || ['Option 1']).map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
              <span className="text-sm text-gray-700">{opt}</span>
            </div>
          ))}
        </div>
      );
    case 'checkbox':
      return (
        <div className="space-y-3">
          {(q.options || ['Option 1']).map((opt, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded border-2 border-gray-300" />
              <span className="text-sm text-gray-700">{opt}</span>
            </div>
          ))}
        </div>
      );
    case 'dropdown':
      return (
        <div className="w-64 flex items-center justify-between border border-gray-200 rounded px-4 py-3 bg-gray-50/50 text-gray-500 text-sm">
          <span>Choose</span>
          <ChevronDown className="h-4 w-4" />
        </div>
      );
    case 'rating':
      return (
        <div className="flex items-center gap-4">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              disabled
              className="flex flex-col items-center gap-1 group"
            >
              <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:border-blue-200">
                {val}
              </div>
            </button>
          ))}
        </div>
      );
    default:
      return null;
  }
}
