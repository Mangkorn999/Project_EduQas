import { db } from '../../../../db'
import { forms, responses, responseAnswers, users } from '../../../../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { getPaginationOffset, paginatedResponse } from '../../utils/pagination'

type AnswerInput = {
  questionId: string
  valueNumber?: number
  valueText?: string
  valueJson?: string
}

export class ResponsesService {
  async logWebsiteOpen(formId: string, userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: responses.id })
        .from(responses)
        .where(
          and(
            eq(responses.formId, formId),
            eq(responses.respondentId, userId),
            isNull(responses.deletedAt)
          )
        )

      if (!existing) {
        await tx.insert(responses).values({
          formId,
          respondentId: userId,
          websiteOpenedAt: new Date(),
        })
      } else {
        await tx
          .update(responses)
          .set({ websiteOpenedAt: new Date(), updatedAt: new Date() })
          .where(eq(responses.id, existing.id))
      }
    })
  }

  async getResponses(formId: string, page: number, limit: number) {
    const offset = getPaginationOffset(page, limit)

    const rows = await db
      .select({
        id: responses.id,
        formId: responses.formId,
        respondentId: responses.respondentId,
        respondentEmail: users.email,
        respondentDisplayName: users.displayName,
        respondentRole: users.role,
        formOpenedAt: responses.formOpenedAt,
        websiteOpenedAt: responses.websiteOpenedAt,
        submittedAt: responses.submittedAt,
        createdAt: responses.createdAt,
        updatedAt: responses.updatedAt,
      })
      .from(responses)
      .innerJoin(users, eq(responses.respondentId, users.id))
      .where(and(eq(responses.formId, formId), isNull(responses.deletedAt)))
      .limit(limit)
      .offset(offset)

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(responses)
      .where(and(eq(responses.formId, formId), isNull(responses.deletedAt)))

    return paginatedResponse(rows, count, page, limit)
  }

  async upsertResponse(formId: string, userId: string, answers: AnswerInput[]): Promise<{ id: string }> {
    return db.transaction(async (tx) => {
      const [form] = await tx
        .select({ id: forms.id, status: forms.status })
        .from(forms)
        .where(and(eq(forms.id, formId), isNull(forms.deletedAt)))

      if (!form) {
        const err: any = new Error('Form not found')
        err.statusCode = 404
        err.code = 'not_found'
        throw err
      }

      if (form.status !== 'open') {
        const err: any = new Error('Form is not open for submission')
        err.statusCode = 409
        err.code = 'form_not_open'
        throw err
      }

      const [existing] = await tx
        .select({ id: responses.id, websiteOpenedAt: responses.websiteOpenedAt })
        .from(responses)
        .where(
          and(
            eq(responses.formId, formId),
            eq(responses.respondentId, userId),
            isNull(responses.deletedAt)
          )
        )

      let responseId: string

      if (existing) {
        if (!existing.websiteOpenedAt) {
          const err: any = new Error('Website must be opened before submitting')
          err.statusCode = 422
          err.code = 'website_not_opened'
          throw err
        }

        await tx
          .update(responses)
          .set({ submittedAt: new Date(), updatedAt: new Date() })
          .where(eq(responses.id, existing.id))

        responseId = existing.id
      } else {
        const err: any = new Error('Website must be opened before submitting')
        err.statusCode = 422
        err.code = 'website_not_opened'
        throw err
      }

      await tx
        .delete(responseAnswers)
        .where(eq(responseAnswers.responseId, responseId))

      if (answers.length > 0) {
        await tx.insert(responseAnswers).values(
          answers.map((a) => ({
            responseId,
            questionId: a.questionId,
            valueNumber: a.valueNumber ?? null,
            valueText: a.valueText ?? null,
            valueJson: a.valueJson ?? null,
          }))
        )
      }

      return { id: responseId }
    })
  }

  async getResponse(responseId: string, userId: string, userRole: string) {
    const [response] = await db
      .select({
        id: responses.id,
        formId: responses.formId,
        respondentId: responses.respondentId,
        respondentEmail: users.email,
        respondentDisplayName: users.displayName,
        formOpenedAt: responses.formOpenedAt,
        websiteOpenedAt: responses.websiteOpenedAt,
        submittedAt: responses.submittedAt,
        createdAt: responses.createdAt,
        updatedAt: responses.updatedAt,
      })
      .from(responses)
      .innerJoin(users, eq(responses.respondentId, users.id))
      .where(and(eq(responses.id, responseId), isNull(responses.deletedAt)))

    if (!response) {
      const err: any = new Error('Response not found')
      err.statusCode = 404
      err.code = 'not_found'
      throw err
    }

    const isAdminOrAbove = ['super_admin', 'admin', 'executive'].includes(userRole)
    if (!isAdminOrAbove && response.respondentId !== userId) {
      const err: any = new Error('You do not have permission to view this response')
      err.statusCode = 403
      err.code = 'forbidden'
      throw err
    }

    const answers = await db
      .select()
      .from(responseAnswers)
      .where(eq(responseAnswers.responseId, responseId))

    return { ...response, answers }
  }

  async updateResponse(responseId: string, userId: string, answers: AnswerInput[]) {
    return db.transaction(async (tx) => {
      const [response] = await tx
        .select({ id: responses.id, formId: responses.formId, respondentId: responses.respondentId })
        .from(responses)
        .where(and(eq(responses.id, responseId), isNull(responses.deletedAt)))

      if (!response) {
        const err: any = new Error('Response not found')
        err.statusCode = 404
        err.code = 'not_found'
        throw err
      }

      if (response.respondentId !== userId) {
        const err: any = new Error('You do not have permission to update this response')
        err.statusCode = 403
        err.code = 'forbidden'
        throw err
      }

      const [form] = await tx
        .select({ status: forms.status })
        .from(forms)
        .where(and(eq(forms.id, response.formId), isNull(forms.deletedAt)))

      if (!form || form.status !== 'open') {
        const err: any = new Error('Form is not open for submission')
        err.statusCode = 409
        err.code = 'form_not_open'
        throw err
      }

      await tx
        .delete(responseAnswers)
        .where(eq(responseAnswers.responseId, responseId))

      if (answers.length > 0) {
        await tx.insert(responseAnswers).values(
          answers.map((a) => ({
            responseId,
            questionId: a.questionId,
            valueNumber: a.valueNumber ?? null,
            valueText: a.valueText ?? null,
            valueJson: a.valueJson ?? null,
          }))
        )
      }

      await tx
        .update(responses)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(responses.id, responseId))

      return { id: responseId }
    })
  }
}
