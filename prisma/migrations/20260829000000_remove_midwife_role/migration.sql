-- Role migration: MIDWIFE/STAFF -> MEDSTAFF (already applied directly to the
-- live database with prisma db execute; kept here for reference/replays).
-- NOTE: new enum values must be committed before use, so the ADD VALUE and
-- UPDATE statements were run as separate transactions.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MEDSTAFF';
ALTER TYPE "StaffRole" ADD VALUE IF NOT EXISTS 'MEDSTAFF';

UPDATE "users" SET role = 'MEDSTAFF' WHERE role IN ('MIDWIFE', 'STAFF');
UPDATE "Staff" SET role = 'MEDSTAFF' WHERE role = 'MIDWIFE';