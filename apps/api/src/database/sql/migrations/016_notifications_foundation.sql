-- Reusable in-app notification persistence.
-- Initial approval-heavy consumer: Materials.

CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NULL,
  user_id VARCHAR(36) NOT NULL,
  type VARCHAR(120) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  reference_type VARCHAR(80) NULL,
  reference_id VARCHAR(36) NULL,
  deep_link VARCHAR(500) NULL,
  metadata JSON NULL,
  dedupe_key VARCHAR(190) NOT NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_notifications_recipient_dedupe (user_id, dedupe_key),
  KEY idx_notifications_recipient_read (organization_id, user_id, read_at, created_at),
  KEY idx_notifications_project_time (organization_id, project_id, created_at),
  KEY idx_notifications_reference (organization_id, reference_type, reference_id),
  CONSTRAINT fk_notifications_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_notifications_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
