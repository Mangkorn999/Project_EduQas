import { db } from '../../../../db'
import { forms, evaluationCriteria, formQuestions, formVersions } from '../../../../db/schema'
import { eq, and, isNull, desc, sql } from 'drizzle-orm'

export class SnapshotService {
  async publishForm(formId: string, facultyScope?: string) {
    return db.transaction(async (tx) => {
      const filters = [eq(forms.id, formId), isNull(forms.deletedAt)]
      if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

      const [form] = await tx.select().from(forms).where(and(...filters))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('already_published')

      const criteria = await tx.select().from(evaluationCriteria).where(eq(evaluationCriteria.formId, formId))
      const questions = await tx.select().from(formQuestions).where(eq(formQuestions.formId, formId)).orderBy(formQuestions.sortOrder)

      // Get next version number
      const [lastVersion] = await tx.select()
        .from(formVersions)
        .where(eq(formVersions.formId, formId))
        .orderBy(desc(formVersions.versionNumber))
        .limit(1)
      
      const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1

      const snapshot = {
        form: {
          title: form.title,
          description: form.description,
          scope: form.scope,
          roundId: form.roundId,
          ownerFacultyId: form.ownerFacultyId,
          websiteTargetId: form.websiteTargetId,
        },
        criteria: criteria.map(c => ({
          name: c.name,
          dimension: c.dimension,
          weight: c.weight,
        })),
        questions: questions.map(q => ({
          questionType: q.questionType,
          label: q.label,
          helpText: q.helpText,
          isRequired: q.isRequired,
          sortOrder: q.sortOrder,
          config: q.config,
          // Note: criterionId might need mapping if we recreate them. 
          // In snapshot we might store the original criterion index or name to re-link on rollback.
          criterionName: criteria.find(c => c.id === q.criterionId)?.name
        }))
      }

      await tx.insert(formVersions).values({
        formId,
        versionNumber: nextVersionNumber,
        snapshot: snapshot
      })

      const [updated] = await tx.update(forms)
        .set({ status: 'open', updatedAt: new Date(), version: form.version + 1 })
        .where(eq(forms.id, formId))
        .returning()

      return updated
    })
  }

  async listVersions(formId: string) {
    return db.select().from(formVersions)
      .where(eq(formVersions.formId, formId))
      .orderBy(desc(formVersions.versionNumber))
  }

  async rollbackToVersion(formId: string, versionId: string, facultyScope?: string) {
    return db.transaction(async (tx) => {
      const filters = [eq(forms.id, formId), isNull(forms.deletedAt)]
      if (facultyScope) filters.push(eq(forms.ownerFacultyId, facultyScope))

      const [form] = await tx.select().from(forms).where(and(...filters))
      if (!form) throw new Error('form_not_found')

      const [version] = await tx.select()
        .from(formVersions)
        .where(and(eq(formVersions.id, versionId), eq(formVersions.formId, formId)))
      
      if (!version) throw new Error('version_not_found')

      const snapshot = version.snapshot as any

      // 1. Reset form to draft and update from snapshot
      await tx.update(forms).set({
        status: 'draft',
        title: snapshot.form.title,
        description: snapshot.form.description,
        updatedAt: new Date(),
        version: form.version + 1
      }).where(eq(forms.id, formId))

      // 2. Clear current criteria and questions
      await tx.delete(evaluationCriteria).where(eq(evaluationCriteria.formId, formId))
      await tx.delete(formQuestions).where(eq(formQuestions.formId, formId))

      // 3. Restore criteria
      const criteriaMapping: Record<string, string> = {}
      for (const cData of snapshot.criteria) {
        const [newCriterion] = await tx.insert(evaluationCriteria).values({
          formId,
          name: cData.name,
          dimension: cData.dimension,
          weight: cData.weight
        }).returning()
        criteriaMapping[cData.name] = newCriterion.id
      }

      // 4. Restore questions
      for (const qData of snapshot.questions) {
        await tx.insert(formQuestions).values({
          formId,
          questionType: qData.questionType,
          label: qData.label,
          helpText: qData.helpText,
          isRequired: qData.isRequired,
          sortOrder: qData.sortOrder,
          config: qData.config,
          criterionId: qData.criterionName ? criteriaMapping[qData.criterionName] : null
        })
      }

      return { success: true }
    })
  }
}
