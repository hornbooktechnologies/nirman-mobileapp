-- Calendar and Attendance exception-model foundation.
-- Approved contracts:
--   docs/modules/calendar/CONTRACT.md
--   docs/modules/attendance/CONTRACT.md
--   docs/modules/construction/workers/CONTRACT.md (primary allocation extension)
--
-- This forward migration preserves attendance_records as legacy history.
-- Run the paired read-only preflight before applying this migration to any
-- explicitly approved target:
--   ../preflight/009_calendar_attendance_exception_model.sql

CREATE TABLE IF NOT EXISTS organization_work_calendars (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  timezone VARCHAR(80) NOT NULL,
  monday_working BOOLEAN NOT NULL,
  tuesday_working BOOLEAN NOT NULL,
  wednesday_working BOOLEAN NOT NULL,
  thursday_working BOOLEAN NOT NULL,
  friday_working BOOLEAN NOT NULL,
  saturday_working BOOLEAN NOT NULL,
  sunday_working BOOLEAN NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_organization_work_calendars_organization (organization_id),
  CONSTRAINT fk_organization_work_calendars_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_organization_work_calendars_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_organization_work_calendars_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS work_calendar_overrides (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  day_type VARCHAR(32) NOT NULL,
  name VARCHAR(160) NOT NULL,
  reason TEXT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'MANUAL',
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  deleted_by VARCHAR(36) NULL,
  PRIMARY KEY (id),
  KEY idx_work_calendar_overrides_scope_range (organization_id, project_id, start_date, end_date, deleted_at),
  KEY idx_work_calendar_overrides_created_by (created_by),
  KEY idx_work_calendar_overrides_updated_by (updated_by),
  KEY idx_work_calendar_overrides_deleted_by (deleted_by),
  CONSTRAINT fk_work_calendar_overrides_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_calendar_overrides_project_organization
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_calendar_overrides_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_calendar_overrides_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_work_calendar_overrides_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_work_calendar_override_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_work_calendar_override_type CHECK (day_type IN ('NON_WORKING', 'SPECIAL_WORKING')),
  CONSTRAINT chk_work_calendar_override_source CHECK (source = 'MANUAL')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_primary_project_periods (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  worker_assignment_id VARCHAR(36) NOT NULL,
  starts_on DATE NOT NULL,
  ends_on DATE NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ended_by VARCHAR(36) NULL,
  ended_at DATETIME(3) NULL,
  PRIMARY KEY (id),
  KEY idx_worker_primary_periods_worker_range (organization_id, worker_id, starts_on, ends_on),
  KEY idx_worker_primary_periods_assignment (worker_assignment_id),
  CONSTRAINT fk_worker_primary_periods_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_worker_primary_periods_worker_organization
    FOREIGN KEY (worker_id, organization_id) REFERENCES workers(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_worker_primary_periods_assignment
    FOREIGN KEY (worker_assignment_id) REFERENCES worker_project_assignments(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_worker_primary_periods_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_worker_primary_periods_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_worker_primary_periods_ended_by
    FOREIGN KEY (ended_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_worker_primary_period_dates CHECK (ends_on IS NULL OR ends_on >= starts_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendance_exceptions (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  worker_assignment_id VARCHAR(36) NOT NULL,
  work_date DATE NOT NULL,
  exception_type VARCHAR(32) NOT NULL,
  duration VARCHAR(32) NOT NULL,
  reason_code VARCHAR(80) NULL,
  notes TEXT NULL,
  recorded_by VARCHAR(36) NOT NULL,
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_by VARCHAR(36) NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deleted_at DATETIME(3) NULL,
  deleted_by VARCHAR(36) NULL,
  active_exception_key TINYINT
    GENERATED ALWAYS AS (
      IF(
        deleted_at IS NULL,
        1,
        NULL
      )
    ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_exceptions_active_worker_date (
    organization_id,
    project_id,
    worker_assignment_id,
    work_date,
    active_exception_key
  ),
  KEY idx_attendance_exceptions_project_date (organization_id, project_id, work_date),
  KEY idx_attendance_exceptions_assignment_date (worker_assignment_id, work_date),
  CONSTRAINT fk_attendance_exceptions_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_exceptions_project_organization
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_exceptions_assignment
    FOREIGN KEY (worker_assignment_id) REFERENCES worker_project_assignments(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_exceptions_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_exceptions_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_attendance_exceptions_deleted_by
    FOREIGN KEY (deleted_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_attendance_exception_type CHECK (exception_type = 'ABSENCE'),
  CONSTRAINT chk_attendance_exception_duration CHECK (duration IN ('FULL_DAY', 'HALF_DAY'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backfill only assignments whose full date window does not overlap another
-- assignment for the same Worker. Conflicts remain absent and are reported by
-- the paired preflight; no Project is guessed.
INSERT INTO worker_primary_project_periods (
  id, organization_id, worker_id, worker_assignment_id, starts_on, ends_on,
  created_by, updated_by, created_at, updated_at
)
SELECT
  UUID(), a.organization_id, a.worker_id, a.id, a.starts_on, a.ends_on,
  COALESCE(a.created_by, a.updated_by), COALESCE(a.updated_by, a.created_by),
  CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM worker_project_assignments a
WHERE COALESCE(a.created_by, a.updated_by) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM worker_project_assignments other
    WHERE other.organization_id = a.organization_id
      AND other.worker_id = a.worker_id
      AND other.id <> a.id
      AND other.starts_on <= COALESCE(a.ends_on, '9999-12-31')
      AND COALESCE(other.ends_on, '9999-12-31') >= a.starts_on
  );

-- Convert only active legacy ABSENT/HALF_DAY rows whose same assignment is an
-- unambiguous primary period for that date. PRESENT creates no row. HOLIDAY is
-- intentionally untouched for explicit owner review.
INSERT INTO attendance_exceptions (
  id, organization_id, project_id, worker_assignment_id, work_date,
  exception_type, duration, reason_code, notes, recorded_by, recorded_at,
  updated_by, updated_at
)
SELECT
  UUID(), ar.organization_id, ar.project_id, ar.worker_assignment_id, ar.work_date,
  'ABSENCE',
  CASE ar.status WHEN 'ABSENT' THEN 'FULL_DAY' ELSE 'HALF_DAY' END,
  'LEGACY_CONVERSION', ar.notes, ar.marked_by, ar.marked_at,
  COALESCE(ar.last_edited_by, ar.marked_by),
  COALESCE(ar.last_edited_at, ar.updated_at, ar.marked_at)
FROM attendance_records ar
INNER JOIN worker_primary_project_periods primary_period
  ON primary_period.organization_id = ar.organization_id
 AND primary_period.worker_assignment_id = ar.worker_assignment_id
 AND primary_period.starts_on <= ar.work_date
 AND (primary_period.ends_on IS NULL OR primary_period.ends_on >= ar.work_date)
WHERE ar.deleted_at IS NULL
  AND ar.status IN ('ABSENT', 'HALF_DAY');

-- Existing owner/admin role templates receive the approved default Calendar
-- permissions. Platform roles are intentionally excluded.
INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), 'work-calendar', calendar_actions.action, r.id
FROM `role` r
JOIN (
  SELECT 'read' AS action
  UNION ALL SELECT 'update-organization'
  UNION ALL SELECT 'update-project'
) calendar_actions
WHERE r.name IN (
  'Organization Owner',
  'Builder Admin',
  'Independent Contractor Owner'
)
AND NOT EXISTS (
  SELECT 1 FROM permission p
  WHERE p.roleId = r.id
    AND p.resource = 'work-calendar'
    AND p.action = calendar_actions.action
);

INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), 'work-calendar', 'read', r.id
FROM `role` r
WHERE r.name IN (
  'Project Manager',
  'Builder Supervisor',
  'Contractor Member',
  'Site Supervisor'
)
AND NOT EXISTS (
  SELECT 1 FROM permission p
  WHERE p.roleId = r.id
    AND p.resource = 'work-calendar'
    AND p.action = 'read'
);
