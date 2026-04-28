import { db } from '../../../../db'
import { evaluationCriteria, forms } from '../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export class CriteriaService {
  async listByFormId(formId: string) {
    return db.select().from(evaluationCriteria).where(eq(evaluationCriteria.formId, formId))
  }

  async addCriterion(formId: string, data: { name: string, dimension?: string | null, weight: number }) {
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('forbidden_non_draft')

      const [criterion] = await tx.insert(evaluationCriteria).values({
        formId,
        name: data.name,
        dimension: data.dimension,
        weight: data.weight,
      }).returning()
      return criterion
    })
  }

  async updateCriterion(id: string, formId: string, data: { name?: string, dimension?: string | null, weight?: number }) {
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('forbidden_non_draft')

      const [updated] = await tx.update(evaluationCriteria)
        .set(data)
        .where(and(eq(evaluationCriteria.id, id), eq(evaluationCriteria.formId, formId)))
        .returning()
      
      if (!updated) throw new Error('criterion_not_found')
      return updated
    })
  }

  async deleteCriterion(id: string, formId: string) {
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('forbidden_non_draft')

      const [deleted] = await tx.delete(evaluationCriteria)
        .where(and(eq(evaluationCriteria.id, id), eq(evaluationCriteria.formId, formId)))
        .returning()
      
      if (!deleted) throw new Error('criterion_not_found')
      return deleted
    })
  }
}
