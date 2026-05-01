'use client';

import Link from 'next/link';
import {useRouter, useSearchParams} from 'next/navigation';
import {use, useEffect, useMemo, useState} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Globe,
  Save,
  Send,
} from 'lucide-react';
import {apiGet, apiPost} from '@/lib/api';
import {cn} from '@/lib/utils';

type QuestionType = 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'rating';

type BackendQuestion = {
  id: string;
  label: string;
  helpText?: string | null;
  questionType: QuestionType | string;
  isRequired?: boolean;
  criterionId?: string | null;
  sortOrder?: number;
  config?: {
    options?: Array<{label?: string; value?: string} | string>;
    min?: number;
    max?: number;
  } | null;
};

type BackendCriterion = {
  id: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
};

type EvaluationForm = {
  id: string;
  title?: string;
  description?: string;
  websiteName?: string;
  websiteUrl?: string;
  websiteOwnerFaculty?: string;
  questions?: BackendQuestion[];
  criteria?: BackendCriterion[];
};

type AnswerValue = string | number | string[];
type Answers = Record<string, AnswerValue>;

type AnswerPayload = {
  questionId: string;
  valueNumber?: number;
  valueText?: string;
  valueJson?: string;
};

const fallbackQuestions: BackendQuestion[] = [
  {
    id: 'mock-q1',
    label: 'ข้อมูลสำคัญของเว็บไซต์ค้นหาได้ง่าย',
    questionType: 'rating',
    isRequired: true,
    criterionId: 'mock-c1',
  },
  {
    id: 'mock-q2',
    label: 'เมนูและโครงสร้างเว็บไซต์ใช้งานได้ชัดเจน',
    questionType: 'rating',
    isRequired: true,
    criterionId: 'mock-c1',
  },
  {
    id: 'mock-q3',
    label: 'ข้อเสนอแนะเพิ่มเติม',
    questionType: 'long_text',
    criterionId: 'mock-c2',
  },
];

const fallbackCriteria: BackendCriterion[] = [
  {id: 'mock-c1', name: 'การใช้งานและการเข้าถึง'},
  {id: 'mock-c2', name: 'ข้อเสนอแนะ'},
];

export default function EvaluatorFormPage({params}: {params: Promise<{websiteId: string}>}) {
  const {websiteId} = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const readonly = searchParams.get('readonly') === 'true';
  const draftKey = `eila.evaluation.${websiteId}.draft`;

  const [form, setForm] = useState<EvaluationForm | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        setLoading(true);
        const res = await apiGet(`/api/v1/forms/${websiteId}`);
        setForm(res.data);

        const savedDraft = window.localStorage.getItem(draftKey);
        if (savedDraft) {
          setAnswers(JSON.parse(savedDraft));
        }

        if (!readonly) {
          await apiPost(`/api/v1/forms/${websiteId}/website-open`, {});
        }
      } catch (err) {
        console.error('Failed to load evaluation form', err);
        setForm({
          id: websiteId,
          title: 'แบบประเมินเว็บไซต์',
          description: 'แบบฟอร์มสำรองสำหรับกรณีที่ยังไม่สามารถโหลดข้อมูลจาก API ได้',
          websiteName: 'เว็บไซต์ที่ได้รับมอบหมาย',
          websiteUrl: 'https://www.psu.ac.th',
          questions: fallbackQuestions,
          criteria: fallbackCriteria,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [draftKey, readonly, websiteId]);

  const sections = useMemo(() => buildSections(form), [form]);
  const activeSection = sections[currentSection] ?? sections[0];
  const totalQuestions = sections.reduce((sum, section) => sum + section.questions.length, 0);
  const answeredQuestions = sections.reduce(
    (sum, section) => sum + section.questions.filter((question) => hasAnswer(answers[question.id])).length,
    0
  );
  const progress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;

  const saveDraft = () => {
    setSaving(true);
    window.localStorage.setItem(draftKey, JSON.stringify(answers));
    setNotice('บันทึกร่างแล้ว');
    window.setTimeout(() => setSaving(false), 250);
  };

  const submitEvaluation = async () => {
    try {
      setSubmitting(true);
      await apiPost(`/api/v1/forms/${websiteId}/website-open`, {});
      await apiPost(`/api/v1/forms/${websiteId}/responses`, {answers: toAnswerPayload(answers, sections)});
      window.localStorage.removeItem(draftKey);
      setNotice('ส่งแบบประเมินเรียบร้อยแล้ว');
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to submit evaluation', err);
      setNotice(err instanceof Error ? err.message : 'ส่งแบบประเมินไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form || !activeSection) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#CA8A04]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-4 py-2 text-sm font-semibold text-[#1C1917] transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับแดชบอร์ด
        </Link>
        <div className="text-sm font-semibold text-[#78716C]">
          ส่วนที่ {currentSection + 1}/{sections.length}
        </div>
      </div>

      <section className="rounded-xl border border-[#E7E5E4] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
              <Globe className="h-5 w-5" />
            </div>
            <h1 className="font-[var(--font-heading)] text-[28px] font-semibold leading-tight text-[#0C0A09]">
              {form.websiteName || form.title || 'แบบประเมินเว็บไซต์'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#78716C]">
              {form.description || 'กรอกคะแนนและข้อเสนอแนะตามเกณฑ์การประเมินเว็บไซต์ที่ได้รับมอบหมาย'}
            </p>
            <a
              href={form.websiteUrl || '#'}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex max-w-full items-center gap-2 truncate text-sm font-medium text-[#92400E] hover:text-[#CA8A04]"
            >
              <span className="truncate">{form.websiteUrl || 'ไม่พบ URL เว็บไซต์'}</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
          </div>

          <div className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] p-4 lg:w-72">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[#78716C]">
              <span>ความคืบหน้า</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-[#CA8A04]" style={{width: `${progress}%`}} />
            </div>
            <p className="mt-2 text-xs text-[#78716C]">
              ตอบแล้ว {answeredQuestions}/{totalQuestions} ข้อ
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-xl border border-[#E7E5E4] bg-white p-3 shadow-sm">
          {sections.map((section, index) => {
            const active = index === currentSection;
            const complete = section.questions.every((question) => hasAnswer(answers[question.id]));
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setCurrentSection(index)}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm transition-colors',
                  active ? 'bg-amber-50 font-semibold text-[#92400E]' : 'text-[#78716C] hover:bg-gray-50'
                )}
              >
                <span className="truncate">{section.title}</span>
                {complete && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </button>
            );
          })}
        </aside>

        <section className="rounded-xl border border-[#E7E5E4] bg-white shadow-sm">
          <div className="border-b border-[#E7E5E4] px-5 py-4">
            <h2 className="font-[var(--font-heading)] text-xl font-semibold text-[#0C0A09]">{activeSection.title}</h2>
            {activeSection.description && <p className="mt-1 text-sm text-[#78716C]">{activeSection.description}</p>}
          </div>

          <div className="space-y-5 p-5">
            {activeSection.questions.map((question, index) => (
              <QuestionField
                key={question.id}
                index={index}
                question={question}
                value={answers[question.id]}
                readonly={readonly}
                onChange={(value) => setAnswers((prev) => ({...prev, [question.id]: value}))}
              />
            ))}
          </div>
        </section>
      </div>

      {notice && (
        <div className="rounded-xl border border-[#E7E5E4] bg-white px-4 py-3 text-sm font-medium text-[#78716C] shadow-sm">
          {notice}
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 border-t border-[#E7E5E4] bg-[#FAFAF9]/95 px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={currentSection === 0}
            onClick={() => setCurrentSection((value) => Math.max(0, value - 1))}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-4 text-sm font-semibold text-[#1C1917] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            ส่วนก่อนหน้า
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            {!readonly && (
              <button
                type="button"
                onClick={saveDraft}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#E7E5E4] bg-white px-4 text-sm font-semibold text-[#1C1917] transition-colors hover:bg-gray-50"
              >
                <Save className="h-4 w-4" />
                บันทึกร่าง
              </button>
            )}

            {currentSection < sections.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentSection((value) => Math.min(sections.length - 1, value + 1))}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#1C1917] px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-700"
              >
                ส่วนถัดไป
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              !readonly && (
                <button
                  type="button"
                  onClick={submitEvaluation}
                  disabled={submitting}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#CA8A04] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#A16207] disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  ส่งแบบประเมิน
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionField({
  question,
  index,
  value,
  readonly,
  onChange,
}: {
  question: BackendQuestion;
  index: number;
  value?: AnswerValue;
  readonly: boolean;
  onChange: (value: AnswerValue) => void;
}) {
  return (
    <div className="rounded-xl border border-[#E7E5E4] bg-white p-5 shadow-sm">
      <label className="block text-sm font-semibold leading-6 text-[#0C0A09]">
        {index + 1}. {question.label}
        {question.isRequired && <span className="ml-1 text-red-600">*</span>}
      </label>
      {question.helpText && <p className="mt-1 text-sm text-[#78716C]">{question.helpText}</p>}
      <div className="mt-4">{renderQuestionInput(question, value, readonly, onChange)}</div>
    </div>
  );
}

function renderQuestionInput(
  question: BackendQuestion,
  value: AnswerValue | undefined,
  readonly: boolean,
  onChange: (value: AnswerValue) => void
) {
  if (question.questionType === 'rating') {
    const max = question.config?.max ?? 5;
    return (
      <div className="flex flex-wrap gap-3">
        {Array.from({length: max}, (_, index) => index + 1).map((rating) => (
          <button
            key={rating}
            type="button"
            disabled={readonly}
            onClick={() => onChange(rating)}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
              value === rating
                ? 'border-[#CA8A04] bg-amber-50 text-[#92400E]'
                : 'border-[#E7E5E4] bg-white text-[#78716C] hover:bg-gray-50',
              readonly && 'cursor-not-allowed opacity-70'
            )}
          >
            {rating}
          </button>
        ))}
      </div>
    );
  }

  if (question.questionType === 'single_choice') {
    return (
      <div className="grid gap-2">
        {getOptions(question).map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E7E5E4] px-4 py-3 hover:bg-gray-50">
            <input
              type="radio"
              disabled={readonly}
              name={question.id}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="h-4 w-4 accent-[#CA8A04]"
            />
            <span className="text-sm text-[#0C0A09]">{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.questionType === 'multi_choice') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <div className="grid gap-2">
        {getOptions(question).map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E7E5E4] px-4 py-3 hover:bg-gray-50">
            <input
              type="checkbox"
              disabled={readonly}
              checked={selected.includes(option)}
              onChange={(event) => {
                onChange(event.target.checked ? [...selected, option] : selected.filter((item) => item !== option));
              }}
              className="h-4 w-4 rounded accent-[#CA8A04]"
            />
            <span className="text-sm text-[#0C0A09]">{option}</span>
          </label>
        ))}
      </div>
    );
  }

  if (question.questionType === 'long_text') {
    return (
      <textarea
        disabled={readonly}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20 disabled:cursor-not-allowed"
        placeholder="พิมพ์คำตอบหรือข้อเสนอแนะ"
      />
    );
  }

  return (
    <input
      disabled={readonly}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-[#E7E5E4] bg-[#FAFAF9] px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-[#CA8A04]/20 disabled:cursor-not-allowed"
      placeholder="พิมพ์คำตอบ"
    />
  );
}

function buildSections(form: EvaluationForm | null) {
  const questions = form?.questions?.length ? [...form.questions] : fallbackQuestions;
  const criteria = form?.criteria?.length ? [...form.criteria] : fallbackCriteria;

  return criteria
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((criterion) => ({
      id: criterion.id,
      title: criterion.name,
      description: criterion.description ?? undefined,
      questions: questions
        .filter((question) => question.criterionId === criterion.id)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    }))
    .filter((section) => section.questions.length > 0)
    .concat(
      questions.some((question) => !question.criterionId)
        ? [
            {
              id: 'uncategorized',
              title: 'คำถามทั่วไป',
              description: undefined,
              questions: questions.filter((question) => !question.criterionId),
            },
          ]
        : []
    );
}

function getOptions(question: BackendQuestion) {
  const options = question.config?.options ?? [];
  if (options.length === 0) return ['ผ่านเกณฑ์', 'ควรปรับปรุง'];
  return options.map((option) => (typeof option === 'string' ? option : option.label || option.value || 'ตัวเลือก'));
}

function hasAnswer(value: AnswerValue | undefined) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== '';
}

function toAnswerPayload(answers: Answers, sections: ReturnType<typeof buildSections>): AnswerPayload[] {
  const questions = sections.flatMap((section) => section.questions);

  return questions
    .filter((question) => hasAnswer(answers[question.id]))
    .map((question) => {
      const value = answers[question.id];
      if (typeof value === 'number') return {questionId: question.id, valueNumber: value};
      if (Array.isArray(value)) return {questionId: question.id, valueJson: JSON.stringify(value)};
      return {questionId: question.id, valueText: value};
    });
}
