// Diagnostic: dump patient rows with the fields used by the stat cards.
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })
const sql = neon(process.env.DATABASE_URL)

// Backfill: set sex/birthdate on the legacy patient rows that predate the
// fields being saved. Values are placeholders — correct them via Edit.
const updated = await sql`
  UPDATE "Patient"
  SET sex = v.sex, birthdate = v.birthdate::timestamptz
  FROM (VALUES
    ('PTN-1001', 'Female', '2001-11-27'),
    ('PTN-1002', 'Male',   '1990-05-10'),
    ('PTN-1003', 'Female', '1958-03-22')
  ) AS v(patientid, sex, birthdate)
  WHERE "Patient"."patientid" = v.patientid
    AND "Patient".sex IS NULL
  RETURNING "Patient"."patientid", "Patient".sex, "Patient".birthdate`
for (const r of updated) {
  console.log(`Updated ${r.patientid}: ${r.sex}, ${r.birthdate}`)
}
process.exit(0)
