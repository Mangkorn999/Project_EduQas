import { db } from '../../../../db'
import { forms, evaluationCriteria, formQuestions } from '../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export class FormsService {
  async listForms(roundId?: string, status?: string, ownerFacultyId?: string) {
    const filters = [isNull(forms.deletedAt)]

    if (roundId) filters.push(eq(forms.roundId, roundId))
    if (status) filters.push(eq(forms.status, status as any))
    if (ownerFacultyId) filters.push(eq(forms.ownerFacultyId, ownerFacultyId))

    return db.select().from(forms).where(and(...filters))
  }

  async getFormById(id: string, facultyScope?: string) {
    const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
    if (facultyScope) {
      filters.push(eq(forms.ownerFacultyId, facultyScope))
    }
    const [form] = await db.select().from(forms).where(and(...filters))
    return form
  }

  async createForm(data: {
    title: string
    roundId: string
    scope: 'faculty' | 'university'
    ownerFacultyId?: string | null
    createdById: string
    websiteTargetId?: string | null
    description?: string | null
  }) {
    const [form] = await db.insert(forms).values({
      title: data.title,
      roundId: data.roundId,
      scope: data.scope,
      ownerFacultyId: data.ownerFacultyId,
      createdById: data.createdById,
      websiteTargetId: data.websiteTargetId,
      description: data.description,
    }).returning()
    return form
  }

  async updateForm(id: string, facultyScope: string | undefined, data: Partial<typeof forms.$inferInsert>) {
    return db.transaction(async (tx) => {
      const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
      if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

      const [existing] = await tx.select().from(forms).where(and(...filters))
      if (!existing) throw new Error('not_found')
      
      // PATCH /forms/:id ← แก้ draft เท่านั้น (status=draft)
      if (existing.status !== 'draft') throw new Error('forbidden_non_draft')

      const [updated] = await tx.update(forms).set({
        ...data,
        version: existing.version + 1,
        updatedAt: new Date()
      }).where(eq(forms.id, id)).returning()

      return updated
    })
  }

  async softDeleteForm(id: string, facultyScope?: string) {
    const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
    if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

    const [existing] = await db.select().from(forms).where(and(...filters))
    if (!existing) throw new Error('not_found')

    await db.update(forms).set({
      deletedAt: new Date()
    }).where(eq(forms.id, id))
  }

  async closeForm(id: string, facultyScope?: string) {
    const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
    if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

    const [existing] = await db.select().from(forms).where(and(...filters))
    if (!existing) throw new Error('not_found')
    if (existing.status !== 'open') throw new Error('form_not_open')

    const [updated] = await db.update(forms).set({
      status: 'closed',
      version: existing.version + 1,
      updatedAt: new Date(),
    }).where(eq(forms.id, id)).returning()

    return updated
  }

  async duplicateForm(id: string, facultyScope?: string) {
    return db.transaction(async (tx) => {
      const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
      if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

      const [existing] = await tx.select().from(forms).where(and(...filters))
      if (!existing) throw new Error('not_found')

      const [createdForm] = await tx.insert(forms).values({
        title: `${existing.title} (Copy)`,
        description: existing.description,
        roundId: existing.roundId,
        scope: existing.scope,
        ownerFacultyId: existing.ownerFacultyId,
        createdById: existing.createdById,
        websiteTargetId: existing.websiteTargetId,
        status: 'draft',
      }).returning()

      const criteria = await tx.select().from(evaluationCriteria).where(eq(evaluationCriteria.formId, existing.id))
      const criterionIdMap = new Map<string, string>()

      for (const criterion of criteria) {
        const [createdCriterion] = await tx.insert(evaluationCriteria).values({
          formId: createdForm.id,
          name: criterion.name,
          dimension: criterion.dimension,
          weight: criterion.weight,
        }).returning()

        criterionIdMap.set(criterion.id, createdCriterion.id)
      }

      const questions = await tx.select().from(formQuestions).where(eq(formQuestions.formId, existing.id))
      if (questions.length > 0) {
        await tx.insert(formQuestions).values(
          questions.map((question) => ({
            formId: createdForm.id,
            criterionId: question.criterionId ? criterionIdMap.get(question.criterionId) ?? null : null,
            questionType: question.questionType,
            label: question.label,
            helpText: question.helpText,
            isRequired: question.isRequired,
            sortOrder: question.sortOrder,
            config: question.config,
          }))
        )
      }

      return createdForm
    })
  }
}
