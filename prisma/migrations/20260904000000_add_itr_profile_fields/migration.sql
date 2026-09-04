ALTER TABLE "UserProfile"
  ADD COLUMN "bloodType" TEXT,
  ADD COLUMN "religion" TEXT,
  ADD COLUMN "fathersName" TEXT,
  ADD COLUMN "mothersName" TEXT;

ALTER TABLE "FamilyMember"
  ADD COLUMN "bloodType" TEXT,
  ADD COLUMN "religion" TEXT,
  ADD COLUMN "fathersName" TEXT,
  ADD COLUMN "mothersName" TEXT;

ALTER TABLE "Patient"
  ADD COLUMN "bloodType" TEXT,
  ADD COLUMN "religion" TEXT,
  ADD COLUMN "fathersName" TEXT,
  ADD COLUMN "mothersName" TEXT;
