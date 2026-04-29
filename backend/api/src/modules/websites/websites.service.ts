import ExcelJS from 'exceljs'
import { db } from '../../../../db'
import { websites, faculties } from '../../../../db/schema'
import { eq, and, isNull, ilike } from 'drizzle-orm'

export class WebsitesService {
  async listWebsites(facultyScope?: string, urlStatus?: string, q?: string) {
    const filters = [isNull(websites.deletedAt)]
    
    if (facultyScope) {
      filters.push(eq(websites.ownerFacultyId, facultyScope))
    }
    
    if (urlStatus) {
      filters.push(eq(websites.urlStatus, urlStatus as any))
    }

    if (q) {
      filters.push(ilike(websites.name, `%${q}%`))
    }

    return db.select().from(websites).where(and(...filters))
  }

  async getWebsite(id: string, facultyScope?: string) {
    const filters = [eq(websites.id, id), isNull(websites.deletedAt)]
    if (facultyScope) {
      filters.push(eq(websites.ownerFacultyId, facultyScope))
    }
    const [website] = await db.select().from(websites).where(and(...filters))
    return website
  }

  async createWebsite(data: { name: string, url: string, category?: string, ownerFacultyId: string }) {
    await this.validateUrl(data.url)
    
    const [website] = await db.insert(websites).values({
      name: data.name,
      url: data.url,
      category: data.category,
      ownerFacultyId: data.ownerFacultyId,
    }).returning()
    
    return website
  }

  async updateWebsite(id: string, facultyScope: string | undefined, data: { name?: string, url?: string, category?: string }) {
    const website = await this.getWebsite(id, facultyScope)
    if (!website) throw new Error('not_found')

    if (data.url && data.url !== website.url) {
      await this.validateUrl(data.url)
    }

    const [updated] = await db.update(websites).set({
      name: data.name,
      url: data.url,
      category: data.category,
    }).where(eq(websites.id, id)).returning()

    return updated
  }

  async softDeleteWebsite(id: string, facultyScope?: string) {
    const website = await this.getWebsite(id, facultyScope)
    if (!website) throw new Error('not_found')

    await db.update(websites).set({
      deletedAt: new Date(),
      isActive: false
    }).where(eq(websites.id, id))
  }

  async validateUrl(url: string) {
    try {
      new URL(url)
    } catch {
      throw new Error('invalid_url')
    }
  }

  async importWebsitesXlsx(buffer: Uint8Array) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as any)

    const worksheet = workbook.worksheets[0]
    if (!worksheet) throw new Error('empty_workbook')

    const facultyCache = new Map<string, string>()
    const created: number[] = []
    const updated: number[] = []
    const errors: { row: number; reason: string }[] = []

    const rows: ExcelJS.Row[] = []
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push(row)
    })

    for (const row of rows) {
      const rowNumber = row.number
      const name = String(row.getCell(1).value ?? '').trim()
      const url = String(row.getCell(2).value ?? '').trim()
      const category = String(row.getCell(3).value ?? '').trim() || undefined
      const facultyCode = String(row.getCell(4).value ?? '').trim()

      if (!name || !url || !facultyCode) {
        errors.push({ row: rowNumber, reason: 'missing required fields: name, url, faculty_code' })
        continue
      }

      try { new URL(url) } catch {
        errors.push({ row: rowNumber, reason: `invalid URL: ${url}` })
        continue
      }

      let ownerFacultyId = facultyCache.get(facultyCode)
      if (!ownerFacultyId) {
        const [faculty] = await db.select().from(faculties).where(eq(faculties.code, facultyCode))
        if (!faculty) {
          errors.push({ row: rowNumber, reason: `faculty not found for code: ${facultyCode}` })
          continue
        }
        facultyCache.set(facultyCode, faculty.id)
        ownerFacultyId = faculty.id
      }

      const [existing] = await db.select().from(websites).where(and(eq(websites.url, url), isNull(websites.deletedAt)))

      if (existing) {
        await db.update(websites).set({ name, category, ownerFacultyId }).where(eq(websites.id, existing.id))
        updated.push(rowNumber)
      } else {
        await db.insert(websites).values({ name, url, category, ownerFacultyId })
        created.push(rowNumber)
      }
    }

    return { created: created.length, updated: updated.length, errors }
  }
}
