-- Add patient-info columns to FamilyMember so account holders can fill out
-- personal / patient information for each family member (birthdate, sex,
-- address, PhilHealth). These values auto-populate the Individual Treatment
-- Record (ITR) when an appointment is booked for that family member.
--
-- Safe to run on an existing database; idempotent-ish because the columns
-- are simply added if they don't already exist.
-- Run with: psql "$DATABASE_URL" -f prisma/sql/add_family_member_patient_info.sql

BEGIN;

ALTER TABLE "FamilyMember"
  ADD COLUMN IF NOT EXISTS "birthdate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sex" TEXT,
  ADD COLUMN IF NOT EXISTS "houseNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "barangay" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "zipCode" TEXT,
  ADD COLUMN IF NOT EXISTS "philHealthNo" TEXT;

ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "sex" TEXT;

COMMIT;