-- Project-scoped Sales brochure library, controlled public shares, and RBAC.
-- Contract: docs/modules/sales/brochures/CONTRACTS.md

CREATE TABLE IF NOT EXISTS brochure_assets (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  file_asset_id VARCHAR(36) NOT NULL,
  title VARCHAR(160) NOT NULL,
  description VARCHAR(1000) NULL,
  category VARCHAR(32) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  uploaded_by_user_id VARCHAR(36) NOT NULL,
  uploaded_by_member_id VARCHAR(36) NOT NULL,
  archived_at DATETIME(3) NULL,
  archived_by_user_id VARCHAR(36) NULL,
  deleted_at DATETIME(3) NULL,
  deleted_by_user_id VARCHAR(36) NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_brochure_assets_scope (id, organization_id, project_id),
  UNIQUE KEY uq_brochure_assets_file (file_asset_id),
  UNIQUE KEY uq_brochure_assets_idempotency (organization_id, idempotency_key),
  KEY idx_brochure_assets_library (organization_id, project_id, status, sort_order, created_at),
  CONSTRAINT fk_brochure_assets_project FOREIGN KEY (project_id, organization_id)
    REFERENCES projects(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_assets_file FOREIGN KEY (file_asset_id, organization_id, project_id)
    REFERENCES file_assets(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_assets_uploader FOREIGN KEY (uploaded_by_user_id)
    REFERENCES `user`(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_assets_member FOREIGN KEY (uploaded_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_brochure_asset_category CHECK (category IN ('COMPANY','PROJECT','HOUSE','FLOOR_PLAN','AMENITIES','PRICE_LIST','OTHER')),
  CONSTRAINT chk_brochure_asset_status CHECK (status IN ('ACTIVE','ARCHIVED','DELETED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brochure_shares (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NULL,
  channel VARCHAR(16) NOT NULL,
  recipient_email_normalized VARCHAR(190) NULL,
  recipient_name VARCHAR(160) NULL,
  token_hash CHAR(64) NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
  email_delivery_status VARCHAR(24) NOT NULL DEFAULT 'NOT_APPLICABLE',
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  revoked_by_user_id VARCHAR(36) NULL,
  created_by_user_id VARCHAR(36) NOT NULL,
  created_by_member_id VARCHAR(36) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  last_email_attempt_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_brochure_shares_token (token_hash),
  UNIQUE KEY uq_brochure_shares_idempotency (organization_id, idempotency_key),
  KEY idx_brochure_shares_project (organization_id, project_id, status, created_at),
  KEY idx_brochure_shares_lead (lead_id, created_at),
  KEY idx_brochure_shares_expiry (status, expires_at),
  CONSTRAINT fk_brochure_shares_project FOREIGN KEY (project_id, organization_id)
    REFERENCES projects(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_shares_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_shares_creator FOREIGN KEY (created_by_user_id)
    REFERENCES `user`(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_shares_member FOREIGN KEY (created_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_brochure_share_channel CHECK (channel IN ('EMAIL','OTHER')),
  CONSTRAINT chk_brochure_share_status CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  CONSTRAINT chk_brochure_delivery_status CHECK (email_delivery_status IN ('NOT_APPLICABLE','PENDING','EMAIL_SENT','EMAIL_FAILED','MANUAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brochure_share_assets (
  share_id VARCHAR(36) NOT NULL,
  brochure_asset_id VARCHAR(36) NOT NULL,
  position INT UNSIGNED NOT NULL,
  PRIMARY KEY (share_id, brochure_asset_id),
  UNIQUE KEY uq_brochure_share_position (share_id, position),
  CONSTRAINT fk_brochure_share_assets_share FOREIGN KEY (share_id)
    REFERENCES brochure_shares(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_share_assets_asset FOREIGN KEY (brochure_asset_id)
    REFERENCES brochure_assets(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS brochure_share_events (
  id VARCHAR(36) NOT NULL,
  share_id VARCHAR(36) NOT NULL,
  brochure_asset_id VARCHAR(36) NULL,
  event_type VARCHAR(32) NOT NULL,
  client_metadata JSON NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_brochure_share_events (share_id, occurred_at),
  CONSTRAINT fk_brochure_share_events_share FOREIGN KEY (share_id)
    REFERENCES brochure_shares(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_brochure_share_events_asset FOREIGN KEY (brochure_asset_id)
    REFERENCES brochure_assets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_brochure_share_event_type CHECK (event_type IN ('EMAIL_ACCEPTED','EMAIL_FAILED','LINK_OPENED','ASSET_OPENED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permission (id, roleId, resource, action)
SELECT UUID(), r.id, 'brochures', a.action
FROM `role` r
JOIN (
  SELECT 'read' action UNION ALL SELECT 'upload' UNION ALL SELECT 'manage' UNION ALL SELECT 'share'
) a
WHERE r.name IN ('Organization Owner', 'Builder Admin', 'Independent Contractor Owner')
  AND NOT EXISTS (
    SELECT 1 FROM permission p WHERE p.roleId = r.id AND p.resource = 'brochures' AND p.action = a.action
  );

INSERT INTO permission (id, roleId, resource, action)
SELECT UUID(), r.id, 'brochures', a.action
FROM `role` r
JOIN (SELECT 'read' action UNION ALL SELECT 'upload' UNION ALL SELECT 'share') a
WHERE r.name = 'Sales User'
  AND NOT EXISTS (
    SELECT 1 FROM permission p WHERE p.roleId = r.id AND p.resource = 'brochures' AND p.action = a.action
  );
