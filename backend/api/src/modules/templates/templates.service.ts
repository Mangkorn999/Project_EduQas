import { and, eq, isNull } from 'drizzle-orm'

import { db } from '../../../../db'
import {
  templates,
  templateCriteria,
  templateQuestions,
  forms,
  evaluationCriteria,
  formQuestions,
} from '../../../../db/schema'

export class TemplatesService {
  async listTemplates(scopeFilter?: string, facultyScope?: string, includeDeprecated = false) {
    const filters = [isNull(templates.deletedAt)]

    if (scopeFilter) filters.push(eq(templates.scope, scopeFilter as 'faculty' | 'global'))
    if (facultyScope) {
      filters.push(
        eq(
          templates.ownerFacultyId,
          facultyScope
        )
      )
    }
    if (!includeDeprecated) filters.push(eq(templates.isDeprecated, false))

    return db.select().from(templates).where(and(...filters))
  }

  async getTemplate(id: string, facultyScope?: string) {
    const filters = [eq(templates.id, id), isNull(templates.deletedAt)]
    if (facultyScope) filters.push(eq(templates.ownerFacultyId, facultyScope))

    const [template] = await db.select().from(templates).where(and(...filters))
    return template
  }

  async createTemplate(data: {
    title: string
    description?: string
    scope: 'faculty' | 'global'
    ownerFacultyId?: string | null
    createdById: string
  }) {
    const [created] = await db.insert(templates).values({
      title: data.title,
      description: data.description,
      scope: data.scope,
      ownerFacultyId: data.ownerFacultyId,
      createdById: data.createdById,
    }).returning()

    return created
  }

  async updateTemplate(
    id: string,
    facultyScope: string | undefined,
    data: { title?: string; description?: string; isDeprecated?: boolean }
  ) {
    const existing = await this.getTemplate(id, facultyScope)
    if (!existing) throw new Error('not_found')

    const [updated] = await db.update(templates).set({
      ...data,
      version: existing.version + 1,
      updatedAt: new Date(),
    }).where(eq(templates.id, id)).returning()

    return updated
  }

  async softDeleteTemplate(id: string, facultyScope?: string) {
    const existing = await this.getTemplate(id, facultyScope)
    if (!existing) throw new Error('not_found')

    await db.update(templates).set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(templates.id, id))
  }

  async deprecateTemplate(id: string, facultyScope?: string) {
    return this.updateTemplate(id, facultyScope, { isDeprecated: true })
  }

  async cloneTemplate(id: string, facultyScope?: string, createdById?: string, targetFacultyId?: string | null) {
    return db.transaction(async (tx) => {
      const filters = [eq(templates.id, id), isNull(templates.deletedAt)]
      if (facultyScope) filters.push(eq(templates.ownerFacultyId, facultyScope))

      const [existing] = await tx.select().from(templates).where(and(...filters))
      if (!existing) throw new Error('not_found')

      const [createdTemplate] = await tx.insert(templates).values({
        title: `${existing.title} (Copy)`,
        description: existing.description,
        scope: existing.scope,
        ownerFacultyId: targetFacultyId ?? existing.ownerFacultyId,
        createdById: createdById ?? existing.createdById,
      }).returning()

      const criteria = await tx.select().from(templateCriteria).where(eq(templateCriteria.templateId, existing.id))
      if (criteria.length > 0) {
        await tx.insert(templateCriteria).values(
          criteria.map((criterion) => ({
            templateId: createdTemplate.id,
            name: criterion.name,
            dimension: criterion.dimension,
            weight: criterion.weight,
          }))
        )
      }

      const questions = await tx.select().from(templateQuestions).where(eq(templateQuestions.templateId, existing.id))
      if (questions.length > 0) {
        await tx.insert(templateQuestions).values(
          questions.map((question) => ({
            templateId: createdTemplate.id,
            criterionName: question.criterionName,
            questionType: question.questionType,
            label: question.label,
            helpText: question.helpText,
            isRequired: question.isRequired,
            sortOrder: question.sortOrder,
            config: question.config,
          }))
        )
      }

      return createdTemplate
    })
  }

  async createFormFromTemplate(templateId: string, data: {
    roundId: string
    title?: string
    description?: string
    scope: 'faculty' | 'university'
    ownerFacultyId?: string | null
    createdById: string
    websiteTargetId?: string | null
  }) {
    return db.transaction(async (tx) => {
      const [template] = await tx.select().from(templates).where(
        and(eq(templates.id, templateId), isNull(templates.deletedAt))
      )
      if (!template) throw new Error('not_found')
      if (template.isDeprecated) throw new Error('deprecated')

      const [createdForm] = await tx.insert(forms).values({
        title: data.title ?? template.title,
        description: data.description ?? template.description,
        roundId: data.roundId,
        scope: data.scope,
        ownerFacultyId: data.ownerFacultyId,
        createdById: data.createdById,
        websiteTargetId: data.websiteTargetId,
      }).returning()

      const criteria = await tx.select().from(templateCriteria).where(eq(templateCriteria.templateId, templateId))
      const criterionNameMap = new Map<string, string>()

      for (const criterion of criteria) {
        const [createdCriterion] = await tx.insert(evaluationCriteria).values({
          formId: createdForm.id,
          name: criterion.name,
          dimension: criterion.dimension,
          weight: criterion.weight,
        }).returning()

        criterionNameMap.set(criterion.name, createdCriterion.id)
      }

      const questions = await tx.select().from(templateQuestions).where(eq(templateQuestions.templateId, templateId))
      if (questions.length > 0) {
        await tx.insert(formQuestions).values(
          questions.map((question) => ({
            formId: createdForm.id,
            criterionId: question.criterionName ? criterionNameMap.get(question.criterionName) ?? null : null,
            questionType: question.questionType as any,
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
