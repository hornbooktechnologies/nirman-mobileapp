-- Wages and worker payments.
-- MVP contract: generate project wage batches from attendance and record immutable payments.

CREATE TABLE IF NOT EXISTS wage_batches (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
  generated_by VARCHAR(36) NOT NULL,
  confirmed_by VARCHAR(36) NULL,
  confirmed_at DATETIME(3) NULL,
  cancelled_by VARCHAR(36) NULL,
  cancelled_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  active_batch_key VARCHAR(160)
    GENERATED ALWAYS AS (
      IF(
        status <> 'CANCELLED',
        CONCAT(organization_id, ':', project_id, ':', period_start, ':', period_end),
        NULL
      )
    ) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wage_batches_active_period (active_batch_key),
  KEY idx_wage_batches_project_period (organization_id, project_id, period_start, period_end),
  KEY idx_wage_batches_status (organization_id, project_id, status),
  KEY idx_wage_batches_generated_by (generated_by),
  KEY idx_wage_batches_confirmed_by (confirmed_by),
  KEY idx_wage_batches_cancelled_by (cancelled_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wage_items (
  id VARCHAR(36) NOT NULL,
  wage_batch_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  worker_assignment_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  daily_rate DECIMAL(12, 2) NOT NULL,
  present_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
  half_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
  holiday_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
  absent_days DECIMAL(8, 2) NOT NULL DEFAULT 0,
  gross_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  kharchi_deduction DECIMAL(12, 2) NOT NULL DEFAULT 0,
  adjustment_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
  notes TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_wage_items_batch_assignment (wage_batch_id, worker_assignment_id),
  KEY idx_wage_items_project_assignment (organization_id, project_id, worker_assignment_id),
  KEY idx_wage_items_payment_status (wage_batch_id, payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wage_payments (
  id VARCHAR(36) NOT NULL,
  wage_item_id VARCHAR(36) NOT NULL,
  wage_batch_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  reference VARCHAR(120) NULL,
  recorded_by VARCHAR(36) NOT NULL,
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  idempotency_key VARCHAR(120) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wage_payments_idempotency (organization_id, idempotency_key),
  KEY idx_wage_payments_item (wage_item_id),
  KEY idx_wage_payments_batch (wage_batch_id),
  KEY idx_wage_payments_project_date (organization_id, project_id, payment_date),
  KEY idx_wage_payments_recorded_by (recorded_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
