import { FastifyReply, FastifyRequest } from 'fastify'
import ExcelJS from 'exceljs'
import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib'
import { eq, and, isNull, isNotNull } from 'drizzle-orm'
import { forms, responses, responseAnswers, formQuestions, users } from '../../../../db/schema'
import { canAccessFaculty } from '../../lib/permissions'

export class ReportsController {
  exportResponsesXlsx = async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as { formId: string }
    const user = request.user as any
    const db = request.server.db

    const [form] = await db.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
    if (!form) return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })

    if (!canAccessFaculty(user.role, user.facultyId, form.ownerFacultyId)) {
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

  exportResponsesPdf = async (request: FastifyRequest, reply: FastifyReply) => {
    const { formId } = request.params as { formId: string }
    const user = request.user as any
    const db = request.server.db

    const [form] = await db.select().from(forms).where(and(eq(forms.id, formId), isNull(forms.deletedAt)))
    if (!form) return reply.code(404).send({ error: { code: 'not_found', message: 'Form not found' } })

    if (!canAccessFaculty(user.role, user.facultyId, form.ownerFacultyId)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'Access denied' } })
    }

    const questions = await db.select().from(formQuestions).where(eq(formQuestions.formId, formId)).orderBy(formQuestions.sortOrder)
    const allResponses = await db.select({
      responseId: responses.id,
      email: users.email,
      displayName: users.displayName,
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

    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const addPage = () => {
      const page = pdfDoc.addPage(PageSizes.A4)
      return { page, width: page.getWidth(), height: page.getHeight() }
    }

    let { page, width, height } = addPage()
    let y = height - 50
    const margin = 50
    const lineH = 18

    const writeLine = (text: string, size = 10, bold = false, color = rgb(0, 0, 0)) => {
      if (y < margin + lineH) {
        ;({ page, width, height } = addPage())
        y = height - 50
      }
      page.drawText(text.slice(0, 120), { x: margin, y, size, font: bold ? boldFont : font, color })
      y -= lineH
    }

    // Title
    writeLine(form.title ?? 'Form Report', 16, true, rgb(0.05, 0.13, 0.34))
    writeLine(`Form ID: ${formId}`, 9, false, rgb(0.4, 0.4, 0.4))
    writeLine(`Exported: ${new Date().toLocaleString()}`, 9, false, rgb(0.4, 0.4, 0.4))
    writeLine(`Total responses: ${allResponses.length}`, 10, true)
    y -= 10

    for (const resp of allResponses) {
      writeLine(`─── ${resp.displayName} (${resp.email}) ───`, 9, true, rgb(0.05, 0.13, 0.34))
      writeLine(`Submitted: ${resp.submittedAt?.toLocaleString() ?? '-'}`, 8, false, rgb(0.5, 0.5, 0.5))
      for (const q of questions) {
        const ans = answersMap[resp.responseId]?.[q.id] ?? '-'
        writeLine(`  Q: ${q.label}`, 9, true)
        writeLine(`  A: ${ans}`, 9, false)
      }
      y -= 6
    }

    const pdfBytes = await pdfDoc.save()
    return reply.code(200)
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="form-${formId}-responses.pdf"`)
      .send(Buffer.from(pdfBytes))
  }
}
