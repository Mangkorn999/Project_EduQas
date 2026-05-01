import { db } from '../../../../db'
import { forms, responses, responseAnswers, users, evaluatorAssignments, formTargetRoles } from '../../../../db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { getPaginationOffset, paginatedResponse } from '../../utils/pagination'
import { canAccessFaculty } from '../../lib/permissions'

type AnswerInput = {
  questionId: string
  valueNumber?: number
  valueText?: string
  valueJson?: string
}

type Viewer = {
  userId: string
  role: string
  facultyId: string | null
}

function serviceError(message: string, statusCode: number, code: string) {
  const err: any = new Error(message)
  err.statusCode = statusCode
  err.code = code
  return err
}

export class ResponsesService {
  private async assertCanEvaluate(tx: any, formId: string, viewer: Viewer): Promise<void> {
    const [form] = await tx
      .select({
        id: forms.id,
        status: forms.status,
        scope: forms.scope,
        roundId: forms.roundId,
        websiteTargetId: forms.websiteTargetId,
        ownerFacultyId: forms.ownerFacultyId,
      })
      .from(forms)
      .where(and(eq(forms.id, formId), isNull(forms.deletedAt)))

    if (!form) throw serviceError('Form not found', 404, 'not_found')
    if (form.status !== 'open') throw serviceError('Form is not open for submission', 422, 'form_not_open')
    if (form.scope === 'faculty' && form.ownerFacultyId && viewer.facultyId !== form.ownerFacultyId) {
      throw serviceError('You are outside this form faculty scope', 403, 'forbidden')
    }

    const targetRoles = await tx
      .select({ role: formTargetRoles.role })
      .from(formTargetRoles)
      .where(eq(formTargetRoles.formId, formId)) as Array<{ role: string }>

    if (targetRoles.length > 0 && !targetRoles.some((target) => target.role === viewer.role)) {
      throw serviceError('Your role is not targeted by this form', 403, 'forbidden')
    }

    if (form.roundId && form.websiteTargetId) {
      const assignments = await tx
        .select({ userId: evaluatorAssignments.userId })
        .from(evaluatorAssignments)
        .where(
          and(
            eq(evaluatorAssignments.roundId, form.roundId),
            eq(evaluatorAssignments.websiteId, form.websiteTargetId),
          ),
        ) as Array<{ userId: string }>

      if (assignments.length > 0 && !assignments.some((assignment) => assignment.userId === viewer.userId)) {
        throw serviceError('You are not assigned to evaluate this website', 403, 'forbidden')
      }
    }
  }

  private async assertCanReadFormResponses(formId: string, viewer: Viewer): Promise<void> {
    const [form] = await db
      .select({ ownerFacultyId: forms.ownerFacultyId })
      .from(forms)
      .where(and(eq(forms.id, formId), isNull(forms.deletedAt)))

    if (!form) throw serviceError('Form not found', 404, 'not_found')
    if (!canAccessFaculty(viewer.role, viewer.facultyId, form.ownerFacultyId)) {
      throw serviceError('You do not have permission to view responses for this form', 403, 'forbidden')
    }
  }

  async logWebsiteOpen(formId: string, viewer: Viewer): Promise<void> {
    await db.transaction(async (tx) => {
      await this.assertCanEvaluate(tx, formId, viewer)

      const [existing] = await tx
        .select({ id: responses.id })
        .from(responses)
        .where(
          and(
            eq(responses.formId, formId),
            eq(responses.respondentId, viewer.userId),
            isNull(responses.deletedAt),
          ),
        )

      if (!existing) {
        await tx.insert(responses).values({
          formId,
          respondentId: viewer.userId,
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

  async getResponses(formId: string, page: number, limit: number, viewer: Viewer) {
    await this.assertCanReadFormResponses(formId, viewer)

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

  async upsertResponse(formId: string, viewer: Viewer, answers: AnswerInput[]): Promise<{ id: string }> {
    return db.transaction(async (tx) => {
      await this.assertCanEvaluate(tx, formId, viewer)

      const [existing] = await tx
        .select({ id: responses.id, websiteOpenedAt: responses.websiteOpenedAt })
        .from(responses)
        .where(
          and(
            eq(responses.formId, formId),
            eq(responses.respondentId, viewer.userId),
            isNull(responses.deletedAt),
          ),
        )

      if (!existing) {
        throw serviceError('Website must be opened before submitting', 422, 'website_not_opened')
      }
      if (!existing.websiteOpenedAt) {
        throw serviceError('Website must be opened before submitting', 422, 'website_not_opened')
      }

      await tx
        .update(responses)
        .set({ submittedAt: new Date(), updatedAt: new Date() })
        .where(eq(responses.id, existing.id))

      await tx
        .delete(responseAnswers)
        .where(eq(responseAnswers.responseId, existing.id))

      if (answers.length > 0) {
        await tx.insert(responseAnswers).values(
          answers.map((a) => ({
            responseId: existing.id,
            questionId: a.questionId,
            valueNumber: a.valueNumber ?? null,
            valueText: a.valueText ?? null,
            valueJson: a.valueJson ?? null,
          })),
        )
      }

      return { id: existing.id }
    })
  }

  async getResponse(responseId: string, viewer: Viewer) {
    const [response] = await db
      .select({
        id: responses.id,
        formId: responses.formId,
        ownerFacultyId: forms.ownerFacultyId,
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
      .innerJoin(forms, eq(responses.formId, forms.id))
      .where(and(eq(responses.id, responseId), isNull(responses.deletedAt)))

    if (!response) {
      throw serviceError('Response not found', 404, 'not_found')
    }

    const canReadByFaculty = canAccessFaculty(viewer.role, viewer.facultyId, response.ownerFacultyId)
    if (!canReadByFaculty && response.respondentId !== viewer.userId) {
      throw serviceError('You do not have permission to view this response', 403, 'forbidden')
    }

    const answers = await db
      .select()
      .from(responseAnswers)
      .where(eq(responseAnswers.responseId, responseId))

    const { ownerFacultyId: _ownerFacultyId, ...safeResponse } = response
    return { ...safeResponse, answers }
  }

  async updateResponse(responseId: string, viewer: Viewer, answers: AnswerInput[]) {
    return db.transaction(async (tx) => {
      const [response] = await tx
        .select({ id: responses.id, formId: responses.formId, respondentId: responses.respondentId })
        .from(responses)
        .where(and(eq(responses.id, responseId), isNull(responses.deletedAt)))

      if (!response) {
        throw serviceError('Response not found', 404, 'not_found')
      }
      if (response.respondentId !== viewer.userId) {
        throw serviceError('You do not have permission to update this response', 403, 'forbidden')
      }

      await this.assertCanEvaluate(tx, response.formId, viewer)

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
          })),
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
