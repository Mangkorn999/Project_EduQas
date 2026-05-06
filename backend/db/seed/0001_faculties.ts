import { db } from '../index'
import { faculties } from '../schema/faculties'

/**
 * Seed sample faculties for development/testing
 */
export async function seedFaculties() {
  await db
    .insert(faculties)
    .values([
      {
        id: 'f8b2d1a0-e3b4-4c5d-9a8b-7c6d5e4f3a2b',
        code: '01',
        nameTh: 'คณะวิศวกรรมศาสตร์',
        nameEn: 'Faculty of Engineering',
      },
      {
        id: 'a1b2c3d4-e5f6-4a5b-8c7d-9e0f1a2b3c4d',
        code: '08',
        nameTh: 'คณะวิทยาศาสตร์',
        nameEn: 'Faculty of Science',
      },
      {
        id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
        code: '02',
        nameTh: 'คณะทรัพยากรธรรมชาติ',
        nameEn: 'Faculty of Natural Resources',
      },
      {
        id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f',
        code: '03',
        nameTh: 'คณะแพทยศาสตร์',
        nameEn: 'Faculty of Medicine',
      },
      {
        id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a',
        code: '05',
        nameTh: 'คณะวิทยาการจัดการ',
        nameEn: 'Faculty of Management Sciences',
      },
      {
        id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b',
        code: '10',
        nameTh: 'คณะอุตสาหกรรมเกษตร',
        nameEn: 'Faculty of Agro-Industry',
      },
      {
        id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c',
        code: 'EILA',
        nameTh: 'สำนักการศึกษาและนวัตกรรมการเรียนรู้ (EILA)',
        nameEn: 'Education and Innovative Learning Academy',
      },
    ])
    .onConflictDoNothing()

  console.log('✅ Seeded sample faculties')
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
