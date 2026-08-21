-- Attendance records.
-- Approved contract: docs/modules/attendance/CONTRACT.md.
-- One active record exists per project, worker assignment, and work date.

CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  worker_assignment_id VARCHAR(36) NOT NULL,
  work_date DATE NOT NULL,
  status VARCHAR(32) NOT NULL,
  check_in TIME NULL,
  check_out TIME NULL,
  overtime_hours DECIMAL(8, 2) NULL,
  notes TEXT NULL,
  marked_by VARCHAR(36) NOT NULL,
  marked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  last_edited_by VARCHAR(36) NULL,
  last_edited_at DATETIME(3) NULL,
  sync_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  sync_metadata JSON NULL,
  client_created_id VARCHAR(80) NULL,
  deleted_at DATETIME(3) NULL,
  deleted_by VARCHAR(36) NULL,
    active_record_key VARCHAR(180)
    GENERATED ALWAYS AS (
      IF(
        deleted_at IS NULL,
        CONCAT(organization_id, ':', project_id, ':', worker_assignment_id, ':', work_date),
        NULL
      )
    ) STORED,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_active_worker_date (active_record_key),
  KEY idx_attendance_project_date (organization_id, project_id, work_date),
  KEY idx_attendance_worker_date (worker_assignment_id, work_date),
  KEY idx_attendance_marked_by (marked_by),
  KEY idx_attendance_last_edited_by (last_edited_by),
  KEY idx_attendance_deleted_by (deleted_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
