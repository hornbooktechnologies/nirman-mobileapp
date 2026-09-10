-- Project-scoped Site Expenses, approval history, and immutable corrections.
-- Technical plan: docs/tasks/expenses-api-technical-plan.md

CREATE TABLE IF NOT EXISTS project_expense_settings (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  workflow_mode VARCHAR(32) NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_expense_settings_id_scope (id, organization_id, project_id),
  UNIQUE KEY uq_project_expense_settings_project (organization_id, project_id),
  CONSTRAINT fk_project_expense_settings_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_expense_settings_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_expense_settings_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_project_expense_settings_mode
    CHECK (workflow_mode IN ('DIRECT','APPROVAL_REQUIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_expense_setting_events (
  id VARCHAR(36) NOT NULL,
  project_expense_setting_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  previous_workflow_mode VARCHAR(32) NULL,
  next_workflow_mode VARCHAR(32) NOT NULL,
  actor_user_id VARCHAR(36) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_expense_setting_events_idempotency (organization_id, idempotency_key),
  KEY idx_project_expense_setting_events_setting_time (project_expense_setting_id, created_at),
  CONSTRAINT fk_project_expense_setting_events_setting
    FOREIGN KEY (project_expense_setting_id, organization_id, project_id)
    REFERENCES project_expense_settings(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_expense_setting_events_actor
    FOREIGN KEY (actor_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_project_expense_setting_events_previous
    CHECK (previous_workflow_mode IS NULL OR previous_workflow_mode IN ('DIRECT','APPROVAL_REQUIRED')),
  CONSTRAINT chk_project_expense_setting_events_next
    CHECK (next_workflow_mode IN ('DIRECT','APPROVAL_REQUIRED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_expenses (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  expense_date DATE NOT NULL,
  category VARCHAR(32) NOT NULL,
  description VARCHAR(1000) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(32) NULL,
  vendor_payee VARCHAR(160) NULL,
  recorded_by_member_id VARCHAR(36) NOT NULL,
  recorded_by_user_id VARCHAR(36) NOT NULL,
  workflow_mode VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  approved_by_user_id VARCHAR(36) NULL,
  approved_by_member_id VARCHAR(36) NULL,
  approved_at DATETIME(3) NULL,
  rejected_by_user_id VARCHAR(36) NULL,
  rejected_by_member_id VARCHAR(36) NULL,
  rejected_at DATETIME(3) NULL,
  rejection_reason VARCHAR(2000) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_expenses_id_scope (id, organization_id, project_id),
  UNIQUE KEY uq_site_expenses_idempotency (organization_id, idempotency_key),
  KEY idx_site_expenses_scope_status (organization_id, project_id, status, expense_date),
  KEY idx_site_expenses_scope_category (organization_id, project_id, category, expense_date),
  KEY idx_site_expenses_recorder (recorded_by_member_id, expense_date),
  CONSTRAINT fk_site_expenses_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_recorder_member
    FOREIGN KEY (recorded_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_recorder_user
    FOREIGN KEY (recorded_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_approved_user
    FOREIGN KEY (approved_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_approved_member
    FOREIGN KEY (approved_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_rejected_user
    FOREIGN KEY (rejected_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_rejected_member
    FOREIGN KEY (rejected_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expenses_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_site_expenses_amount CHECK (amount > 0),
  CONSTRAINT chk_site_expenses_mode
    CHECK (workflow_mode IN ('DIRECT','APPROVAL_REQUIRED')),
  CONSTRAINT chk_site_expenses_status
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','CANCELLED')),
  CONSTRAINT chk_site_expenses_category
    CHECK (category IN ('TRANSPORT','TOOLS','FOOD','SAFETY','ELECTRICAL','MATERIAL_PURCHASE','LABOUR_RELATED','FUEL','MISCELLANEOUS')),
  CONSTRAINT chk_site_expenses_payment
    CHECK (payment_method IS NULL OR payment_method IN ('CASH','UPI','BANK_TRANSFER','CARD','CHEQUE','OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_expense_events (
  id VARCHAR(36) NOT NULL,
  site_expense_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  previous_status VARCHAR(32) NULL,
  next_status VARCHAR(32) NOT NULL,
  comment VARCHAR(2000) NULL,
  actor_user_id VARCHAR(36) NOT NULL,
  actor_member_id VARCHAR(36) NOT NULL,
  metadata JSON NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_expense_events_idempotency (organization_id, idempotency_key),
  KEY idx_site_expense_events_expense_time (site_expense_id, created_at),
  CONSTRAINT fk_site_expense_events_expense
    FOREIGN KEY (site_expense_id, organization_id, project_id)
    REFERENCES site_expenses(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expense_events_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expense_events_actor_member
    FOREIGN KEY (actor_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_site_expense_events_type
    CHECK (event_type IN ('CREATED','UPDATED','SUBMITTED','APPROVED','REJECTED','CANCELLED','ADJUSTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_expense_adjustments (
  id VARCHAR(36) NOT NULL,
  site_expense_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  reason VARCHAR(2000) NOT NULL,
  recorded_by_user_id VARCHAR(36) NOT NULL,
  recorded_by_member_id VARCHAR(36) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_site_expense_adjustments_idempotency (organization_id, idempotency_key),
  KEY idx_site_expense_adjustments_expense_time (site_expense_id, created_at),
  CONSTRAINT fk_site_expense_adjustments_expense
    FOREIGN KEY (site_expense_id, organization_id, project_id)
    REFERENCES site_expenses(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expense_adjustments_user
    FOREIGN KEY (recorded_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_site_expense_adjustments_member
    FOREIGN KEY (recorded_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_site_expense_adjustments_nonzero CHECK (amount <> 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
