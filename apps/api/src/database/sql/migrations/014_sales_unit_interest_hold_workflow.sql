-- Separate non-exclusive Unit interest from manager-approved exclusive holds.
-- This migration is source-only until explicitly approved for a named target.

CREATE TABLE sales_unit_interests (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  unit_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'INTERESTED',
  notes TEXT NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_unit_interest_lead (unit_id, lead_id),
  KEY idx_sales_unit_interests_unit_status (organization_id, project_id, unit_id, status),
  KEY idx_sales_unit_interests_lead (organization_id, project_id, lead_id),
  CONSTRAINT fk_sales_unit_interests_unit FOREIGN KEY (unit_id, organization_id, project_id)
    REFERENCES sales_units(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_interests_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_interests_created_by FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_interests_updated_by FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sales_unit_interests_status CHECK (status IN ('INTERESTED','HIGH_INTENT','WAITLISTED','SELECTED','WITHDRAWN'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sales_unit_hold_requests (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  unit_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  requested_by VARCHAR(36) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'PENDING',
  request_notes TEXT NULL,
  decision_notes TEXT NULL,
  decided_by VARCHAR(36) NULL,
  decided_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  pending_lead_key TINYINT GENERATED ALWAYS AS (IF(status = 'PENDING', 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_unit_hold_pending_lead (unit_id, lead_id, pending_lead_key),
  KEY idx_sales_unit_hold_queue (organization_id, project_id, unit_id, status, created_at),
  CONSTRAINT fk_sales_unit_hold_requests_unit FOREIGN KEY (unit_id, organization_id, project_id)
    REFERENCES sales_units(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_hold_requests_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_hold_requested_by FOREIGN KEY (requested_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_hold_decided_by FOREIGN KEY (decided_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT chk_sales_unit_hold_status CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE sales_unit_blocks
  ADD COLUMN previous_lead_stage VARCHAR(40) NULL AFTER notes;

INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), 'inventory', action_list.action, r.id
FROM `role` r
JOIN (
  SELECT 'interest' action UNION ALL SELECT 'request-block'
) action_list
WHERE r.name IN ('Organization Owner', 'Builder Admin', 'Independent Contractor Owner', 'Sales User')
  AND NOT EXISTS (
    SELECT 1 FROM permission p
    WHERE p.roleId = r.id AND p.resource = 'inventory' AND p.action = action_list.action
  );

DELETE p
FROM permission p
INNER JOIN `role` r ON r.id = p.roleId
WHERE r.name = 'Sales User' AND p.resource = 'inventory' AND p.action = 'block';
