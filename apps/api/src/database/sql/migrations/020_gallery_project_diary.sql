-- Tenant-secured media ownership and chronological Project Gallery diary.
-- Contracts: docs/modules/foundation/files-media/CONTRACTS.md and
-- docs/modules/construction/gallery/CONTRACTS.md

CREATE TABLE IF NOT EXISTS file_assets (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  context_type VARCHAR(64) NOT NULL,
  context_id VARCHAR(36) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  byte_size BIGINT UNSIGNED NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  width INT UNSIGNED NULL,
  height INT UNSIGNED NULL,
  uploaded_by_user_id VARCHAR(36) NOT NULL,
  uploaded_by_member_id VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_file_assets_storage_key (storage_key),
  UNIQUE KEY uq_file_assets_context (organization_id, context_type, context_id),
  UNIQUE KEY uq_file_assets_id_scope (id, organization_id, project_id),
  KEY idx_file_assets_project_created (organization_id, project_id, created_at),
  CONSTRAINT fk_file_assets_project_scope
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_file_assets_uploader_user
    FOREIGN KEY (uploaded_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_file_assets_uploader_member
    FOREIGN KEY (uploaded_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS gallery_entries (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  file_asset_id VARCHAR(36) NOT NULL,
  category VARCHAR(32) NOT NULL,
  stage VARCHAR(32) NULL,
  caption VARCHAR(1000) NULL,
  captured_at DATETIME(3) NOT NULL,
  workflow_mode VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  uploaded_by_user_id VARCHAR(36) NOT NULL,
  uploaded_by_member_id VARCHAR(36) NOT NULL,
  reviewed_by_user_id VARCHAR(36) NULL,
  reviewed_by_member_id VARCHAR(36) NULL,
  reviewed_at DATETIME(3) NULL,
  rejection_reason VARCHAR(500) NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_gallery_entries_id_scope (id, organization_id, project_id),
  UNIQUE KEY uq_gallery_entries_file (file_asset_id),
  UNIQUE KEY uq_gallery_entries_idempotency (organization_id, idempotency_key),
  KEY idx_gallery_project_diary (organization_id, project_id, captured_at, id),
  KEY idx_gallery_project_review (organization_id, project_id, status, captured_at),
  CONSTRAINT fk_gallery_entries_project_scope
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_gallery_entries_file_scope
    FOREIGN KEY (file_asset_id, organization_id, project_id)
    REFERENCES file_assets(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_gallery_entries_uploader_user
    FOREIGN KEY (uploaded_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_gallery_entries_uploader_member
    FOREIGN KEY (uploaded_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_gallery_entries_reviewer_user
    FOREIGN KEY (reviewed_by_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_gallery_entries_reviewer_member
    FOREIGN KEY (reviewed_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_gallery_category CHECK (category IN ('PROGRESS','WORK','MATERIAL_DELIVERY','SAFETY','ISSUE','OTHER')),
  CONSTRAINT chk_gallery_stage CHECK (stage IS NULL OR stage IN ('FOUNDATION','PLINTH','SLAB','BRICKWORK','PLASTERING','ELECTRICAL','PLUMBING','FINISHING','HANDOVER')),
  CONSTRAINT chk_gallery_workflow CHECK (workflow_mode IN ('DIRECT','REVIEW_REQUIRED')),
  CONSTRAINT chk_gallery_status CHECK (status IN ('PENDING','APPROVED','REJECTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
