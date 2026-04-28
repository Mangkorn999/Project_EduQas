import { db } from '../index'
import { faculties } from '../schema/faculties'

/**
 * Seed FALLBACK faculty for users without faculty_id from PSU Passport
 * FR-AUTH-04: ระบบ SHALL ใช้ FALLBACK_FACULTY_ID เมื่อ PSU ไม่ส่ง faculty_id
 */
export async function seedFaculties() {
  const FALLBACK_ID = '00000000-0000-0000-0000-000000000001'

  await db
    .insert(faculties)
    .values({
      id: FALLBACK_ID,
      code: 'FALLBACK',
      nameTh: 'หน่วยงานกลาง',
      nameEn: 'Central Unit',
    })
    .onConflictDoNothing()

  console.log('✅ Seeded FALLBACK faculty')
}

// Run if executed directly
if (require.main === module) {
  seedFaculties()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seed failed:', err)
      process.exit(1)
    })
}
