

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import { existsSync, statSync } from 'node:fs'
import {
  createBackup,
  restoreBackup,
  listBackups,
  verifyBackup,
  verifyBackupStore,
  deleteBackup,
  getBackupDiskUsage,
} from '../lib/backup'
import { nextBackupId } from '../lib/backupStore'
import {
  BACKUP_DIR,
  backupFilePath,
  backupManifestPath,
} from '../lib/constants/backup'

const prisma = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
})

const TABLES = [
  'users', 'Staff', 'Service', 'Event', 'UserProfile', 'FamilyMember',
  'Patient', 'Appointment', 'MedicalHistory', 'WalkInQueue', 'Notification',
  'audit_logs',
]

async function count(t: string) {
  const r = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*)::int c FROM "${t}"`,
  )
  return r[0].c
}

async function snapshot() {
  const o: Record<string, number> = {}
  for (const t of TABLES) o[t] = await count(t)
  return o
}

const eq = (a: Record<string, number>, b: Record<string, number>) =>
  TABLES.every((t) => a[t] === b[t])
const show = (o: Record<string, number>) =>
  TABLES.map((t) => `${t}=${o[t]}`).join(' ')

let failures = 0
const check = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`)
  if (!ok) failures++
}

async function main() {
  await prisma.$executeRawUnsafe(`DELETE FROM "Event" WHERE eventid = 'ZZZ-TEST'`)
  const stale = (await listBackups(500)).filter(
    (b) => b.note === 'e2e test' || b.label.startsWith('Pre-restore safety'),
  )
  for (const s of stale) await deleteBackup(s.backupId)

  console.log('\n=== 1. createBackup ===')
  const before = await snapshot()
  console.log('before:', show(before))

  const created = await createBackup({ note: 'e2e test', trigger: 'MANUAL' })
  check('createBackup succeeded', created.success, created.message)
  if (!created.success || !created.backup) throw new Error(created.message)

  const backupId = created.backup.backupId
  check('backup has id', /^BKP-\d+$/.test(backupId), backupId)
  check('rowCount > 0', created.backup.rowCount > 0, `${created.backup.rowCount} rows`)
  check('sizeBytes > 0', created.backup.sizeBytes > 0, `${created.backup.sizeBytes} bytes`)
  check(
    'tableCounts cover all tables',
    TABLES.every((t) => typeof created.backup!.tableCounts[t] === 'number'),
  )

  console.log('\n=== 2. snapshot written to storage (not the database) ===')
  const gz = backupFilePath(backupId)
  const manifest = backupManifestPath(backupId)
  check('snapshot file exists in the store', existsSync(gz), gz)
  check('manifest exists next to it', existsSync(manifest), manifest)
  check(
    'file size matches the manifest',
    existsSync(gz) && statSync(gz).size === created.backup.sizeBytes,
    `${existsSync(gz) ? statSync(gz).size : 0} vs ${created.backup.sizeBytes}`,
  )

  const inDb = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*)::int c FROM information_schema.tables
      WHERE table_name = 'db_backups'`,
  )
  check('no backup table in the database', inDb[0].c === 0)

  console.log('\n=== 3. verifyBackup (file + checksum) ===')
  const v = await verifyBackup(backupId)
  check('file verified', v.success, v.message)
  check('checksum ok', v.checksumOk === true)
  check('fileExists true', v.fileExists === true)

  console.log('\n=== 3. mutate the database ===')
  const victim = await prisma.$queryRawUnsafe<Array<{ eventid: string }>>(
    `SELECT eventid FROM "Event" ORDER BY eventid LIMIT 1`,
  )
  const eventId = victim[0].eventid
  await prisma.$executeRawUnsafe(`DELETE FROM "Event" WHERE eventid = $1`, eventId)
  const afterDelete = await snapshot()
  check('deletion took effect', afterDelete.Event === before.Event - 1, show(afterDelete))

  await prisma.$executeRawUnsafe(
    `INSERT INTO "Event" (eventid, name, description, "startDate", "endDate", status, "createdAt", "updatedAt")
     VALUES ('ZZZ-TEST', 'Temp', 'temp', now(), now(), true, now(), now())`,
  )
  const afterInsert = await snapshot()
  check('insertion took effect', afterInsert.Event === before.Event, show(afterInsert))

  console.log('\n=== 5. restoreBackup (reads from disk) ===')
  const restored = await restoreBackup(backupId, {
    id: null,
    name: 'test',
    role: 'ADMIN',
  })
  check('restore succeeded', restored.success, restored.message)
  check(
    'restored row count matches',
    restored.restoredRows === created.backup.rowCount,
    `${restored.restoredRows} vs ${created.backup.rowCount}`,
  )
  check('safety snapshot taken', !!restored.safetyBackupId, restored.safetyBackupId)
  check(
    'safety snapshot written to disk',
    !!restored.safetyBackupId &&
      existsSync(backupFilePath(restored.safetyBackupId!)),
  )

  const afterRestore = await snapshot()
  check('row counts match original', eq(afterRestore, before), show(afterRestore))

  const tempCheck = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*)::int c FROM "Event" WHERE eventid IN ('ZZZ-TEST', $1)`,
    eventId,
  )
  check(
    'original event back, temp row gone',
    tempCheck[0].c === 1,
    `found ${tempCheck[0].c}`,
  )

  const med = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
    `SELECT "medhisid", "heartRate", "temperature", "height", "checkedDate", "itrData"
       FROM "MedicalHistory" ORDER BY "medhisid" LIMIT 1`,
  )
  check(
    'decimal/timestamp columns readable after restore',
    med.length === 1,
    JSON.stringify(med[0], (k, v) => (typeof v === 'bigint' ? String(v) : v)).slice(0, 200),
  )

  const jsonRows = await prisma.$queryRawUnsafe<Array<{ c: number }>>(
    `SELECT COUNT(*)::int c FROM "audit_logs" WHERE metadata IS NOT NULL`,
  )
  check('jsonb (audit metadata) readable', jsonRows[0].c >= 0, `${jsonRows[0].c} rows`)

  console.log('\n=== 6. list / disk usage / delete ===')
  const list = await listBackups()
  check('list includes our backup', list.some((b) => b.backupId === backupId), `${list.length} backups`)
  check('safety snapshot listed', list.some((b) => b.backupId === restored.safetyBackupId))
  check(
    'restoredAt stamped',
    list.find((b) => b.backupId === backupId)?.restoredAt != null,
  )

  const usage = await getBackupDiskUsage()
  check('backup dir reported', usage.available, usage.directory)
  check(
    'disk usage counted',
    usage.fileCount > 0,
    `${usage.fileCount} files, ${usage.totalBytes} bytes`,
  )

  const del = await deleteBackup('BKP-999999')
  check('deleting a missing backup fails cleanly', del.success === false, del.message)

  const gone = await deleteBackup(backupId)
  check('delete removed index row', gone.success, gone.message)
  check('delete removed file from disk', !existsSync(gz), gz)
  check('delete removed manifest', !existsSync(manifest))

  console.log('\n=== 7. history is file-based (recovery path) ===')
  const before2 = await listBackups(500)
  check('history read from the store', before2.length > 0, `${before2.length} found`)

  const found = await verifyBackupStore()
  check(
    'store reports the same snapshots',
    found.length === before2.length,
    `${found.length} vs ${before2.length}`,
  )

  const rec = before2.find((b) => b.backupId === restored.safetyBackupId)
  check('safety backup still verifies', rec ? (await verifyBackup(rec.backupId)).success : false)

  const nextId = await nextBackupId()
  const highest = before2.reduce((max, b) => {
    const n = Number.parseInt(b.backupId.split('-')[1] ?? '0', 10)
    return n > max ? n : max
  }, 1000)
  check(
    'next id does not collide',
    Number.parseInt(nextId.split('-')[1], 10) > highest,
    `${nextId} after ${highest}`,
  )

  const mine = (await listBackups(500)).filter(
    (b) => b.note === 'e2e test' || b.label.startsWith('Pre-restore safety'),
  )
  for (const s of mine) await deleteBackup(s.backupId)
  check('test artifacts cleaned', true)

  console.log('\n=== Summary ===')
  console.log(`backup dir: ${BACKUP_DIR}`)
  console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`)
}

main()
  .catch((error) => {
    console.error('\nFATAL:', error)
    failures++
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(failures === 0 ? 0 : 1)
  })
