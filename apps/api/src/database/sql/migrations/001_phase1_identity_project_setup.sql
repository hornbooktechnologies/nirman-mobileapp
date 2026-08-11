-- Phase 1 Slice 2: Identity Access + Project Setup And Assignment.
-- Approved for execution against vishwlt9_nirmansite on 2026-07-31.
-- New NirmanSite tables use plural snake_case names.
-- Inherited compatibility tables keep their current physical names: `user`, `role`, `permission`,
-- `refreshtoken`, and `systemsetting`.
-- `fileasset` relationships are intentionally deferred because active upload runtime currently
-- exposes object storage only and does not confirm a runtime file metadata table.
-- Status, type, coordinate, and date-transition values must be enforced in API service validation
-- until the target MySQL/MariaDB version is confirmed safe for CHECK constraints.

CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  operating_profile VARCHAR(64) NOT NULL DEFAULT 'CUSTOM',
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  logo_file_id VARCHAR(36) NULL,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_organizations_status (status),
  KEY idx_organizations_type_status (type, status),
  KEY idx_organizations_created_by (created_by),
  KEY idx_organizations_updated_by (updated_by),
  KEY idx_organizations_logo_file_id (logo_file_id),
  CONSTRAINT fk_organizations_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_organizations_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_members (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'INVITED',
  designation VARCHAR(120) NULL,
  organization_wide_project_access TINYINT(1) NOT NULL DEFAULT 0,
  joined_at DATETIME(3) NULL,
  invited_by VARCHAR(36) NULL,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_organization_members_organization_user (organization_id, user_id),
  UNIQUE KEY uq_organization_members_id_organization (id, organization_id),
  KEY idx_organization_members_user_status (user_id, status),
  KEY idx_organization_members_organization_status (organization_id, status),
  KEY idx_organization_members_role_status (role_id, status),
  KEY idx_organization_members_invited_by (invited_by),
  KEY idx_organization_members_created_by (created_by),
  KEY idx_organization_members_updated_by (updated_by),
  CONSTRAINT fk_organization_members_organization_id
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_organization_members_user_id
    FOREIGN KEY (user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_organization_members_role_id
    FOREIGN KEY (role_id) REFERENCES `role`(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_organization_members_invited_by
    FOREIGN KEY (invited_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_organization_members_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_organization_members_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  project_code VARCHAR(40) NULL,
  type VARCHAR(32) NOT NULL,
  address_line1 VARCHAR(180) NULL,
  address_line2 VARCHAR(180) NULL,
  city VARCHAR(100) NULL,
  state VARCHAR(100) NULL,
  postal_code VARCHAR(20) NULL,
  latitude DECIMAL(10, 7) NULL,
  longitude DECIMAL(10, 7) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  start_date DATE NULL,
  expected_completion_date DATE NULL,
  description TEXT NULL,
  cover_file_id VARCHAR(36) NULL,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  archived_at DATETIME(3) NULL,
  archived_by VARCHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_projects_organization_project_code (organization_id, project_code),
  UNIQUE KEY uq_projects_id_organization (id, organization_id),
  KEY idx_projects_organization_status (organization_id, status),
  KEY idx_projects_organization_city (organization_id, city),
  KEY idx_projects_organization_type_status (organization_id, type, status),
  KEY idx_projects_cover_file_id (cover_file_id),
  KEY idx_projects_created_by (created_by),
  KEY idx_projects_updated_by (updated_by),
  KEY idx_projects_archived_by (archived_by),
  CONSTRAINT fk_projects_organization_id
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_projects_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_projects_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_projects_archived_by
    FOREIGN KEY (archived_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS project_members (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) NOT NULL,
  role_label VARCHAR(120) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  starts_on DATE NULL,
  ends_on DATE NULL,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  ended_by VARCHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_members_project_member (project_id, member_id),
  KEY idx_project_members_organization_member_status (organization_id, member_id, status),
  KEY idx_project_members_organization_project_status (organization_id, project_id, status),
  KEY idx_project_members_member_status (member_id, status),
  KEY idx_project_members_created_by (created_by),
  KEY idx_project_members_updated_by (updated_by),
  KEY idx_project_members_ended_by (ended_by),
  CONSTRAINT fk_project_members_organization_id
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_project_members_project_organization
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_project_members_member_organization
    FOREIGN KEY (member_id, organization_id) REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_project_members_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_project_members_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_project_members_ended_by
    FOREIGN KEY (ended_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
