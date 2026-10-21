-- Website contact enquiries exist before an organization/project is created.
-- Keep them in a platform-scoped inbox instead of tenant-scoped sales_leads.
CREATE TABLE IF NOT EXISTS website_enquiries (
  id VARCHAR(36) NOT NULL,
  submission_key VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(25) NOT NULL,
  email VARCHAR(150) NOT NULL,
  message VARCHAR(1000) NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'NIRMAN_WEBSITE',
  status VARCHAR(24) NOT NULL DEFAULT 'NEW',
  converted_organization_id VARCHAR(36) NULL,
  converted_by VARCHAR(36) NULL,
  converted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_website_enquiries_submission_key (submission_key),
  KEY idx_website_enquiries_latest (created_at, id),
  KEY idx_website_enquiries_status_latest (status, created_at, id),
  CONSTRAINT fk_website_enquiries_organization FOREIGN KEY (converted_organization_id)
    REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_website_enquiries_converter FOREIGN KEY (converted_by)
    REFERENCES `user`(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CHECK (status IN ('NEW', 'CONVERTED'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permission (id, roleId, resource, action)
SELECT UUID(), r.id, 'platform-enquiries', 'read'
FROM `role` r
WHERE r.name IN ('Platform Super Admin', 'Super Admin', 'User Manager')
  AND NOT EXISTS (
    SELECT 1 FROM permission p
    WHERE p.roleId = r.id AND p.resource = 'platform-enquiries' AND p.action = 'read'
  );

INSERT INTO permission (id, roleId, resource, action)
SELECT UUID(), r.id, 'platform-enquiries', 'update'
FROM `role` r
WHERE r.name IN ('Platform Super Admin', 'Super Admin', 'User Manager')
  AND NOT EXISTS (
    SELECT 1 FROM permission p
    WHERE p.roleId = r.id AND p.resource = 'platform-enquiries' AND p.action = 'update'
  );
