-- Reusable immutable audit persistence for financial and critical workflows.
-- Initial consumer: Kharchi / Worker Advances.

CREATE TABLE IF NOT EXISTS audit_events (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NULL,
  actor_user_id VARCHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(36) NOT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  metadata JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_audit_events_scope_time (organization_id, project_id, created_at),
  KEY idx_audit_events_entity (organization_id, entity_type, entity_id, created_at),
  KEY idx_audit_events_actor (actor_user_id, created_at),
  KEY idx_audit_events_action (organization_id, action, created_at),
  CONSTRAINT fk_audit_events_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_audit_events_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_audit_events_actor
    FOREIGN KEY (actor_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
