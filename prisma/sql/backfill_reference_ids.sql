-- Backfill human-readable reference IDs (`XXX-####`) for existing rows that
-- still carry UUID primary keys, matching the user id format (USR-####).
-- Numbering starts at 1001 per entity, ordered by creation time.
-- Child foreign keys are remapped so referential integrity is preserved.
-- Safe to re-run only while no formatted rows exist yet (uuid-only tables).

BEGIN;

-- UserProfile -> PRF-####
UPDATE "UserProfile" u
SET "userprofileid" = m.new_id
FROM (
  SELECT "userprofileid" AS old_id,
         'PRF-' || (1000 + ROW_NUMBER() OVER (ORDER BY "createdAt"))::text AS new_id
  FROM "UserProfile"
) m
WHERE u."userprofileid" = m.old_id;

-- FamilyMember -> FAM-####
UPDATE "FamilyMember" f
SET "familymemberid" = m.new_id
FROM (
  SELECT "familymemberid" AS old_id,
         'FAM-' || (1000 + ROW_NUMBER() OVER (ORDER BY "createdAt"))::text AS new_id
  FROM "FamilyMember"
) m
WHERE f."familymemberid" = m.old_id;

-- Service -> SVC-#### (remap Appointment.serviceId)
CREATE TEMP TABLE "_svc_map" AS
SELECT "serviceid" AS old_id,
       'SVC-' || (1000 + ROW_NUMBER() OVER (ORDER BY "createdAt"))::text AS new_id
FROM "Service";

UPDATE "Service" s SET "serviceid" = m.new_id FROM "_svc_map" m WHERE s."serviceid" = m.old_id;
UPDATE "Appointment" a SET "serviceId" = m.new_id FROM "_svc_map" m WHERE a."serviceId" = m.old_id;
DROP TABLE "_svc_map";

-- Event -> EVT-####
UPDATE "Event" e
SET "eventid" = m.new_id
FROM (
  SELECT "eventid" AS old_id,
         'EVT-' || (1000 + ROW_NUMBER() OVER (ORDER BY "startDate"))::text AS new_id
  FROM "Event"
) m
WHERE e."eventid" = m.old_id;

-- Patient -> PAT-#### (remap Appointment.patientId, MedicalHistory.patientId, WalkInQueue.patientId)
CREATE TEMP TABLE "_pat_map" AS
SELECT "patientid" AS old_id,
       'PAT-' || (1000 + ROW_NUMBER() OVER (ORDER BY "createdAt"))::text AS new_id
FROM "Patient";

UPDATE "Patient" p SET "patientid" = m.new_id FROM "_pat_map" m WHERE p."patientid" = m.old_id;
UPDATE "Appointment" a SET "patientId" = m.new_id FROM "_pat_map" m WHERE a."patientId" = m.old_id;
UPDATE "MedicalHistory" mh SET "patientId" = m.new_id FROM "_pat_map" m WHERE mh."patientId" = m.old_id;
UPDATE "WalkInQueue" wq SET "patientId" = m.new_id FROM "_pat_map" m WHERE wq."patientId" = m.old_id;
DROP TABLE "_pat_map";

-- Appointment -> APT-#### (remap MedicalHistory.appointmentId)
CREATE TEMP TABLE "_apt_map" AS
SELECT "appointmentid" AS old_id,
       'APT-' || (1000 + ROW_NUMBER() OVER (ORDER BY "createdAt"))::text AS new_id
FROM "Appointment";

UPDATE "Appointment" ap SET "appointmentid" = m.new_id FROM "_apt_map" m WHERE ap."appointmentid" = m.old_id;
UPDATE "MedicalHistory" mh SET "appointmentId" = m.new_id FROM "_apt_map" m WHERE mh."appointmentId" = m.old_id;
DROP TABLE "_apt_map";

-- MedicalHistory -> MED-####
UPDATE "MedicalHistory" mh
SET "medhisid" = m.new_id
FROM (
  SELECT "medhisid" AS old_id,
         'MED-' || (1000 + ROW_NUMBER() OVER (ORDER BY "createdAt"))::text AS new_id
  FROM "MedicalHistory"
) m
WHERE mh."medhisid" = m.old_id;

-- WalkInQueue -> WIQ-####
UPDATE "WalkInQueue" wq
SET "qid" = m.new_id
FROM (
  SELECT "qid" AS old_id,
         'WIQ-' || (1000 + ROW_NUMBER() OVER (ORDER BY "createdAt"))::text AS new_id
  FROM "WalkInQueue"
) m
WHERE wq."qid" = m.old_id;

COMMIT;