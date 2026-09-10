-- Immutable, Project-scoped construction progress history.
-- Contract: docs/modules/construction/progress/CONTRACTS.md

CREATE TABLE IF NOT EXISTS project_progress_updates (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  stage VARCHAR(32) NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  previous_percentage DECIMAL(5,2) NULL,
  update_date DATE NOT NULL,
  notes TEXT NULL,
  updated_by_user_id VARCHAR(36) NOT NULL,
  updated_by_member_id VARCHAR(36) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_progress_id_scope (id, organization_id, project_id),
  UNIQUE KEY uq_project_progress_idempotency (organization_id, idempotency_key),
  KEY idx_project_progress_stage_latest (
    organization_id, project_id, stage, update_date, created_at
  ),
  KEY idx_project_progress_project_latest (
    organization_id, project_id, update_date, created_at
  ),
  KEY idx_project_progress_actor (updated_by_user_id, created_at),
  CONSTRAINT fk_project_progress_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_progress_user
    FOREIGN KEY (updated_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_progress_member
    FOREIGN KEY (updated_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_project_progress_stage
    CHECK (stage IN ('FOUNDATION','PLINTH','SLAB','BRICKWORK','PLASTERING','ELECTRICAL','PLUMBING','FINISHING','HANDOVER')),
  CONSTRAINT chk_project_progress_percentage
    CHECK (percentage >= 0 AND percentage <= 100),
  CONSTRAINT chk_project_progress_previous_percentage
    CHECK (previous_percentage IS NULL OR (previous_percentage >= 0 AND previous_percentage <= 100))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
