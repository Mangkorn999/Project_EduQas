/**
 * Golden Dataset Test — Ranking Service
 *
 * ทดสอบ pure function `compareForRanking` ผ่านผลลัพธ์ sorting
 * ตรวจสอบ edge cases ตาม Sprint Checklist MANGKORN-04:
 *   - all tied → tie-break by responseRate > websiteName A-Z
 *   - excluded_low_response → response rate < 30%
 *   - zero responses → score = null
 *   - single respondent → rank = 1
 *
 * SRS Reference: FR-RANK-08, FR-RANK-09, scoring-and-ranking.md §6
 */

import { describe, it, expect } from 'vitest'

// ─── Types (match ranking.service.ts RankedWebsite) ───────────────────────────

interface MockWebsite {
  websiteId: string
  websiteName: string
  ownerFacultyId: string
  score: number | null
  responseRate: number
  responseCount: number
}

// ─── Re-implement compareForRanking for unit testing ──────────────────────────
// เหตุผล: ฟังก์ชัน compareForRanking เป็น private ใน ranking.service.ts
// เราจึง re-implement ตรงนี้เพื่อทดสอบ logic ตรงๆ ว่าตรงกับ spec หรือไม่
// ถ้าต้องการให้ test ใช้ source จริง → ควร export ออกมา

function compareForRanking(
  a: { score: number | null; responseRate: number; websiteName: string },
  b: { score: number | null; responseRate: number; websiteName: string },
  direction: 'desc' | 'asc' = 'desc'
): number {
  // จัดการ null → ถ้า null ทั้งคู่ถือว่าเสมอกัน, ถ้าฝั่งใดฝั่งหนึ่ง null → อยู่ท้าย
  // เหตุผล: -Infinity - (-Infinity) = NaN ทำให้ sort ไม่ deterministic
  const scoreA = a.score
  const scoreB = b.score

  if (scoreA === null && scoreB === null) {
    // ทั้งคู่ null → tie, ข้ามไป tie-break ถัดไป
  } else if (scoreA === null) {
    return direction === 'desc' ? 1 : -1  // null อยู่ท้าย
  } else if (scoreB === null) {
    return direction === 'desc' ? -1 : 1  // null อยู่ท้าย
  } else {
    // เรียงตาม score หลัก
    const scoreDiff = direction === 'desc' ? scoreB - scoreA : scoreA - scoreB
    if (scoreDiff !== 0) return scoreDiff
  }

  // Tie-break 1: higher responseRate wins
  const rateDiff = b.responseRate - a.responseRate
  if (rateDiff !== 0) return rateDiff

  // Tie-break 2: website name ascending (A-Z)
  return a.websiteName.localeCompare(b.websiteName, 'th')
}

// ─── Helper: rank list ────────────────────────────────────────────────────────

function rankWebsites(websites: MockWebsite[]) {
  const sorted = [...websites].sort((a, b) => compareForRanking(a, b, 'desc'))
  return sorted.map((ws, idx) => ({ ...ws, rank: idx + 1 }))
}

// ─── §1 Deterministic Tie-Break (FR-RANK-09) ─────────────────────────────────

describe('Tie-break: FR-RANK-09', () => {
  it('คะแนนต่างกัน → เรียงตามคะแนนสูงไปต่ำ', () => {
    const ranked = rankWebsites([
      { websiteId: 'A', websiteName: 'Alpha', ownerFacultyId: 'f1', score: 70, responseRate: 0.5, responseCount: 10 },
      { websiteId: 'B', websiteName: 'Beta', ownerFacultyId: 'f1', score: 90, responseRate: 0.5, responseCount: 10 },
      { websiteId: 'C', websiteName: 'Charlie', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
    ])
    expect(ranked[0].websiteId).toBe('B')  // 90
    expect(ranked[1].websiteId).toBe('C')  // 80
    expect(ranked[2].websiteId).toBe('A')  // 70
  })

  it('คะแนนเท่ากัน → tie-break ด้วย responseRate สูงกว่า', () => {
    const ranked = rankWebsites([
      { websiteId: 'A', websiteName: 'Alpha', ownerFacultyId: 'f1', score: 85, responseRate: 0.4, responseCount: 10 },
      { websiteId: 'B', websiteName: 'Beta', ownerFacultyId: 'f1', score: 85, responseRate: 0.6, responseCount: 10 },
    ])
    expect(ranked[0].websiteId).toBe('B')  // responseRate 0.6 > 0.4
    expect(ranked[1].websiteId).toBe('A')
  })

  it('คะแนนเท่ากัน + responseRate เท่ากัน → tie-break ด้วย websiteName A-Z', () => {
    const ranked = rankWebsites([
      { websiteId: 'Z', websiteName: 'Zeta', ownerFacultyId: 'f1', score: 85, responseRate: 0.5, responseCount: 10 },
      { websiteId: 'A', websiteName: 'Alpha', ownerFacultyId: 'f1', score: 85, responseRate: 0.5, responseCount: 10 },
      { websiteId: 'M', websiteName: 'Mu', ownerFacultyId: 'f1', score: 85, responseRate: 0.5, responseCount: 10 },
    ])
    expect(ranked[0].websiteName).toBe('Alpha')  // A
    expect(ranked[1].websiteName).toBe('Mu')      // M
    expect(ranked[2].websiteName).toBe('Zeta')    // Z
  })

  it('Deterministic: ข้อมูลเดิม → ลำดับเดิมเสมอ (FR-RANK-09)', () => {
    const input: MockWebsite[] = [
      { websiteId: '3', websiteName: 'Charlie', ownerFacultyId: 'f1', score: 85, responseRate: 0.5, responseCount: 10 },
      { websiteId: '1', websiteName: 'Alpha', ownerFacultyId: 'f1', score: 85, responseRate: 0.5, responseCount: 10 },
      { websiteId: '2', websiteName: 'Beta', ownerFacultyId: 'f1', score: 85, responseRate: 0.5, responseCount: 10 },
    ]
    // รัน 10 ครั้ง → ต้องได้ผลเหมือนกันทุกครั้ง
    for (let i = 0; i < 10; i++) {
      const ranked = rankWebsites([...input])
      expect(ranked[0].websiteName).toBe('Alpha')
      expect(ranked[1].websiteName).toBe('Beta')
      expect(ranked[2].websiteName).toBe('Charlie')
    }
  })
})

// ─── §2 All Tied (Edge Case) ─────────────────────────────────────────────────

describe('Edge Case: all tied', () => {
  it('5 เว็บ คะแนนเท่ากันหมด, responseRate เท่ากัน → เรียงตามชื่อ A-Z', () => {
    const sites: MockWebsite[] = [
      { websiteId: '5', websiteName: 'Echo', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
      { websiteId: '1', websiteName: 'Alpha', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
      { websiteId: '4', websiteName: 'Delta', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
      { websiteId: '2', websiteName: 'Beta', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
      { websiteId: '3', websiteName: 'Charlie', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
    ]
    const ranked = rankWebsites(sites)
    expect(ranked.map(r => r.websiteName)).toEqual([
      'Alpha', 'Beta', 'Charlie', 'Delta', 'Echo',
    ])
  })
})

// ─── §3 Eligibility: excluded_low_response (FR-RANK-08) ──────────────────────
// เหตุผล: ใน production, checkEligibility ทำใน ranking.service.ts (เรียก DB)
// แต่ logic threshold 30% ทดสอบตรงนี้ได้

describe('Eligibility threshold: 30% response rate', () => {
  const MINIMUM_RESPONSE_RATE = 0.30

  function determineEligibility(
    responseRate: number,
    score: number | null
  ): 'eligible' | 'excluded_low_response' | 'excluded_no_score' {
    if (score === null) return 'excluded_no_score'
    if (responseRate < MINIMUM_RESPONSE_RATE) return 'excluded_low_response'
    return 'eligible'
  }

  it('responseRate=0.35, score=80 → eligible', () => {
    expect(determineEligibility(0.35, 80)).toBe('eligible')
  })

  it('responseRate=0.30, score=80 → eligible (boundary)', () => {
    expect(determineEligibility(0.30, 80)).toBe('eligible')
  })

  it('responseRate=0.29, score=80 → excluded_low_response', () => {
    expect(determineEligibility(0.29, 80)).toBe('excluded_low_response')
  })

  it('responseRate=0, score=80 → excluded_low_response', () => {
    expect(determineEligibility(0, 80)).toBe('excluded_low_response')
  })

  it('responseRate=0.50, score=null → excluded_no_score', () => {
    expect(determineEligibility(0.50, null)).toBe('excluded_no_score')
  })

  it('responseRate=0, score=null → excluded_no_score (score null มา priority สูงกว่า)', () => {
    expect(determineEligibility(0, null)).toBe('excluded_no_score')
  })
})

// ─── §4 Edge Case: zero responses ────────────────────────────────────────────

describe('Edge Case: zero responses', () => {
  it('เว็บที่ไม่มีคนตอบเลย → score = null, rank ต่ำสุด', () => {
    const ranked = rankWebsites([
      { websiteId: 'A', websiteName: 'Alpha', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
      { websiteId: 'B', websiteName: 'Beta', ownerFacultyId: 'f1', score: null, responseRate: 0, responseCount: 0 },
    ])
    // score = null ถูก treat เป็น -Infinity → อยู่ท้ายสุด
    expect(ranked[0].websiteId).toBe('A')
    expect(ranked[1].websiteId).toBe('B')
    expect(ranked[1].score).toBeNull()
  })

  it('ทุกเว็บ score = null → เรียงตาม responseRate > name', () => {
    const ranked = rankWebsites([
      { websiteId: 'B', websiteName: 'Beta', ownerFacultyId: 'f1', score: null, responseRate: 0, responseCount: 0 },
      { websiteId: 'A', websiteName: 'Alpha', ownerFacultyId: 'f1', score: null, responseRate: 0, responseCount: 0 },
    ])
    // score ทั้งคู่ null → tie-break by responseRate (เท่ากัน) → name A-Z
    expect(ranked[0].websiteName).toBe('Alpha')
    expect(ranked[1].websiteName).toBe('Beta')
  })
})

// ─── §5 Edge Case: single respondent ─────────────────────────────────────────

describe('Edge Case: single respondent', () => {
  it('เว็บเดียว → rank = 1', () => {
    const ranked = rankWebsites([
      { websiteId: 'A', websiteName: 'Only', ownerFacultyId: 'f1', score: 75, responseRate: 1, responseCount: 1 },
    ])
    expect(ranked).toHaveLength(1)
    expect(ranked[0].rank).toBe(1)
    expect(ranked[0].score).toBe(75)
  })
})

// ─── §6 Top 10 / Bottom 5 slice ──────────────────────────────────────────────

describe('Top 10 / Bottom 5 slicing', () => {
  const sites: MockWebsite[] = Array.from({ length: 15 }, (_, i) => ({
    websiteId: `w${i + 1}`,
    websiteName: `Web ${String(i + 1).padStart(2, '0')}`,
    ownerFacultyId: 'f1',
    score: 100 - i * 5, // 100, 95, 90, ..., 30
    responseRate: 0.5,
    responseCount: 10,
  }))

  it('Top 10: ตัดเฉพาะ 10 อันดับแรก', () => {
    const ranked = rankWebsites(sites)
    const top10 = ranked.slice(0, 10)
    expect(top10).toHaveLength(10)
    expect(top10[0].score).toBe(100)
    expect(top10[9].score).toBe(55)
  })

  it('Bottom 5: ตัดเฉพาะ 5 อันดับท้าย', () => {
    const ranked = rankWebsites(sites)
    const bottom5 = ranked.slice(-5).reverse()
    expect(bottom5).toHaveLength(5)
    expect(bottom5[0].score).toBe(30)  // ต่ำสุด
    expect(bottom5[4].score).toBe(50)
  })
})

// ─── §7 Thai name sorting ────────────────────────────────────────────────────

describe('Thai name tie-break', () => {
  it('ชื่อไทย → เรียงตาม localeCompare("th") ถูกต้อง', () => {
    const ranked = rankWebsites([
      { websiteId: '1', websiteName: 'เว็บไซต์ ค', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
      { websiteId: '2', websiteName: 'เว็บไซต์ ก', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
      { websiteId: '3', websiteName: 'เว็บไซต์ ข', ownerFacultyId: 'f1', score: 80, responseRate: 0.5, responseCount: 10 },
    ])
    expect(ranked[0].websiteName).toBe('เว็บไซต์ ก')
    expect(ranked[1].websiteName).toBe('เว็บไซต์ ข')
    expect(ranked[2].websiteName).toBe('เว็บไซต์ ค')
  })
})
