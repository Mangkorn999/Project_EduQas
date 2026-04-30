import { FastifyReply, FastifyRequest } from 'fastify'
import ExcelJS from 'exceljs'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import { forms, responses, responseAnswers, formQuestions, users } from '../../../../db/schema'

export class ReportsController {
  exportResponsesXlsx = async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as { formId: string }
    const user = request.user as any
    const db = request.server.db

    const [form] = await db.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
    if (!form) return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })

    if (user.role === 'admin' && form.ownerFacultyId !== user.facultyId) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Access denied' } })
    }

    const questions = await db.select().from(formQuestions).where(eq(formQuestions.formId, formId)).orderBy(formQuestions.sortOrder)
    const allResponses = await db.select({
      responseId: responses.id,
      respondentId: responses.respondentId,
      email: users.email,
      displayName: users.displayName,
      formOpenedAt: responses.formOpenedAt,
      websiteOpenedAt: responses.websiteOpenedAt,
      submittedAt: responses.submittedAt,
    }).from(responses).innerJoin(users, eq(responses.respondentId, users.id))
      .where(and(eq(responses.formId, formId), isNotNull(responses.submittedAt), isNull(responses.deletedAt)))

    const answersMap: Record<string, Record<string, string>> = {}
    if (allResponses.length > 0) {
      const allAnswerRows = await db.select().from(responseAnswers)
        .innerJoin(responses, eq(responseAnswers.responseId, responses.id))
        .where(and(eq(responses.formId, formId), isNull(responses.deletedAt)))

      for (const row of allAnswerRows) {
        const rid = row.response_answers.responseId
        const qid = row.response_answers.questionId
        if (!answersMap[rid]) answersMap[rid] = {}
        answersMap[rid][qid] = row.response_answers.valueNumber?.toString() ?? row.response_answers.valueText ?? row.response_answers.valueJson ?? ''
      }
    }

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Responses')
    const headers = ['Respondent Email', 'Display Name', 'Form Opened At', 'Website Opened At', 'Submitted At', ...questions.map((q) => q.label)]
    sheet.addRow(headers)
    sheet.getRow(1).font = { bold: true }

    for (const resp of allResponses) {
      const row = [resp.email, resp.displayName, resp.formOpenedAt?.toISOString() ?? '', resp.websiteOpenedAt?.toISOString() ?? '', resp.submittedAt?.toISOString() ?? '', ...questions.map((q) => answersMap[resp.responseId]?.[q.id] ?? '')]
      sheet.addRow(row)
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return reply.code(200).header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="form-${formId}-responses.xlsx"`).send(Buffer.from(buffer))
  }
}
