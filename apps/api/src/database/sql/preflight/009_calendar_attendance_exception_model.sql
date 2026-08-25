-- READ-ONLY preflight for migration 009. This file contains SELECT statements
-- only and must be run against an explicitly approved target before migration.

-- 1. Legacy Attendance counts by status.
SELECT status, COUNT(*) AS record_count
FROM attendance_records
WHERE deleted_at IS NULL
GROUP BY status
ORDER BY status;

-- 2. Worker-level HOLIDAY groups. These are review evidence only; no Calendar
-- override is inferred from them.
SELECT
  ar.organization_id,
  ar.project_id,
  ar.work_date,
  wpa.worker_id,
  COUNT(*) AS holiday_rows,
  GROUP_CONCAT(ar.id ORDER BY ar.id SEPARATOR ',') AS legacy_attendance_ids
FROM attendance_records ar
INNER JOIN worker_project_assignments wpa
  ON wpa.id = ar.worker_assignment_id
 AND wpa.organization_id = ar.organization_id
 AND wpa.project_id = ar.project_id
WHERE ar.deleted_at IS NULL
  AND ar.status = 'HOLIDAY'
GROUP BY ar.organization_id, ar.project_id, ar.work_date, wpa.worker_id
ORDER BY ar.organization_id, ar.project_id, ar.work_date, wpa.worker_id;

-- 3. Overlapping Worker assignment pairs.
SELECT
  a.organization_id,
  a.worker_id,
  a.id AS assignment_id,
  a.project_id,
  a.starts_on,
  a.ends_on,
  other.id AS overlapping_assignment_id,
  other.project_id AS overlapping_project_id,
  other.starts_on AS overlapping_starts_on,
  other.ends_on AS overlapping_ends_on
FROM worker_project_assignments a
INNER JOIN worker_project_assignments other
  ON other.organization_id = a.organization_id
 AND other.worker_id = a.worker_id
 AND other.id > a.id
 AND other.starts_on <= COALESCE(a.ends_on, '9999-12-31')
 AND COALESCE(other.ends_on, '9999-12-31') >= a.starts_on
ORDER BY a.organization_id, a.worker_id, a.starts_on;

-- 4. Primary-period backfill conflicts: every assignment excluded by the safe
-- backfill because another assignment overlaps its date window.
SELECT
  a.organization_id,
  a.worker_id,
  a.id AS assignment_id,
  a.project_id,
  a.starts_on,
  a.ends_on,
  COUNT(DISTINCT other.id) AS overlapping_assignment_count
FROM worker_project_assignments a
INNER JOIN worker_project_assignments other
  ON other.organization_id = a.organization_id
 AND other.worker_id = a.worker_id
 AND other.id <> a.id
 AND other.starts_on <= COALESCE(a.ends_on, '9999-12-31')
 AND COALESCE(other.ends_on, '9999-12-31') >= a.starts_on
GROUP BY a.organization_id, a.worker_id, a.id, a.project_id, a.starts_on, a.ends_on
ORDER BY a.organization_id, a.worker_id, a.starts_on;
