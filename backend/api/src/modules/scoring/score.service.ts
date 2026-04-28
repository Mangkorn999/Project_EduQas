/**
 * Score Service — Scoring Engine หลักของระบบ
 *
 * คำนวณคะแนนตามสูตรใน scoring-and-ranking.md §3
 * ตั้งแต่ระดับ criterion per response จนถึง website score
 *
 * สูตรหลัก:
 * 1) scoreCriterionResponse = average(normalize(answer_i)) สำหรับ questions ที่ผูก criterion นั้น
 * 2) scoreFormResponse = Σ(weight_c × scoreCriterionResponse_c) / Σ(weight_c)
 * 3) scoreForm (per website) = average(scoreFormResponse) ของทุก submitted response
 * 4) scoreWebsite = scoreForm ของ form ล่าสุดที่ closed ใน round ที่เลือก
 */

import { db } from '../../../../db'
import { eq, and, isNotNull, isNull, inArray } from 'drizzle-orm'
import {
  forms, evaluationCriteria, formQuestions,
  responses, responseAnswers, websites,
} from '../../../../db/schema'
import { normalizeValue, isNumericCapable, toDisplayScore } from './weight.service'

// ─── Types ────────────────────────────────────────────────────────────────────

/** คะแนนรายเกณฑ์ของ 1 response */
export interface CriterionScore {
  criterionId: string
  criterionName: string
  dimension: string | null
  weight: number
  /** 0-1 range */
  normalizedScore: number | null
  /** 0-100 range */
  displayScore: number | null
}

/** คะแนนรวมของ 1 response */
export interface FormResponseScore {
  responseId: string
  respondentId: string
  criterionScores: CriterionScore[]
  /** 0-1 range (weighted average) */
  normalizedTotal: number | null
  /** 0-100 range */
  displayTotal: number | null
}

/** คะแนนรวมของ 1 form (average ข้าม response) */
export interface FormScore {
  formId: string
  responseCount: number
  /** 0-100 range */
  score: number | null
  /** คะแนนแยกรายมิติ */
  dimensionScores: { dimension: string; score: number }[]
}

/** คะแนนรวมของ 1 website */
export interface WebsiteScore {
  websiteId: string
  websiteName: string
  ownerFacultyId: string
  /** 0-100 range */
  score: number | null
  responseCount: number
  dimensionScores: { dimension: string; score: number }[]
}

// ─── Core Calculation Functions ───────────────────────────────────────────────

/**
 * §3.1 — คำนวณ criterion score ของ 1 response
 * รวบรวม answers ทุกข้อที่ผูกกับ criterion เดียวกัน แล้วหาค่าเฉลี่ย normalized
 */
function computeCriterionScore(
  answers: { valueNumber: number | null; questionType: string; config: unknown }[]
): number | null {
  const normalizedValues: number[] = []

  for (const ans of answers) {
    if (ans.valueNumber === null) continue
    if (!isNumericCapable(ans.questionType)) continue

    const parsed = ans.config as { min?: number; max?: number } | null
    const norm = normalizeValue(ans.questionType, ans.valueNumber, parsed ?? undefined)
    if (norm !== null) {
      normalizedValues.push(norm)
    }
  }

  if (normalizedValues.length === 0) return null
  return normalizedValues.reduce((sum, v) => sum + v, 0) / normalizedValues.length
}

/**
 * §3.2 — คำนวณ weighted average ข้ามทุก criteria ของ 1 response
 */
function computeWeightedScore(
  criterionScores: { weight: number; normalizedScore: number | null }[]
): number | null {
  let weightedSum = 0
  let weightSum = 0

  for (const cs of criterionScores) {
    if (cs.normalizedScore === null) continue
    weightedSum += cs.weight * cs.normalizedScore
    weightSum += cs.weight
  }

  // Edge case: weight sum = 0 → score = null (scoring-and-ranking.md §10)
  if (weightSum === 0) return null
  return weightedSum / weightSum
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * คำนวณคะแนนรายข้อของ 1 response
 * ใช้แสดง Scorecard breakdown
 */
export async function scoreOneResponse(responseId: string): Promise<FormResponseScore | null> {
  // ดึง response พร้อมตรวจว่า submit แล้ว
  const [resp] = await db
    .select({ id: responses.id, formId: responses.formId, respondentId: responses.respondentId })
    .from(responses)
    .where(and(eq(responses.id, responseId), isNotNull(responses.submittedAt), isNull(responses.deletedAt)))

  if (!resp) return null

  // ดึง criteria ของ form นี้
  const criteria = await db
    .select()
    .from(evaluationCriteria)
    .where(eq(evaluationCriteria.formId, resp.formId))

  // ดึง questions + answers ทั้งหมดของ response นี้
  const answersRaw = await db
    .select({
      questionId: formQuestions.id,
      questionType: formQuestions.questionType,
      criterionId: formQuestions.criterionId,
      config: formQuestions.config,
      valueNumber: responseAnswers.valueNumber,
    })
    .from(responseAnswers)
    .innerJoin(formQuestions, eq(responseAnswers.questionId, formQuestions.id))
    .where(eq(responseAnswers.responseId, responseId))

  // จัดกลุ่ม answers ตาม criterion
  const answersByCriterion = new Map<string, typeof answersRaw>()
  for (const ans of answersRaw) {
    if (!ans.criterionId) continue
    const existing = answersByCriterion.get(ans.criterionId) ?? []
    existing.push(ans)
    answersByCriterion.set(ans.criterionId, existing)
  }

  // คำนวณ criterion score ของแต่ละ criterion
  const criterionScores: CriterionScore[] = criteria.map((c) => {
    const answers = answersByCriterion.get(c.id) ?? []
    const normalized = computeCriterionScore(answers)
    return {
      criterionId: c.id,
      criterionName: c.name,
      dimension: c.dimension,
      weight: c.weight,
      normalizedScore: normalized,
      displayScore: normalized !== null ? toDisplayScore(normalized) : null,
    }
  })

  // §3.2 — weighted average
  const normalizedTotal = computeWeightedScore(criterionScores)

  return {
    responseId: resp.id,
    respondentId: resp.respondentId,
    criterionScores,
    normalizedTotal,
    displayTotal: normalizedTotal !== null ? toDisplayScore(normalizedTotal) : null,
  }
}

/**
 * §3.3 — คำนวณคะแนนรวมของ 1 form (average ของทุก submitted response)
 */
export async function scoreForm(formId: string): Promise<FormScore> {
  // ดึง submitted responses ทั้งหมดของ form นี้
  const submittedResponses = await db
    .select({ id: responses.id })
    .from(responses)
    .where(and(
      eq(responses.formId, formId),
      isNotNull(responses.submittedAt),
      isNull(responses.deletedAt)
    ))

  if (submittedResponses.length === 0) {
    return { formId, responseCount: 0, score: null, dimensionScores: [] }
  }

  // คำนวณคะแนนทีละ response
  const responseScores: FormResponseScore[] = []
  for (const r of submittedResponses) {
    const scored = await scoreOneResponse(r.id)
    if (scored) responseScores.push(scored)
  }

  // §3.3 — เฉลี่ย form-response scores
  const validTotals = responseScores
    .map(rs => rs.normalizedTotal)
    .filter((t): t is number => t !== null)

  const avgNormalized = validTotals.length > 0
    ? validTotals.reduce((s, v) => s + v, 0) / validTotals.length
    : null

  // §3.5 — Dimension scores (เฉลี่ย criterion score ที่มี dimension เดียวกัน ข้าม responses)
  const dimensionMap = new Map<string, number[]>()
  for (const rs of responseScores) {
    for (const cs of rs.criterionScores) {
      if (!cs.dimension || cs.normalizedScore === null) continue
      const arr = dimensionMap.get(cs.dimension) ?? []
      arr.push(cs.normalizedScore)
      dimensionMap.set(cs.dimension, arr)
    }
  }
  const dimensionScores = Array.from(dimensionMap.entries()).map(([dimension, values]) => ({
    dimension,
    score: toDisplayScore(values.reduce((s, v) => s + v, 0) / values.length),
  }))

  return {
    formId,
    responseCount: submittedResponses.length,
    score: avgNormalized !== null ? toDisplayScore(avgNormalized) : null,
    dimensionScores,
  }
}

/**
 * §3.4 — คำนวณ website score สำหรับ round ที่ระบุ
 * ดึง form ล่าสุดที่ closed ของ website ใน round นั้น
 */
export async function scoreWebsite(websiteId: string, roundId: string): Promise<WebsiteScore | null> {
  // หา forms ที่ผูกกับ website + round นี้ (เอา closed ล่าสุด)
  const [latestForm] = await db
    .select({ id: forms.id })
    .from(forms)
    .where(and(
      eq(forms.websiteTargetId, websiteId),
      eq(forms.roundId, roundId),
      isNull(forms.deletedAt),
    ))
    .orderBy(forms.updatedAt)
    .limit(1)

  if (!latestForm) return null

  // ดึงข้อมูลเว็บไซต์
  const [website] = await db
    .select({ id: websites.id, name: websites.name, ownerFacultyId: websites.ownerFacultyId })
    .from(websites)
    .where(eq(websites.id, websiteId))

  if (!website) return null

  const formScore = await scoreForm(latestForm.id)

  return {
    websiteId: website.id,
    websiteName: website.name,
    ownerFacultyId: website.ownerFacultyId,
    score: formScore.score,
    responseCount: formScore.responseCount,
    dimensionScores: formScore.dimensionScores,
  }
}

/**
 * คำนวณ website scores ทั้งหมดใน round
 * ใช้สำหรับ Dashboard Overview และ Ranking endpoints
 */
export async function scoreAllWebsitesInRound(roundId: string): Promise<WebsiteScore[]> {
  // ดึง forms ทั้งหมดใน round ที่มี websiteTargetId
  const roundForms = await db
    .select({
      formId: forms.id,
      websiteId: forms.websiteTargetId,
    })
    .from(forms)
    .where(and(
      eq(forms.roundId, roundId),
      isNotNull(forms.websiteTargetId),
      isNull(forms.deletedAt),
    ))

  // หา unique website IDs
  const uniqueWebsiteIds = [...new Set(roundForms.map(f => f.websiteId).filter((id): id is string => id !== null))]

  const results: WebsiteScore[] = []
  for (const wsId of uniqueWebsiteIds) {
    const ws = await scoreWebsite(wsId, roundId)
    if (ws) results.push(ws)
  }

  return results
}
