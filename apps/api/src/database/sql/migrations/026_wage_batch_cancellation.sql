-- Audit-safe Wage batch cancellation and Kharchi allocation release.
-- Contract: docs/modules/construction/wages/CONTRACTS.md

ALTER TABLE wage_batches
  ADD COLUMN cancellation_reason VARCHAR(500) NULL AFTER cancelled_at;

CREATE TABLE IF NOT EXISTS kharchi_deduction_allocation_reversals (
  id VARCHAR(36) NOT NULL,
  allocation_id VARCHAR(36) NOT NULL,
  wage_batch_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  reversed_by VARCHAR(36) NOT NULL,
  reversed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_kharchi_allocation_reversal (allocation_id),
  KEY idx_kharchi_reversals_batch (wage_batch_id, reversed_at),
  KEY idx_kharchi_reversals_scope (organization_id, project_id, reversed_at),
  KEY idx_kharchi_reversals_actor (reversed_by),
  CONSTRAINT fk_kharchi_reversals_allocation
    FOREIGN KEY (allocation_id) REFERENCES kharchi_deduction_allocations(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_kharchi_reversals_batch
    FOREIGN KEY (wage_batch_id) REFERENCES wage_batches(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_reversals_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_kharchi_reversals_actor
    FOREIGN KEY (reversed_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), 'wages', 'cancel', r.id
FROM `role` r
WHERE r.name IN (
  'Organization Owner',
  'Builder Admin',
  'Independent Contractor Owner'
)
AND NOT EXISTS (
  SELECT 1
  FROM permission p
  WHERE p.roleId = r.id
    AND p.resource = 'wages'
    AND p.action = 'cancel'
);
