import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { WebsitesService } from '../../src/modules/websites/websites.service'
import { generateId, clearTestData } from './test-utils'
import { db } from '../../../db'
import { faculties, websites } from '../../../db/schema'

describe('Cross-Faculty Leak Integration', () => {
  const service = new WebsitesService()
  
  const ctx = {
    facA: generateId(),
    facB: generateId(),
    siteA: generateId(),
    siteB: generateId(),
  }

  beforeAll(async () => {
    // Faculties
    await db.insert(faculties).values([
      { id: ctx.facA, code: `FAC-A-${ctx.facA.slice(0, 4)}`, nameTh: 'คณะ A', nameEn: 'Faculty A' },
      { id: ctx.facB, code: `FAC-B-${ctx.facB.slice(0, 4)}`, nameTh: 'คณะ B', nameEn: 'Faculty B' },
    ])
    
    // Websites
    await db.insert(websites).values([
      { id: ctx.siteA, name: 'Site A', url: 'https://siteA.com', ownerFacultyId: ctx.facA },
      { id: ctx.siteB, name: 'Site B', url: 'https://siteB.com', ownerFacultyId: ctx.facB },
    ])
  })

  afterAll(async () => {
    await clearTestData({
      websiteIds: [ctx.siteA, ctx.siteB],
      facultyIds: [ctx.facA, ctx.facB],
    })
  })

  it('Admin from Faculty A should not see Site B in list', async () => {
    // listWebsites with scope FacA
    const sites = await service.listWebsites(ctx.facA)
    
    expect(sites.length).toBeGreaterThan(0)
    expect(sites.some(s => s.id === ctx.siteA)).toBe(true)
    expect(sites.some(s => s.id === ctx.siteB)).toBe(false) // Site B should be invisible
  })

  it('Admin from Faculty A trying to get Site B directly -> Returns undefined', async () => {
    // getWebsite with scope FacA for Site B's ID
    const site = await service.getWebsite(ctx.siteB, ctx.facA)
    
    // Handler translates undefined to 404/403, here service returns undefined
    expect(site).toBeUndefined()
  })

  it('Super Admin (No scope) sees all sites', async () => {
    // getWebsite without scope
    const site = await service.getWebsite(ctx.siteB)
    expect(site).toBeDefined()
    expect(site?.id).toBe(ctx.siteB)
  })
})
