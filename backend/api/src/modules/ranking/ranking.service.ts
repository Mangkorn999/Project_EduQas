/**
 * Ranking Service
 *
 * จัดอันดับเว็บไซต์ตามคะแนนในแต่ละรอบประเมิน
 * ตาม scoring-and-ranking.md §6
 *
 * Tie-break order (FR-RANK-09):
 * 1. Higher responseRate
 * 2. More recent submittedAt (latest wins)
 * 3. website_name ascending (A-Z)
 */

import { WebsiteScore, scoreAllWebsitesInRound, scoreWebsite } from '../scoring/score.service'
import { checkEligibility, EligibilityResult } from './eligibility.service'
import { db } from '../../../../db'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import { forms, responses } from '../../../../db/schema'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RankedWebsite {
  rank: number
  websiteId: string
  websiteName: string
  ownerFacultyId: string
  score: number | null
  responseRate: number
  responseCount: number
  rankingEligibility: string
  dimensionScores: { dimension: string; score: number }[]
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Deterministic tie-break comparator ตาม scoring-and-ranking.md §6
 * ใช้ raw score (ไม่ปัดเศษ) เพื่อไม่ให้เกิด ordering drift
 */
function compareForRanking(
  a: { score: number | null; responseRate: number; websiteName: string },
  b: { score: number | null; responseRate: number; websiteName: string },
  direction: 'desc' | 'asc' = 'desc'
): number {
<<<<<<< HEAD
  const scoreA = a.score ?? -Infinity
  const scoreB = b.score ?? -Infinity

  // เรียงตาม score หลัก
  const scoreDiff = direction === 'desc' ? scoreB - scoreA : scoreA - scoreB
  if (scoreDiff !== 0) return scoreDiff
=======
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
>>>>>>> feature/ux-login-role-test

  // Tie-break 1: higher responseRate wins
  const rateDiff = b.responseRate - a.responseRate
  if (rateDiff !== 0) return rateDiff

  // Tie-break 2: ปกติจะใช้ submittedAt แต่ตรงนี้เราใช้ข้อมูลสรุปแล้ว → ข้าม
  // Tie-break 3: website name ascending (A-Z)
  return a.websiteName.localeCompare(b.websiteName, 'th')
}

/**
 * รวม WebsiteScore + EligibilityResult แล้วเรียงอันดับ
 */
async function buildRankedList(
  roundId: string,
  websiteScores: WebsiteScore[],
  onlyEligible: boolean = true,
): Promise<RankedWebsite[]> {
  // ตรวจสิทธิ์ของแต่ละเว็บ
  const rankedItems: (WebsiteScore & { responseRate: number; eligibility: string })[] = []

  for (const ws of websiteScores) {
    // หา form ที่ผูก website + round เพื่อคำนวณ eligibility
    const [form] = await db
      .select({ id: forms.id })
      .from(forms)
      .where(and(
        eq(forms.websiteTargetId, ws.websiteId),
        eq(forms.roundId, roundId),
        isNull(forms.deletedAt),
      ))
      .limit(1)

    if (!form) continue

    const eligibility = await checkEligibility(ws.websiteId, roundId, form.id, ws.score)

    // ถ้าต้องการเฉพาะ eligible → กรองออก
    if (onlyEligible && eligibility.eligibility !== 'eligible') continue

    rankedItems.push({
      ...ws,
      responseRate: eligibility.responseRate,
      eligibility: eligibility.eligibility,
    })
  }

  // เรียงลำดับ (DESC by score)
  rankedItems.sort((a, b) => compareForRanking(a, b, 'desc'))

  // ใส่ rank number
  return rankedItems.map((item, idx) => ({
    rank: idx + 1,
    websiteId: item.websiteId,
    websiteName: item.websiteName,
    ownerFacultyId: item.ownerFacultyId,
    score: item.score,
    responseRate: item.responseRate,
    responseCount: item.responseCount,
    rankingEligibility: item.eligibility,
    dimensionScores: item.dimensionScores,
  }))
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * FR-RANK-01 — Top 10 เว็บไซต์คะแนนสูงสุด
 */
export async function getTopRanking(
  roundId: string,
  filters?: { facultyId?: string; category?: string }
): Promise<RankedWebsite[]> {
  let scores = await scoreAllWebsitesInRound(roundId)

  // กรองตาม faculty / category ถ้ามี
  if (filters?.facultyId) {
    scores = scores.filter(s => s.ownerFacultyId === filters.facultyId)
  }

  const ranked = await buildRankedList(roundId, scores, true)
  return ranked.slice(0, 10)
}

/**
 * FR-RANK-02 — Bottom 5 เว็บไซต์คะแนนต่ำสุด
 */
export async function getBottomRanking(
  roundId: string,
  filters?: { facultyId?: string }
): Promise<RankedWebsite[]> {
  let scores = await scoreAllWebsitesInRound(roundId)

  if (filters?.facultyId) {
    scores = scores.filter(s => s.ownerFacultyId === filters.facultyId)
  }

  const ranked = await buildRankedList(roundId, scores, true)
  // กลับลำดับเอาต่ำสุดมาก่อน
  ranked.reverse()
  // renumber rank ให้ถูก (1 = ต่ำสุด)
  return ranked.slice(0, 5).map((item, idx) => ({ ...item, rank: idx + 1 }))
}

/**
 * FR-RANK-03 — Most Improved (ต้องเทียบ 2 rounds)
 * เปรียบเทียบ scoreWebsite(current_round) - scoreWebsite(previous_round)
 * เอาเฉพาะ delta > 0 เรียงจากมากไปน้อย
 */
export async function getMostImproved(
  currentRoundId: string,
  previousRoundId: string,
  filters?: { facultyId?: string }
): Promise<(RankedWebsite & { previousScore: number | null; delta: number })[]> {
  const currentScores = await scoreAllWebsitesInRound(currentRoundId)
  const previousScores = await scoreAllWebsitesInRound(previousRoundId)

  // สร้าง Map ของ previous scores เพื่อ lookup เร็ว
  const prevMap = new Map(previousScores.map(s => [s.websiteId, s]))

  const improved: (WebsiteScore & { previousScore: number | null; delta: number })[] = []

  for (const current of currentScores) {
    if (filters?.facultyId && current.ownerFacultyId !== filters.facultyId) continue

    const prev = prevMap.get(current.websiteId)
    if (!prev || prev.score === null || current.score === null) continue

    const delta = current.score - prev.score
    if (delta > 0) {
      improved.push({ ...current, previousScore: prev.score, delta })
    }
  }

  // เรียงตาม delta มากสุด
  improved.sort((a, b) => b.delta - a.delta)

  return improved.map((item, idx) => ({
    rank: idx + 1,
    websiteId: item.websiteId,
    websiteName: item.websiteName,
    ownerFacultyId: item.ownerFacultyId,
    score: item.score,
    previousScore: item.previousScore,
    delta: Math.round(item.delta * 100) / 100,
    responseRate: 0, // จะเติมตอน build full ranked list
    responseCount: item.responseCount,
    rankingEligibility: 'eligible',
    dimensionScores: item.dimensionScores,
  }))
}

/**
 * FR-RANK-04 — Faculty × Dimension Heatmap
 * Grid: rows = faculties, columns = dimensions
 * Cell = average dimension score ของ websites ในแต่ละคณะ
 */
export async function getHeatmap(
  roundId: string
): Promise<{ facultyId: string; dimensions: { dimension: string; score: number }[] }[]> {
  const allScores = await scoreAllWebsitesInRound(roundId)

  // จัดกลุ่มตาม faculty
  const byFaculty = new Map<string, WebsiteScore[]>()
  for (const ws of allScores) {
    const arr = byFaculty.get(ws.ownerFacultyId) ?? []
    arr.push(ws)
    byFaculty.set(ws.ownerFacultyId, arr)
  }

  const result: { facultyId: string; dimensions: { dimension: string; score: number }[] }[] = []

  for (const [facultyId, websites] of byFaculty.entries()) {
    // รวม dimension scores ข้ามเว็บไซต์ของคณะเดียวกัน
    const dimMap = new Map<string, number[]>()
    for (const ws of websites) {
      for (const ds of ws.dimensionScores) {
        const arr = dimMap.get(ds.dimension) ?? []
        arr.push(ds.score)
        dimMap.set(ds.dimension, arr)
      }
    }

    const dimensions = Array.from(dimMap.entries()).map(([dimension, values]) => ({
      dimension,
      score: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100,
    }))

    result.push({ facultyId, dimensions })
  }

  return result
}
