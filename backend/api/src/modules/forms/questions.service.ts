import { db } from '../../../../db'
import { formQuestions, forms } from '../../../../db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export class QuestionsService {
  async listByFormId(formId: string) {
    return db.select().from(formQuestions)
      .where(eq(formQuestions.formId, formId))
      .orderBy(formQuestions.sortOrder)
  }

  async addQuestion(formId: string, data: {
    questionType: any
    label: string
    criterionId?: string | null
    helpText?: string | null
    isRequired?: boolean
    config?: any
    sortOrder?: number
  }) {
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('forbidden_non_draft')

      const [question] = await tx.insert(formQuestions).values({
        formId,
        questionType: data.questionType,
        label: data.label,
        criterionId: data.criterionId,
        helpText: data.helpText,
        isRequired: data.isRequired ?? false,
        config: data.config,
        sortOrder: data.sortOrder ?? 0,
      }).returning()
      return question
    })
  }

  async updateQuestion(id: string, formId: string, data: {
    label?: string
    helpText?: string | null
    isRequired?: boolean
    config?: any
    sortOrder?: number
  }) {
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('forbidden_non_draft')

      const [updated] = await tx.update(formQuestions)
        .set(data)
        .where(and(eq(formQuestions.id, id), eq(formQuestions.formId, formId)))
        .returning()
      
      if (!updated) throw new Error('question_not_found')
      return updated
    })
  }

  async deleteQuestion(id: string, formId: string) {
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('forbidden_non_draft')

      const [deleted] = await tx.delete(formQuestions)
        .where(and(eq(formQuestions.id, id), eq(formQuestions.formId, formId)))
        .returning()
      
      if (!deleted) throw new Error('question_not_found')
      return deleted
    })
  }

  async reorderQuestions(formId: string, items: { id: string, sortOrder: number }[]) {
    return db.transaction(async (tx) => {
      const [form] = await tx.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
      if (!form) throw new Error('form_not_found')
      if (form.status !== 'draft') throw new Error('forbidden_non_draft')

      for (const item of items) {
        await tx.update(formQuestions)
          .set({ sortOrder: item.sortOrder })
          .where(and(eq(formQuestions.id, item.id), eq(formQuestions.formId, formId)))
      }
      return { success: true }
    })
  }
}
