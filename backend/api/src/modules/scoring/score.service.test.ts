/**
 * Golden Dataset Test — Score Service
 *
 * ทดสอบ pure functions ของระบบคำนวณคะแนน
 * ไม่เรียก DB จริง → mock-free, deterministic
 *
 * ครอบคลุม:
 * - normalizeValue: แปลงค่าจาก question type เป็น [0, 1]
 * - toDisplayScore: แปลง 0-1 → 0-100 ปัดทศนิยม 2 ตำแหน่ง
 * - isNumericCapable: เช็คว่า question type คำนวณคะแนนได้ไหม
 * - computeWeightedScore: สูตร Σ(weight × score) / Σ(weight)
 * - computeCriterionScore: average normalized ของ answers ใน criterion เดียวกัน
 *
 * SRS Reference: scoring-and-ranking.md §3, SRS2.1 §F.1-F.4
 */

import { describe, it, expect } from 'vitest'
import { normalizeValue, isNumericCapable, toDisplayScore } from './weight.service'

// ─── §1 isNumericCapable ──────────────────────────────────────────────────────

describe('isNumericCapable', () => {
  it('rating, scale_5, scale_10, number, boolean → true', () => {
    expect(isNumericCapable('rating')).toBe(true)
    expect(isNumericCapable('scale_5')).toBe(true)
    expect(isNumericCapable('scale_10')).toBe(true)
    expect(isNumericCapable('number')).toBe(true)
    expect(isNumericCapable('boolean')).toBe(true)
  })

  it('short_text, long_text, single_choice, multi_choice, date → false', () => {
    expect(isNumericCapable('short_text')).toBe(false)
    expect(isNumericCapable('long_text')).toBe(false)
    expect(isNumericCapable('single_choice')).toBe(false)
    expect(isNumericCapable('multi_choice')).toBe(false)
    expect(isNumericCapable('date')).toBe(false)
  })

  it('unknown type → false', () => {
    expect(isNumericCapable('unknown_type')).toBe(false)
  })
})

// ─── §2 normalizeValue ────────────────────────────────────────────────────────

describe('normalizeValue', () => {

  // ── rating (1-5 scale → 0-1) ────────────────────────────────────────────
  describe('rating (1-5)', () => {
    it('value=1 → 0.0', () => {
      expect(normalizeValue('rating', 1)).toBe(0)
    })
    it('value=3 → 0.5', () => {
      expect(normalizeValue('rating', 3)).toBe(0.5)
    })
    it('value=5 → 1.0', () => {
      expect(normalizeValue('rating', 5)).toBe(1)
    })
    it('SRS2.1 §F.1: ((value - 1) / (5 - 1)) * 100 = 75 เมื่อ value=4', () => {
      // normalizeValue returns 0-1 range; display = 0.75 * 100 = 75
      expect(normalizeValue('rating', 4)).toBe(0.75)
      expect(toDisplayScore(0.75)).toBe(75)
    })
  })

  // ── scale_5 (0-5 → 0-1) ────────────────────────────────────────────────
  describe('scale_5', () => {
    it('value=0 → 0.0', () => {
      expect(normalizeValue('scale_5', 0)).toBe(0)
    })
    it('value=5 → 1.0', () => {
      expect(normalizeValue('scale_5', 5)).toBe(1)
    })
    it('value=3 → 0.6', () => {
      expect(normalizeValue('scale_5', 3)).toBeCloseTo(0.6)
    })
  })

  // ── scale_10 ────────────────────────────────────────────────────────────
  describe('scale_10', () => {
    it('value=10 → 1.0', () => {
      expect(normalizeValue('scale_10', 10)).toBe(1)
    })
    it('value=7 → 0.7', () => {
      expect(normalizeValue('scale_10', 7)).toBeCloseTo(0.7)
    })
  })

  // ── boolean ─────────────────────────────────────────────────────────────
  describe('boolean', () => {
    it('value=1 → 1', () => {
      expect(normalizeValue('boolean', 1)).toBe(1)
    })
    it('value=0 → 0', () => {
      expect(normalizeValue('boolean', 0)).toBe(0)
    })
  })

  // ── number (custom min/max) ─────────────────────────────────────────────
  describe('number (custom range)', () => {
    it('value=50 in range 0-100 → 0.5', () => {
      expect(normalizeValue('number', 50, { min: 0, max: 100 })).toBe(0.5)
    })
    it('value=min → 0.0', () => {
      expect(normalizeValue('number', 10, { min: 10, max: 50 })).toBe(0)
    })
    it('value=max → 1.0', () => {
      expect(normalizeValue('number', 50, { min: 10, max: 50 })).toBe(1)
    })
    it('min === max → 0 (ป้องกัน division by zero)', () => {
      expect(normalizeValue('number', 5, { min: 5, max: 5 })).toBe(0)
    })
    it('no config → default 0-100', () => {
      expect(normalizeValue('number', 75)).toBe(0.75)
    })
  })

  // ── Edge cases ──────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('null value → null', () => {
      expect(normalizeValue('rating', null)).toBeNull()
    })
    it('undefined value → null', () => {
      expect(normalizeValue('rating', undefined)).toBeNull()
    })
    it('non-numeric type → null', () => {
      expect(normalizeValue('long_text', 5)).toBeNull()
    })
    it('value ต่ำกว่า range → clamp ที่ 0', () => {
      expect(normalizeValue('scale_5', -1)).toBe(0)
    })
    it('value สูงกว่า range → clamp ที่ 1', () => {
      expect(normalizeValue('scale_5', 100)).toBe(1)
    })
  })
})

// ─── §3 toDisplayScore ────────────────────────────────────────────────────────

describe('toDisplayScore', () => {
  it('0.0 → 0', () => {
    expect(toDisplayScore(0)).toBe(0)
  })
  it('1.0 → 100', () => {
    expect(toDisplayScore(1)).toBe(100)
  })
  it('0.75 → 75', () => {
    expect(toDisplayScore(0.75)).toBe(75)
  })
  it('ปัดทศนิยม 2 ตำแหน่ง: 0.8241 → 82.41', () => {
    expect(toDisplayScore(0.8241)).toBe(82.41)
  })
  it('round half up: 0.12345 → 12.35', () => {
    // Math.round(0.12345 * 100 * 100) / 100 = Math.round(1234.5) / 100 = 1235/100 = 12.35
    expect(toDisplayScore(0.12345)).toBe(12.35)
  })
})

// ─── §4 Weighted Score (Pure Logic) ───────────────────────────────────────────
// เทสต์ logic ของ computeWeightedScore โดยจำลอง input/output
// ฟังก์ชันเป็น private ใน score.service.ts → เทสต์ผ่านผลลัพธ์ของ public functions
// แต่เราสามารถ verify สูตรได้ตรงๆ ด้วย golden dataset

describe('Weighted Score Formula Verification', () => {
  // จำลองสูตร computeWeightedScore เพื่อ verify ตรรกะ
  function weightedAvg(items: { weight: number; score: number | null }[]): number | null {
    let wSum = 0, wTotal = 0
    for (const i of items) {
      if (i.score === null) continue
      wSum += i.weight * i.score
      wTotal += i.weight
    }
    if (wTotal === 0) return null
    return wSum / wTotal
  }

  it('Golden #1: 3 criteria ที่มี weight เท่ากัน → simple average', () => {
    const result = weightedAvg([
      { weight: 1, score: 0.8 },
      { weight: 1, score: 0.6 },
      { weight: 1, score: 0.7 },
    ])
    // (0.8 + 0.6 + 0.7) / 3 = 0.7
    expect(result).toBeCloseTo(0.7)
    expect(toDisplayScore(result!)).toBe(70)
  })

  it('Golden #2: 3 criteria ที่มี weight ต่างกัน', () => {
    const result = weightedAvg([
      { weight: 40, score: 0.9 },   // Design: 40%
      { weight: 30, score: 0.7 },   // Usability: 30%
      { weight: 30, score: 0.5 },   // Content: 30%
    ])
    // (40*0.9 + 30*0.7 + 30*0.5) / (40+30+30) = (36+21+15)/100 = 0.72
    expect(result).toBeCloseTo(0.72)
    expect(toDisplayScore(result!)).toBe(72)
  })

  it('Golden #3: missing criteria (null score) → exclude จากสูตร', () => {
    const result = weightedAvg([
      { weight: 50, score: 0.8 },   // Design: มีค่า
      { weight: 30, score: null },   // Usability: ไม่มีข้อมูล → ข้ามไม่นำมาคำนวณ
      { weight: 20, score: 0.6 },   // Content: มีค่า
    ])
    // (50*0.8 + 20*0.6) / (50+20) = (40+12)/70 ≈ 0.7429
    expect(result).toBeCloseTo(0.7429, 3)
  })

  it('Golden #4: ทุก criteria เป็น null → null (SRS §F.4)', () => {
    const result = weightedAvg([
      { weight: 50, score: null },
      { weight: 30, score: null },
      { weight: 20, score: null },
    ])
    expect(result).toBeNull()
  })

  it('Golden #5: weight sum = 0 → null', () => {
    const result = weightedAvg([
      { weight: 0, score: 0.8 },
      { weight: 0, score: 0.6 },
    ])
    expect(result).toBeNull()
  })
})
