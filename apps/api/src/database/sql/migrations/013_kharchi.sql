-- Kharchi / Worker Advances: direct-paid advances, immutable adjustments,
-- and traceable automatic Wage deduction allocations.
-- Contract: docs/modules/construction/kharchi/CONTRACTS.md

CREATE TABLE IF NOT EXISTS kharchi_advances (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  worker_assignment_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  request_date DATE NOT NULL,
  payment_method VARCHAR(32) NOT NULL,
  payment_reference VARCHAR(120) NULL,
  notes TEXT NULL,
  recorded_by VARCHAR(36) NOT NULL,
  paid_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_kharchi_advances_id_scope (id, organization_id, project_id),
  UNIQUE KEY uq_kharchi_advances_idempotency (organization_id, idempotency_key),
  KEY idx_kharchi_advances_project_date (organization_id, project_id, request_date, created_at),
  KEY idx_kharchi_advances_worker_date (organization_id, project_id, worker_id, request_date, created_at),
  KEY idx_kharchi_advances_assignment (worker_assignment_id),
  KEY idx_kharchi_advances_recorded_by (recorded_by),
  CONSTRAINT fk_kharchi_advances_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_advances_worker
    FOREIGN KEY (worker_id, organization_id) REFERENCES workers(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_advances_assignment
    FOREIGN KEY (worker_assignment_id) REFERENCES worker_project_assignments(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_advances_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_kharchi_advances_amount CHECK (amount > 0),
  CONSTRAINT chk_kharchi_advances_payment_method
    CHECK (payment_method IN ('CASH','UPI','BANK_TRANSFER','OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kharchi_adjustments (
  id VARCHAR(36) NOT NULL,
  kharchi_advance_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  recorded_by VARCHAR(36) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_kharchi_adjustments_idempotency (organization_id, idempotency_key),
  KEY idx_kharchi_adjustments_advance (kharchi_advance_id, created_at),
  KEY idx_kharchi_adjustments_scope (organization_id, project_id, created_at),
  KEY idx_kharchi_adjustments_recorded_by (recorded_by),
  CONSTRAINT fk_kharchi_adjustments_advance
    FOREIGN KEY (kharchi_advance_id, organization_id, project_id)
    REFERENCES kharchi_advances(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_adjustments_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_kharchi_adjustments_amount CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kharchi_deduction_allocations (
  id VARCHAR(36) NOT NULL,
  kharchi_advance_id VARCHAR(36) NOT NULL,
  wage_item_id VARCHAR(36) NOT NULL,
  wage_batch_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  deduction_amount DECIMAL(12,2) NOT NULL,
  deducted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  recorded_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_kharchi_allocation_source_target (kharchi_advance_id, wage_item_id),
  KEY idx_kharchi_allocations_advance (kharchi_advance_id, deducted_at),
  KEY idx_kharchi_allocations_wage_item (wage_item_id),
  KEY idx_kharchi_allocations_wage_batch (wage_batch_id),
  KEY idx_kharchi_allocations_worker (organization_id, project_id, worker_id, deducted_at),
  KEY idx_kharchi_allocations_recorded_by (recorded_by),
  CONSTRAINT fk_kharchi_allocations_advance
    FOREIGN KEY (kharchi_advance_id, organization_id, project_id)
    REFERENCES kharchi_advances(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_allocations_wage_item
    FOREIGN KEY (wage_item_id) REFERENCES wage_items(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_allocations_wage_batch
    FOREIGN KEY (wage_batch_id) REFERENCES wage_batches(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_allocations_worker
    FOREIGN KEY (worker_id, organization_id) REFERENCES workers(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_allocations_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_kharchi_allocations_amount CHECK (deduction_amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
