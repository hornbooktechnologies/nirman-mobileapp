-- Approved 2026-09-22: Owner + explicitly delegated project approvers.
-- Deploy with API writers paused. Historical request snapshots/events are immutable.
CREATE TABLE IF NOT EXISTS project_material_approvers (
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  member_id VARCHAR(36) NOT NULL,
  granted_by VARCHAR(36) NOT NULL,
  granted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (organization_id, project_id, member_id),
  CONSTRAINT fk_material_approver_project FOREIGN KEY (project_id, organization_id)
    REFERENCES projects(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_approver_member FOREIGN KEY (member_id, organization_id)
    REFERENCES organization_members(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_approver_grantor FOREIGN KEY (granted_by)
    REFERENCES `user`(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE project_material_settings ADD COLUMN version INT UNSIGNED NOT NULL DEFAULT 1;

-- Dedicated system provenance: never attribute migration work to a human approver.
CREATE TABLE IF NOT EXISTS material_workflow_migrations (
  material_request_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  previous_status VARCHAR(32) NOT NULL,
  previous_version INT UNSIGNED NOT NULL,
  migrated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (material_request_id),
  CONSTRAINT fk_material_workflow_migration_request
    FOREIGN KEY (material_request_id, organization_id, project_id)
    REFERENCES material_requests(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO material_workflow_migrations
  (material_request_id, organization_id, project_id, previous_status, previous_version)
SELECT id, organization_id, project_id, status, version FROM material_requests
WHERE status = 'PENDING_VERIFICATION';

UPDATE material_requests mr INNER JOIN material_workflow_migrations wm ON wm.material_request_id = mr.id
SET mr.status = 'PENDING_FINAL', mr.version = mr.version + 1,
  mr.last_transition_at = wm.migrated_at, mr.updated_at = wm.migrated_at
WHERE mr.status = 'PENDING_VERIFICATION' AND mr.version = wm.previous_version;

UPDATE project_material_settings SET workflow_mode = 'FINAL_APPROVAL', version = version + 1
WHERE workflow_mode = 'VERIFY_THEN_FINAL';

ALTER TABLE project_material_settings DROP CHECK chk_project_material_settings_mode;
ALTER TABLE project_material_settings ADD CONSTRAINT chk_project_material_settings_mode
  CHECK (workflow_mode IN ('DIRECT', 'FINAL_APPROVAL'));

-- Durable inbox backfill for eligible Owners. Delegates start empty; grants notify
-- newly delegated members about existing pending requests through the normal API.
INSERT INTO notifications (id, organization_id, project_id, user_id, type, title, message, importance,
  reference_type, reference_id, deep_link, metadata, dedupe_key)
SELECT UUID(), mr.organization_id, mr.project_id, om.user_id, 'MATERIAL_FINAL_APPROVAL_REQUIRED',
  'Material approval required', CONCAT(mr.material_name, ' is waiting for final approval.'), 'HIGH',
  'material_request', mr.id, CONCAT('/materials/', mr.id, '?projectId=', mr.project_id),
  JSON_OBJECT('status', 'PENDING_FINAL', 'migration', '027_materials_two_mode_approval'),
  CONCAT('materials-migration-027:', mr.id)
FROM material_workflow_migrations wm
INNER JOIN material_requests mr ON mr.id = wm.material_request_id AND mr.status = 'PENDING_FINAL'
INNER JOIN organizations o ON o.id = mr.organization_id AND o.status = 'ACTIVE'
INNER JOIN organization_members om ON om.organization_id = mr.organization_id AND om.status = 'ACTIVE'
INNER JOIN `user` u ON u.id = om.user_id AND u.isActive = 1
INNER JOIN `role` r ON r.id = om.role_id
LEFT JOIN project_members pm ON pm.organization_id = om.organization_id AND pm.project_id = mr.project_id
  AND pm.member_id = om.id AND pm.status = 'ACTIVE'
  AND (pm.starts_on IS NULL OR pm.starts_on <= CURRENT_DATE)
  AND (pm.ends_on IS NULL OR pm.ends_on >= CURRENT_DATE)
WHERE ((o.type = 'BUILDER' AND r.name = 'Organization Owner') OR
       (o.type = 'CONTRACTOR' AND r.name = 'Independent Contractor Owner'))
  AND om.id <> mr.requested_by_member_id
  AND (om.organization_wide_project_access = 1 OR pm.id IS NOT NULL)
  AND EXISTS (SELECT 1 FROM permission p WHERE p.roleId = om.role_id AND p.resource = 'materials' AND p.action = 'read')
  AND EXISTS (SELECT 1 FROM permission p WHERE p.roleId = om.role_id AND p.resource = 'materials' AND p.action = 'approve-final')
  AND (pm.permission_mode IS NULL OR pm.permission_mode = 'ROLE_DEFAULT' OR (
    EXISTS (SELECT 1 FROM project_member_permission_grants g WHERE g.organization_id = om.organization_id
      AND g.project_id = pm.project_id AND g.member_id = om.id AND g.permission_key = 'materials:read') AND
    EXISTS (SELECT 1 FROM project_member_permission_grants g WHERE g.organization_id = om.organization_id
      AND g.project_id = pm.project_id AND g.member_id = om.id AND g.permission_key = 'materials:approve-final')))
  AND NOT EXISTS (SELECT 1 FROM notifications n WHERE n.user_id = om.user_id
    AND n.dedupe_key = CONCAT('materials-migration-027:', mr.id));

INSERT IGNORE INTO notification_push_deliveries (id, notification_id, device_id)
SELECT UUID(), n.id, d.id FROM notifications n
INNER JOIN notification_push_devices d ON d.organization_id = n.organization_id
  AND d.user_id = n.user_id AND d.active = 1
WHERE n.dedupe_key LIKE 'materials-migration-027:%';

-- Preserve old inbox history but stop queued reminders for the retired stage.
UPDATE notification_push_deliveries pd INNER JOIN notifications n ON n.id = pd.notification_id
INNER JOIN material_workflow_migrations wm ON wm.material_request_id = n.reference_id
SET pd.status = 'FAILED', pd.last_error = 'Verification retired by migration 027', pd.locked_at = NULL
WHERE n.type = 'MATERIAL_VERIFICATION_REQUIRED' AND pd.status IN ('PENDING', 'RETRY', 'PROCESSING');
