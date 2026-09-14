-- Effective-dated Worker assignment rates and Wage snapshot breakdowns.
-- This migration is additive and must not be executed without explicit target approval.

CREATE TABLE IF NOT EXISTS worker_assignment_rate_periods (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  worker_assignment_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  daily_rate DECIMAL(12, 2) NOT NULL,
  effective_from DATE NOT NULL,
  reason VARCHAR(500) NULL,
  changed_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_worker_assignment_rate_effective (worker_assignment_id, effective_from),
  KEY idx_worker_assignment_rate_lookup (organization_id, project_id, worker_assignment_id, effective_from),
  KEY idx_worker_assignment_rate_worker (organization_id, worker_id, effective_from),
  KEY idx_worker_assignment_rate_changed_by (changed_by),
  CONSTRAINT fk_worker_assignment_rate_assignment
    FOREIGN KEY (worker_assignment_id) REFERENCES worker_project_assignments(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_worker_assignment_rate_changed_by
    FOREIGN KEY (changed_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_worker_assignment_rate_non_negative CHECK (daily_rate >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Existing assignment rate becomes the known baseline from assignment start.
-- Earlier rate changes cannot be reconstructed and must not be guessed.
INSERT INTO worker_assignment_rate_periods (
  id, organization_id, project_id, worker_assignment_id, worker_id,
  daily_rate, effective_from, reason, changed_by, created_at, updated_at
)
SELECT
  UUID(), a.organization_id, a.project_id, a.id, a.worker_id,
  a.daily_rate, a.starts_on, 'Migration baseline',
  COALESCE(a.updated_by, a.created_by), CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM worker_project_assignments a
WHERE a.daily_rate IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM worker_assignment_rate_periods rate_period
    WHERE rate_period.worker_assignment_id = a.id
      AND rate_period.effective_from = a.starts_on
  );

ALTER TABLE wage_items
  ADD COLUMN rate_breakdown JSON NULL AFTER daily_rate;

UPDATE wage_items
SET rate_breakdown = JSON_ARRAY(
  JSON_OBJECT(
    'dailyRate', CAST(daily_rate AS CHAR),
    'presentDays', present_days,
    'halfDays', half_days,
    'absentDays', absent_days,
    'grossAmount', CAST(gross_amount AS CHAR)
  )
)
WHERE rate_breakdown IS NULL;
