import { db } from '../../../../db'
import { templates, templateQuestions, forms, formQuestions } from '../../../../db/schema'
import { eq, and, isNull, isNotNull, count } from 'drizzle-orm'
import { getPaginationOffset, paginatedResponse } from '../../utils/pagination'

export class TemplatesService {
  async listTemplates(
    filters: { scope?: string; facultyId?: string; includeDeprecated?: boolean },
    page: number,
    limit: number,
  ) {
    const conditions = [isNull(templates.deletedAt)]

    if (filters.scope) {
      conditions.push(eq(templates.scope, filters.scope as any))
    }

    if (filters.facultyId) {
      conditions.push(eq(templates.ownerFacultyId, filters.facultyId))
    }

    if (!filters.includeDeprecated) {
      conditions.push(isNull(templates.deprecatedAt))
    }

    const where = and(...conditions)
    const offset = getPaginationOffset(page, limit)

    const [rows, [{ value: total }]] = await Promise.all([
      db.select().from(templates).where(where).limit(limit).offset(offset),
      db.select({ value: count() }).from(templates).where(where),
    ])

    return paginatedResponse(rows, Number(total), page, limit)
  }

  async getTemplate(id: string) {
    const [template] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), isNull(templates.deletedAt)))

    if (!template) throw new Error('not_found')

    const questions = await db
      .select()
      .from(templateQuestions)
      .where(eq(templateQuestions.templateId, id))

    return { ...template, questions }
  }

  async createTemplate(data: {
    title: string
    scope: string
    ownerFacultyId?: string
    ownerUserId: string
  }) {
    const [template] = await db
      .insert(templates)
      .values({
        title: data.title,
        scope: data.scope as any,
        ownerFacultyId: data.ownerFacultyId,
        ownerUserId: data.ownerUserId,
      })
      .returning()

    return template
  }

  async updateTemplate(id: string, data: { title?: string; scope?: string }) {
    const [existing] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), isNull(templates.deletedAt)))

    if (!existing) throw new Error('not_found')

    const [updated] = await db
      .update(templates)
      .set({
        ...(data.title !== undefined && { title: data.title }),
        ...(data.scope !== undefined && { scope: data.scope as any }),
      })
      .where(eq(templates.id, id))
      .returning()

    return updated
  }

  async softDeleteTemplate(id: string) {
    const [existing] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), isNull(templates.deletedAt)))

    if (!existing) throw new Error('not_found')

    await db
      .update(templates)
      .set({ deletedAt: new Date() })
      .where(eq(templates.id, id))
  }

  async deprecateTemplate(id: string) {
    const [existing] = await db
      .select()
      .from(templates)
      .where(and(eq(templates.id, id), isNull(templates.deletedAt)))

    if (!existing) throw new Error('not_found')

    if (existing.deprecatedAt) return existing

    const [updated] = await db
      .update(templates)
      .set({ deprecatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning()

    return updated
  }

  async cloneTemplate(
    id: string,
    targetFacultyId: string | undefined,
    requestingUserId: string,
    requestingUserRole: string,
  ) {
    const source = await this.getTemplate(id)

    let ownerFacultyId: string | undefined

    if (requestingUserRole === 'super_admin') {
      ownerFacultyId = targetFacultyId ?? source.ownerFacultyId ?? undefined
    } else {
      ownerFacultyId = source.ownerFacultyId ?? undefined
    }

    const [newTemplate] = await db
      .insert(templates)
      .values({
        title: `Copy of ${source.title}`,
        scope: source.scope,
        ownerFacultyId,
        ownerUserId: requestingUserId,
      })
      .returning()

    if (source.questions.length > 0) {
      await db.insert(templateQuestions).values(
        source.questions.map((q) => ({
          templateId: newTemplate.id,
          questionType: q.questionType,
          label: q.label,
          helpText: q.helpText,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
          config: q.config,
        })),
      )
    }

    return newTemplate
  }

  async createFormFromTemplate(
    templateId: string,
    formData: {
      title: string
      roundId?: string
      websiteUrl?: string
      websiteName?: string
      scope: string
      ownerFacultyId?: string
      createdById: string
    },
  ) {
    const source = await this.getTemplate(templateId)

    const [newForm] = await db
      .insert(forms)
      .values({
        title: formData.title,
        roundId: formData.roundId,
        websiteUrl: formData.websiteUrl,
        websiteName: formData.websiteName,
        scope: formData.scope as any,
        ownerFacultyId: formData.ownerFacultyId,
        createdById: formData.createdById,
      })
      .returning()

    if (source.questions.length > 0) {
      await db.insert(formQuestions).values(
        source.questions.map((q) => ({
          formId: newForm.id,
          questionType: q.questionType,
          label: q.label,
          helpText: q.helpText,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
          config: q.config,
        })),
      )
    }

    return { id: newForm.id }
  }
}
