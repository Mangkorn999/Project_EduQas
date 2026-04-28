import { db } from '../../../../db'
import { websites } from '../../../../db/schema'
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
    
    // Optional: Head request to check if reachable could go here
    // For now we just rely on format. URL validator job handles Reachability checks.
  }
}
