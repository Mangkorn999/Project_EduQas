import { db } from '../index'
import { faculties } from '../schema/faculties'

/**
<<<<<<< HEAD
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
=======
 * Seed sample faculties for development/testing
 */
export async function seedFaculties() {
  await db
    .insert(faculties)
    .values([
      {
        id: '11111111-1111-1111-1111-111111111111',
        code: 'ENG',
        nameTh: 'คณะวิศวกรรมศาสตร์',
        nameEn: 'Faculty of Engineering',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        code: 'SCI',
        nameTh: 'คณะวิทยาศาสตร์',
        nameEn: 'Faculty of Science',
      }
    ])
    .onConflictDoNothing()

  console.log('✅ Seeded sample faculties')
>>>>>>> feature/ux-login-role-test
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
