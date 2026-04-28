/**
 * Eligibility Service
 *
 * ตรวจสอบว่าเว็บไซต์ผ่านเกณฑ์ขั้นต่ำสำหรับการจัดอันดับหรือไม่
 * ตาม scoring-and-ranking.md §4-5
 *
 * เกณฑ์:
 * - responseRate >= 30% (0.30) ถึงจะมีสิทธิ์ถูกจัดอันดับ
 * - ต่ำกว่า → excluded_low_response
 */

import { db } from '../../../../db'
import { eq, and, isNotNull, isNull, count } from 'drizzle-orm'
import { responses, forms, evaluatorAssignments } from '../../../../db/schema'

// FR-RANK-08 — threshold ขั้นต่ำ 30%
const MINIMUM_RESPONSE_RATE = 0.30

export type RankingEligibility = 'eligible' | 'excluded_low_response' | 'excluded_no_score'

export interface EligibilityResult {
  websiteId: string
  responseRate: number
  countSubmitted: number
  countExpected: number
  eligibility: RankingEligibility
}

/**
 * §4 — คำนวณ response rate ของ form
 * responseRate = countSubmitted / countExpected
 *
 * countExpected = จำนวน evaluator ที่ถูก assign ให้ประเมิน website นี้ในรอบนี้
 * countSubmitted = จำนวน response ที่ submit แล้ว
 */
export async function calculateResponseRate(
  formId: string,
  roundId: string,
  websiteId: string
): Promise<{ rate: number; submitted: number; expected: number }> {
  // นับจำนวน evaluator ที่ถูก assign ให้ website + round นี้
  const [expectedResult] = await db
    .select({ total: count() })
    .from(evaluatorAssignments)
    .where(and(
      eq(evaluatorAssignments.roundId, roundId),
      eq(evaluatorAssignments.websiteId, websiteId),
    ))

  // นับจำนวน response ที่ submit แล้ว (ไม่ deleted)
  const [submittedResult] = await db
    .select({ total: count() })
    .from(responses)
    .where(and(
      eq(responses.formId, formId),
      isNotNull(responses.submittedAt),
      isNull(responses.deletedAt),
    ))

  const expected = expectedResult?.total ?? 0
  const submitted = submittedResult?.total ?? 0

  // ถ้าไม่มี expected (ยังไม่ assign ใครเลย) → rate = 0
  const rate = expected > 0 ? submitted / expected : 0

  return { rate, submitted, expected }
}

/**
 * §5 — ตรวจสิทธิ์เข้าจัดอันดับ
 * - responseRate >= 30% → eligible
 * - responseRate < 30% → excluded_low_response
 * - score = null → excluded_no_score
 */
export async function checkEligibility(
  websiteId: string,
  roundId: string,
  formId: string,
  score: number | null,
): Promise<EligibilityResult> {
  const { rate, submitted, expected } = await calculateResponseRate(formId, roundId, websiteId)

  let eligibility: RankingEligibility

  if (score === null) {
    // Edge case: form ไม่มี numeric criteria → ไม่มีคะแนน
    eligibility = 'excluded_no_score'
  } else if (rate < MINIMUM_RESPONSE_RATE) {
    eligibility = 'excluded_low_response'
  } else {
    eligibility = 'eligible'
  }

  return {
    websiteId,
    responseRate: Math.round(rate * 100 * 100) / 100, // แสดงเป็น % ทศนิยม 2 ตำแหน่ง
    countSubmitted: submitted,
    countExpected: expected,
    eligibility,
  }
}
