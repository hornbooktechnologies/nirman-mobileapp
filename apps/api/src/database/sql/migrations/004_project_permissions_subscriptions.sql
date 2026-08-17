-- Project-level permission grants and manually provisioned subscription capacity.
-- Approved by Project Team And Project Permission Grants and Subscription And Capacity contracts.

ALTER TABLE project_members
  ADD COLUMN permission_mode VARCHAR(32) NOT NULL DEFAULT 'ROLE_DEFAULT' AFTER role_label;

CREATE TABLE IF NOT EXISTS project_member_permission_grants (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) NOT NULL,
  permission_key VARCHAR(120) NOT NULL,
  created_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_member_permission_grant (project_id, member_id, permission_key),
  KEY idx_project_permission_grants_member (organization_id, member_id, project_id),
  KEY idx_project_permission_grants_created_by (created_by),
  CONSTRAINT fk_project_permission_grants_assignment
    FOREIGN KEY (project_id, member_id) REFERENCES project_members(project_id, member_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_project_permission_grants_project_organization
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_project_permission_grants_member_organization
    FOREIGN KEY (member_id, organization_id) REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_project_permission_grants_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(36) NOT NULL,
  plan_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  max_active_projects INT UNSIGNED NULL,
  max_active_members INT UNSIGNED NULL,
  storage_limit_bytes BIGINT UNSIGNED NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_subscription_plans_plan_key (plan_key),
  KEY idx_subscription_plans_active (is_active, name),
  CONSTRAINT fk_subscription_plans_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_subscription_plans_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organization_subscriptions (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  plan_id VARCHAR(36) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NULL,
  internal_note TEXT NULL,
  assigned_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_organization_subscriptions_organization (organization_id),
  KEY idx_organization_subscriptions_plan_status (plan_id, status),
  KEY idx_organization_subscriptions_validity (status, starts_at, ends_at),
  KEY idx_organization_subscriptions_assigned_by (assigned_by),
  CONSTRAINT fk_organization_subscriptions_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_organization_subscriptions_plan
    FOREIGN KEY (plan_id) REFERENCES subscription_plans(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_organization_subscriptions_assigned_by
    FOREIGN KEY (assigned_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
