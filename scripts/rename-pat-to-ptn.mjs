// One-time migration: rename Patient reference IDs PAT-#### -> PTN-#### and
// keep the referencing tables (Appointment, MedicalHistory, WalkInQueue) in
// sync. Safe to re-run — the WHERE clauses make it a no-op once done.
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL)

async function main() {
  const patients = await sql`
    UPDATE "Patient"
    SET "patientid" = 'PTN-' || SPLIT_PART("patientid", '-', 2)
    WHERE "patientid" LIKE 'PAT-%'
    RETURNING "patientid"`
  console.log(`Patient rows renamed: ${patients.length} -> ${patients.map((p) => p.patientid).join(', ')}`)

  const appointments = await sql`
    UPDATE "Appointment"
    SET "patientId" = 'PTN-' || SPLIT_PART("patientId", '-', 2)
    WHERE "patientId" LIKE 'PAT-%'`
  console.log(`Appointment rows updated: ${appointments.length}`)

  const medicals = await sql`
    UPDATE "MedicalHistory"
    SET "patientId" = 'PTN-' || SPLIT_PART("patientId", '-', 2)
    WHERE "patientId" LIKE 'PAT-%'`
  console.log(`MedicalHistory rows updated: ${medicals.length}`)

  const queues = await sql`
    UPDATE "WalkInQueue"
    SET "patientId" = 'PTN-' || SPLIT_PART("patientId", '-', 2)
    WHERE "patientId" LIKE 'PAT-%'`
  console.log(`WalkInQueue rows updated: ${queues.length}`)

  const all = await sql`SELECT "patientid" FROM "Patient" ORDER BY "patientid"`
  console.log(`Current patient IDs: ${all.map((p) => p.patientid).join(', ')}`)

  // Verify nothing is left behind.
  const remaining = await sql`
    SELECT
      (SELECT COUNT(*) FROM "Patient" WHERE "patientid" LIKE 'PAT-%') +
      (SELECT COUNT(*) FROM "Appointment" WHERE "patientId" LIKE 'PAT-%') +
      (SELECT COUNT(*) FROM "MedicalHistory" WHERE "patientId" LIKE 'PAT-%') +
      (SELECT COUNT(*) FROM "WalkInQueue" WHERE "patientId" LIKE 'PAT-%') AS remaining`
  console.log(`Remaining PAT- rows: ${remaining[0].remaining}`)
}
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
