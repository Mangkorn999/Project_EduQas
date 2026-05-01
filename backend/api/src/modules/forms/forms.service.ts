import { db } from '../../../../db'
import { forms, evaluationCriteria, formQuestions, websites, faculties } from '../../../../db/schema'
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
    websiteUrl?: string | null
    websiteName?: string | null
    websiteOwnerFaculty?: string | null
  }) {
    let { websiteUrl, websiteName, websiteOwnerFaculty } = data

    // FR-FORM-02/03/04 — Auto-snapshot from registry if websiteTargetId is provided
    if (data.websiteTargetId) {
      const [site] = await db.select({
        url: websites.url,
        name: websites.name,
        facultyName: faculties.nameTh,
      })
      .from(websites)
      .leftJoin(faculties, eq(websites.ownerFacultyId, faculties.id))
      .where(eq(websites.id, data.websiteTargetId))

      if (site) {
        websiteUrl = websiteUrl || site.url
        websiteName = websiteName || site.name
        websiteOwnerFaculty = websiteOwnerFaculty || site.facultyName
      }
    }

    const [form] = await db.insert(forms).values({
      title: data.title,
      roundId: data.roundId,
      scope: data.scope,
      ownerFacultyId: data.ownerFacultyId,
      createdById: data.createdById,
      websiteTargetId: data.websiteTargetId,
      description: data.description,
      websiteUrl,
      websiteName,
      websiteOwnerFaculty,
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

      let websiteUrl = data.websiteUrl
      let websiteName = data.websiteName
      let websiteOwnerFaculty = data.websiteOwnerFaculty

      // Re-snapshot if websiteTargetId changes
      if (data.websiteTargetId && data.websiteTargetId !== existing.websiteTargetId) {
        const [site] = await tx.select({
          url: websites.url,
          name: websites.name,
          facultyName: faculties.nameTh,
        })
        .from(websites)
        .leftJoin(faculties, eq(websites.ownerFacultyId, faculties.id))
        .where(eq(websites.id, data.websiteTargetId))

        if (site) {
          websiteUrl = websiteUrl || site.url
          websiteName = websiteName || site.name
          websiteOwnerFaculty = websiteOwnerFaculty || site.facultyName
        }
      }

      const [updated] = await tx.update(forms).set({
        ...data,
        websiteUrl: websiteUrl || existing.websiteUrl,
        websiteName: websiteName || existing.websiteName,
        websiteOwnerFaculty: websiteOwnerFaculty || existing.websiteOwnerFaculty,
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

    await db.update(forms).set({ deletedAt: new Date() }).where(eq(forms.id, id))
  }

  async closeForm(id: string, facultyScope?: string) {
    const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
    if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

    const [existing] = await db.select().from(forms).where(and(...filters))
    if (!existing) throw new Error('not_found')
    if (existing.status === 'closed') throw new Error('already_closed')

    const [updated] = await db.update(forms).set({ status: 'closed' }).where(eq(forms.id, id)).returning()
    return updated
  }

  async duplicateForm(id: string, facultyScope: string | undefined, userId: string) {
    const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
    if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

    const [source] = await db.select().from(forms).where(and(...filters))
    if (!source) throw new Error('not_found')

    const criteria = await db.select().from(evaluationCriteria).where(eq(evaluationCriteria.formId, id))
    const questions = await db.select().from(formQuestions).where(eq(formQuestions.formId, id))

    return db.transaction(async (tx) => {
      const [newForm] = await tx.insert(forms).values({
        title: `${source.title} (copy)`,
        description: source.description,
        roundId: source.roundId,
        websiteTargetId: source.websiteTargetId,
        websiteUrl: source.websiteUrl,
        websiteName: source.websiteName,
        websiteOwnerFaculty: source.websiteOwnerFaculty,
        scope: source.scope,
        status: 'draft',
        ownerFacultyId: source.ownerFacultyId,
        createdById: userId,
        openAt: source.openAt,
        closeAt: source.closeAt,
      }).returning()

      if (criteria.length > 0) {
        const criteriaIdMap = new Map<string, string>()
        for (const c of criteria) {
          const [nc] = await tx.insert(evaluationCriteria).values({
            formId: newForm.id,
            name: c.name,
            dimension: c.dimension,
            weight: c.weight,
          }).returning()
          criteriaIdMap.set(c.id, nc.id)
        }

        if (questions.length > 0) {
          await tx.insert(formQuestions).values(
            questions.map((q) => ({
              formId: newForm.id,
              criterionId: q.criterionId ? (criteriaIdMap.get(q.criterionId) ?? null) : null,
              questionType: q.questionType,
              label: q.label,
              helpText: q.helpText,
              isRequired: q.isRequired,
              sortOrder: q.sortOrder,
              config: q.config,
            }))
          )
        }
      } else if (questions.length > 0) {
        await tx.insert(formQuestions).values(
          questions.map((q) => ({
            formId: newForm.id,
            criterionId: null,
            questionType: q.questionType,
            label: q.label,
            helpText: q.helpText,
            isRequired: q.isRequired,
            sortOrder: q.sortOrder,
            config: q.config,
          }))
        )
      }

      return newForm
    })
  }

  async exportForm(id: string, facultyScope?: string) {
    const filters = [eq(forms.id, id), isNull(forms.deletedAt)]
    if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

    const [form] = await db.select().from(forms).where(and(...filters))
    if (!form) throw new Error('not_found')

    const criteria = await db.select().from(evaluationCriteria).where(eq(evaluationCriteria.formId, id))
    const questions = await db.select().from(formQuestions).where(eq(formQuestions.formId, id)).orderBy(formQuestions.sortOrder)

    return { form, criteria, questions }
  }

  async importFormJson(
    data: { title: string; description?: string; scope: 'faculty' | 'university'; criteria: any[]; questions: any[] },
    userId: string,
    facultyId?: string
  ) {
    return db.transaction(async (tx) => {
      const [newForm] = await tx.insert(forms).values({
        title: data.title,
        description: data.description,
        scope: data.scope,
        ownerFacultyId: facultyId,
        createdById: userId,
        status: 'draft',
      }).returning()

      const criteriaIdMap = new Map<string, string>()
      for (const c of (data.criteria ?? [])) {
        const [nc] = await tx.insert(evaluationCriteria).values({
          formId: newForm.id,
          name: c.name,
          dimension: c.dimension ?? null,
          weight: c.weight ?? 1,
        }).returning()
        criteriaIdMap.set(c.id ?? c.name, nc.id)
      }

      for (const q of (data.questions ?? [])) {
        await tx.insert(formQuestions).values({
          formId: newForm.id,
          criterionId: q.criterionId ? (criteriaIdMap.get(q.criterionId) ?? null) : null,
          questionType: q.questionType,
          label: q.label,
          helpText: q.helpText ?? null,
          isRequired: q.isRequired ?? false,
          sortOrder: q.sortOrder ?? 0,
          config: q.config ?? null,
        })
      }

      return { id: newForm.id }
    })
  }
}
