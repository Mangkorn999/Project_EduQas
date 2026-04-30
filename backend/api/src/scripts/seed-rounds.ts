import 'dotenv/config'
import { db } from '../../../db'
import { rounds } from '../../../db/schema/rounds'
import { users } from '../../../db/schema/users'

async function seed() {
  console.log('🌱 Seeding test rounds...')
  
  // Find the first user to be the creator (required by schema)
  const [admin] = await db.select().from(users).limit(1)
  
  if (!admin) {
    console.error('❌ Error: No users found in database. Cannot seed rounds without a creator user.')
    process.exit(1)
  }

  const testRounds = [
    {
      name: 'รอบที่ 1/2568',
      academicYear: 2568,
      semester: 1,
      status: 'active' as const,
      scope: 'university' as const,
      createdById: admin.id
    },
    {
      name: 'รอบที่ 2/2568',
      academicYear: 2568,
      semester: 2,
      status: 'draft' as const,
      scope: 'university' as const,
      createdById: admin.id
    },
    {
      name: 'รอบพิเศษ/2568',
      academicYear: 2568,
      semester: 3,
      status: 'closed' as const,
      scope: 'university' as const,
      createdById: admin.id
    }
  ]

  let count = 0
  for (const r of testRounds) {
    try {
      await db.insert(rounds).values(r)
      console.log(`✅ Inserted: ${r.name}`)
      count++
    } catch (err: any) {
      // Handle unique constraint (e.g. if name must be unique) or other conflicts
      if (err.code === '23505') {
        console.warn(`⚠️  Round "${r.name}" already exists, skipping.`)
      } else {
        console.error(`❌ Error inserting round "${r.name}":`, err.message)
      }
    }
  }

  console.log(`\n✨ Done! Inserted ${count} rounds.`)
  process.exit(0)
}

seed().catch(err => {
  console.error('💥 Seed failed:', err)
  process.exit(1)
})
