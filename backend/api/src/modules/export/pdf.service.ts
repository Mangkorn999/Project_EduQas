import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

/**
 * FR-RANK-07: PDF Export Service
 * Generate basic scorecard or ranking report
 */
export async function generateScorecardPdf(data: {
  websiteName: string
  roundName: string
  totalScore: number
  rank: number
  criteriaScores: { label: string; score: number; weight: number }[]
}) {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([600, 800])
  const { width, height } = page.getSize()
  
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)

  // Title
  page.drawText('EILA Evaluation Scorecard', {
    x: 50,
    y: height - 50,
    size: 24,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.4),
  })

  // Header Info
  page.drawText(`Website: ${data.websiteName}`, { x: 50, y: height - 90, size: 14, font: fontBold })
  page.drawText(`Round: ${data.roundName}`, { x: 50, y: height - 110, size: 12, font: fontRegular })
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 130, size: 12, font: fontRegular })

  // Summary Box
  page.drawRectangle({
    x: 50,
    y: height - 200,
    width: 500,
    height: 50,
    color: rgb(0.95, 0.95, 0.95),
  })
  page.drawText(`Total Score: ${data.totalScore.toFixed(2)} / 100`, { x: 70, y: height - 180, size: 16, font: fontBold, color: rgb(0, 0.5, 0) })
  page.drawText(`Rank: #${data.rank}`, { x: 400, y: height - 180, size: 16, font: fontBold })

  // Criteria Table
  let y = height - 240
  page.drawText('Detailed Breakdown:', { x: 50, y, size: 14, font: fontBold })
  y -= 30

  // Table Headers
  page.drawText('Criterion', { x: 50, y, size: 10, font: fontBold })
  page.drawText('Weight', { x: 350, y, size: 10, font: fontBold })
  page.drawText('Score', { x: 450, y, size: 10, font: fontBold })
  y -= 20

  for (const item of data.criteriaScores) {
    page.drawText(item.label.substring(0, 50), { x: 50, y, size: 10, font: fontRegular })
    page.drawText(`${item.weight}%`, { x: 350, y, size: 10, font: fontRegular })
    page.drawText(item.score.toFixed(2), { x: 450, y, size: 10, font: fontRegular })
    y -= 15
    
    if (y < 50) break // Simple paging logic
  }

  // Footer
  page.drawText('Prince of Songkla University - EILA Platform', {
    x: 200,
    y: 30,
    size: 10,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  })

  return await pdfDoc.save()
}
