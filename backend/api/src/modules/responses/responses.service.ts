/**
 * Responses Service
 *
 * จัดการ response (คำตอบ) ของผู้ประเมินต่อ form
 * ตาม api-contracts.md §6 + SRS2.1 Evaluator Flow
 *
 * สิทธิ์:
 * - respondent: สร้าง/แก้ response ของตัวเอง (เฉพาะ form ที่ open)
 * - admin/super_admin: ดู responses ทั้งหมดใน scope ของตน
 */

import { db } from '../../../../db'
import { responses, responseAnswers, forms, evaluatorAssignments } from '../../../../db/schema'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'

export class ResponsesService {

  /**
   * ดึง responses ทั้งหมดของ form (สำหรับ admin)
   * ถ้าส่ง userId จะกรองเฉพาะของ user นั้น
   */
  async listByFormId(formId: string, userId?: string) {
    const filters = [
      eq(responses.formId, formId),
      isNull(responses.deletedAt),
    ]
    if (userId) {
      filters.push(eq(responses.respondentId, userId))
    }
    return db.select().from(responses).where(and(...filters))
  }

  /**
   * ดึง response เดียว
   */
  async getById(id: string) {
    const [response] = await db.select().from(responses).where(
      and(eq(responses.id, id), isNull(responses.deletedAt))
    )
    return response
  }

  /**
   * สร้าง response ใหม่ (หรือ upsert ถ้า respondent มีอยู่แล้ว)
   * ตาม api-contracts.md §6: POST /forms/:formId/responses
   *
   * ตรวจสอบ:
   * 1. form ต้อง open
   * 2. respondent ต้องมี assignment (ถ้า form มี assignment)
   */
  async createOrUpsert(
    formId: string,
    respondentId: string,
    data: {
      formOpenedAt?: string | null
      websiteOpenedAt?: string | null
      answers: { questionId: string; valueNumber?: number | null; valueText?: string | null; valueJson?: string | null }[]
    }
  ) {
    return db.transaction(async (tx) => {
      // ตรวจว่า form open อยู่
      const [form] = await tx.select().from(forms).where(
        and(eq(forms.id, formId), isNull(forms.deletedAt))
      )
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'open') throw new Error('form_not_open')

      // ตรวจว่ามี response เดิมอยู่ไหม (upsert)
      const [existing] = await tx.select().from(responses).where(
        and(
          eq(responses.formId, formId),
          eq(responses.respondentId, respondentId),
          isNull(responses.deletedAt),
        )
      )

      let responseId: string

      if (existing) {
        // อัปเดต response ที่มีอยู่
        if (existing.submittedAt) throw new Error('already_submitted')
        responseId = existing.id

        // ลบ answers เดิมแล้วใส่ใหม่
        await tx.delete(responseAnswers).where(eq(responseAnswers.responseId, responseId))
      } else {
        // หา assignment (ถ้ามี)
        let assignmentId: string | null = null
        if (form.websiteTargetId) {
          const [assignment] = await tx.select().from(evaluatorAssignments).where(
            and(
              eq(evaluatorAssignments.userId, respondentId),
              eq(evaluatorAssignments.roundId, form.roundId),
              eq(evaluatorAssignments.websiteId, form.websiteTargetId),
            )
          )
          assignmentId = assignment?.id ?? null
        }

        // สร้าง response ใหม่
        const [created] = await tx.insert(responses).values({
          formId,
          respondentId,
          assignmentId,
          websiteOpenedAt: data.websiteOpenedAt ? new Date(data.websiteOpenedAt) : null,
        }).returning()
        responseId = created.id
      }

      // ใส่ answers
      if (data.answers.length > 0) {
        await tx.insert(responseAnswers).values(
          data.answers.map((a) => ({
            responseId,
            questionId: a.questionId,
            valueNumber: a.valueNumber,
            valueText: a.valueText,
            valueJson: a.valueJson,
          }))
        )
      }

      // ดึง response ที่สร้าง/อัปเดตมา return
      const [result] = await tx.select().from(responses).where(eq(responses.id, responseId))
      return result
    })
  }

  /**
   * อัปเดต answers ของ response (เฉพาะ form ที่ยัง open)
   * FR-RESP-03: ห้ามแก้ถ้า form ปิดแล้ว
   */
  async updateAnswers(
    responseId: string,
    respondentId: string,
    answers: { questionId: string; valueNumber?: number | null; valueText?: string | null; valueJson?: string | null }[]
  ) {
    return db.transaction(async (tx) => {
      const [response] = await tx.select().from(responses).where(
        and(eq(responses.id, responseId), isNull(responses.deletedAt))
      )
      if (!response) throw new Error('response_not_found')
      if (response.respondentId !== respondentId) throw new Error('forbidden')
      if (response.submittedAt) throw new Error('already_submitted')

      // ตรวจว่า form ยัง open
      const [form] = await tx.select().from(forms).where(eq(forms.id, response.formId))
      if (!form || form.status !== 'open') throw new Error('form_not_open')

      // ลบ answers เดิมแล้วใส่ใหม่
      await tx.delete(responseAnswers).where(eq(responseAnswers.responseId, responseId))

      if (answers.length > 0) {
        await tx.insert(responseAnswers).values(
          answers.map((a) => ({
            responseId,
            questionId: a.questionId,
            valueNumber: a.valueNumber,
            valueText: a.valueText,
            valueJson: a.valueJson,
          }))
        )
      }

      // อัปเดต updatedAt
      const [updated] = await tx.update(responses)
        .set({ updatedAt: new Date() })
        .where(eq(responses.id, responseId))
        .returning()

      return updated
    })
  }

  /**
   * Submit response — ตั้ง submittedAt
   * FR-EVAL-06: ต้องมี websiteOpenedAt ก่อน submit (soft gate)
   */
  async submitResponse(responseId: string, respondentId: string) {
    return db.transaction(async (tx) => {
      const [response] = await tx.select().from(responses).where(
        and(eq(responses.id, responseId), isNull(responses.deletedAt))
      )
      if (!response) throw new Error('response_not_found')
      if (response.respondentId !== respondentId) throw new Error('forbidden')
      if (response.submittedAt) throw new Error('already_submitted')

      // ตรวจว่า form ยัง open
      const [form] = await tx.select().from(forms).where(eq(forms.id, response.formId))
      if (!form || form.status !== 'open') throw new Error('form_not_open')

      // FR-EVAL-06: Soft gate — ต้องเปิดเว็บก่อน
      if (!response.websiteOpenedAt) throw new Error('website_not_opened')

      const [submitted] = await tx.update(responses)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(responses.id, responseId))
        .returning()

      return submitted
    })
  }

  /**
   * FR-EVAL-03: บันทึก websiteOpenedAt
   */
  async logWebsiteOpen(formId: string, respondentId: string) {
    return db.transaction(async (tx) => {
      // หา response ของ user นี้ในf form นี้
      const [response] = await tx.select().from(responses).where(
        and(
          eq(responses.formId, formId),
          eq(responses.respondentId, respondentId),
          isNull(responses.deletedAt),
        )
      )

      if (response) {
        // อัปเดต websiteOpenedAt ถ้ายังไม่มี
        if (!response.websiteOpenedAt) {
          const [updated] = await tx.update(responses)
            .set({ websiteOpenedAt: new Date(), updatedAt: new Date() })
            .where(eq(responses.id, response.id))
            .returning()
          return updated
        }
        return response
      }

      // ยังไม่มี response → ตรวจว่า form open ก่อน แล้วสร้าง response พร้อม websiteOpenedAt
      const [form] = await tx.select().from(forms).where(
        and(eq(forms.id, formId), isNull(forms.deletedAt))
      )
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'open') throw new Error('form_not_open')

      // หา assignment
      let assignmentId: string | null = null
      if (form.websiteTargetId) {
        const [assignment] = await tx.select().from(evaluatorAssignments).where(
          and(
            eq(evaluatorAssignments.userId, respondentId),
            eq(evaluatorAssignments.roundId, form.roundId),
            eq(evaluatorAssignments.websiteId, form.websiteTargetId),
          )
        )
        assignmentId = assignment?.id ?? null
      }

      const [created] = await tx.insert(responses).values({
        formId,
        respondentId,
        assignmentId,
        websiteOpenedAt: new Date(),
      }).returning()

      return created
    })
  }
}
