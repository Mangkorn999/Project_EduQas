import { db } from '../index'
import { faculties } from '../schema/faculties'

/**
 * Seed baseline faculties for local development.
 */
export async function seedFaculties() {
  await db
    .insert(faculties)
    .values([
      {
        id: '00000000-0000-0000-0000-000000000001',
        code: 'FALLBACK',
        nameTh: 'หน่วยงานกลาง',
        nameEn: 'Central Unit',
      },
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
      },
    ])
    .onConflictDoNothing()

  console.log('Seeded baseline faculties')
}

if (require.main === module) {
  seedFaculties()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err)
      process.exit(1)
    })
}
