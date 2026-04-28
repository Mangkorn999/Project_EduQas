/**
 * Weight & Normalization Service
 *
 * ทำหน้าที่ normalize ค่าคะแนนจาก question types ต่างๆ ให้อยู่ในช่วง [0, 1]
 * เพื่อให้สูตร weighted average ใน score.service.ts ทำงานได้ถูกต้อง
 * ตาม scoring-and-ranking.md §3.1
 */

type QuestionType = 'rating' | 'scale_5' | 'scale_10' | 'number' | 'boolean'
  | 'short_text' | 'long_text' | 'single_choice' | 'multi_choice' | 'date'

// Question types ที่สามารถนำมาคำนวณคะแนนได้ (numeric-capable)
// ตาม scoring-and-ranking.md §2
const NUMERIC_CAPABLE_TYPES: ReadonlySet<QuestionType> = new Set([
  'rating',
  'scale_5',
  'scale_10',
  'number',
  'boolean',
])

/**
 * เช็คว่า question type นี้สามารถ score ได้หรือไม่
 * short_text, long_text, single_choice, multi_choice, date ไม่สามารถ score ได้
 */
export function isNumericCapable(questionType: string): boolean {
  return NUMERIC_CAPABLE_TYPES.has(questionType as QuestionType)
}

/**
 * Normalize ค่าคะแนนจาก scale ต่างๆ ให้เป็นค่าระหว่าง [0, 1]
 *
 * ตาม scoring-and-ranking.md §3.1:
 * - scale_5   → value / 5
 * - scale_10  → value / 10
 * - rating    → (value - 1) / 4  (rating เริ่มจาก 1-5)
 * - boolean   → value ? 1 : 0
 * - number    → ต้องระบุ min/max เพื่อ normalize
 *
 * @returns ค่าระหว่าง 0-1 หรือ null ถ้า type ไม่รองรับ
 */
export function normalizeValue(
  questionType: string,
  value: number | null | undefined,
  config?: { min?: number; max?: number }
): number | null {
  if (value === null || value === undefined) return null
  if (!isNumericCapable(questionType)) return null

  switch (questionType) {
    case 'scale_5':
      return Math.max(0, Math.min(value / 5, 1))

    case 'scale_10':
      return Math.max(0, Math.min(value / 10, 1))

    case 'rating':
      // rating คือ 1-5 → normalize เป็น 0-1
      return Math.max(0, Math.min((value - 1) / 4, 1))

    case 'boolean':
      return value ? 1 : 0

    case 'number': {
      // number ต้องมี min/max จาก config ของ question เพื่อ normalize ได้ถูก
      const min = config?.min ?? 0
      const max = config?.max ?? 100
      if (max === min) return 0
      return Math.max(0, Math.min((value - min) / (max - min), 1))
    }

    default:
      return null
  }
}

/**
 * แปลงคะแนน normalized (0-1) เป็น display score (0-100)
 * ปัดเศษ round half up ทศนิยม 2 ตำแหน่ง
 * ตาม scoring-and-ranking.md: "All scores are displayed on a 0-100 scale"
 */
export function toDisplayScore(normalized: number): number {
  return Math.round(normalized * 100 * 100) / 100
}
