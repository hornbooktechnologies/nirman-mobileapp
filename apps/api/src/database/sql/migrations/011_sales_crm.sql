-- Sales CRM vertical slice: leads, timeline, follow-ups, site visits,
-- unit inventory/blocking, and booking conversion.
-- Contract: docs/modules/sales/CONTRACT.md

CREATE TABLE IF NOT EXISTS sales_units (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  unit_number VARCHAR(80) NOT NULL,
  unit_type VARCHAR(80) NOT NULL,
  wing_tower VARCHAR(80) NULL,
  floor VARCHAR(40) NULL,
  area_sqft DECIMAL(12,2) NULL,
  facing VARCHAR(80) NULL,
  base_price DECIMAL(15,2) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE',
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_units_project_number (organization_id, project_id, unit_number),
  UNIQUE KEY uq_sales_units_id_scope (id, organization_id, project_id),
  KEY idx_sales_units_project_status (organization_id, project_id, status),
  CONSTRAINT fk_sales_units_project FOREIGN KEY (project_id, organization_id)
    REFERENCES projects(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_units_created_by FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_units_updated_by FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sales_units_status CHECK (status IN ('AVAILABLE','BLOCKED','BOOKED','SOLD','UNAVAILABLE'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_leads (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  primary_mobile VARCHAR(24) NOT NULL,
  alternate_mobile VARCHAR(24) NULL,
  email VARCHAR(190) NULL,
  preferred_unit_type VARCHAR(80) NULL,
  budget_min DECIMAL(15,2) NULL,
  budget_max DECIMAL(15,2) NULL,
  purchase_purpose VARCHAR(120) NULL,
  purchase_timeline VARCHAR(120) NULL,
  source VARCHAR(40) NOT NULL,
  source_detail VARCHAR(255) NULL,
  created_by VARCHAR(36) NOT NULL,
  assigned_to VARCHAR(36) NULL,
  current_stage VARCHAR(40) NOT NULL DEFAULT 'NEW',
  priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
  interested_unit_id VARCHAR(36) NULL,
  lost_reason TEXT NULL,
  converted_at DATETIME(3) NULL,
  converted_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_leads_id_scope (id, organization_id, project_id),
  KEY idx_sales_leads_project_stage (organization_id, project_id, current_stage),
  KEY idx_sales_leads_assignee (organization_id, assigned_to, current_stage),
  KEY idx_sales_leads_mobile (organization_id, primary_mobile),
  CONSTRAINT fk_sales_leads_project FOREIGN KEY (project_id, organization_id)
    REFERENCES projects(id, organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_leads_created_by FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_leads_assigned_to FOREIGN KEY (assigned_to) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_sales_leads_interested_unit FOREIGN KEY (interested_unit_id, organization_id, project_id)
    REFERENCES sales_units(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_leads_converted_by FOREIGN KEY (converted_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sales_leads_priority CHECK (priority IN ('LOW','MEDIUM','HIGH','URGENT'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_lead_assignments (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  assigned_from VARCHAR(36) NULL,
  assigned_to VARCHAR(36) NOT NULL,
  assigned_by VARCHAR(36) NOT NULL,
  assigned_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sales_assignments_lead (organization_id, project_id, lead_id, assigned_at),
  CONSTRAINT fk_sales_assignments_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_assignments_from FOREIGN KEY (assigned_from) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_sales_assignments_to FOREIGN KEY (assigned_to) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_assignments_by FOREIGN KEY (assigned_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_activities (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  activity_type VARCHAR(48) NOT NULL,
  summary VARCHAR(255) NOT NULL,
  details_json JSON NULL,
  actor_id VARCHAR(36) NOT NULL,
  occurred_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sales_activities_lead (organization_id, project_id, lead_id, occurred_at),
  CONSTRAINT fk_sales_activities_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_activities_actor FOREIGN KEY (actor_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_followups (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  assigned_user_id VARCHAR(36) NOT NULL,
  scheduled_at DATETIME(3) NOT NULL,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED',
  outcome TEXT NULL,
  notes TEXT NULL,
  next_follow_up_at DATETIME(3) NULL,
  completed_at DATETIME(3) NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_followups_exact (lead_id, assigned_user_id, scheduled_at, type),
  KEY idx_sales_followups_assignee_due (organization_id, assigned_user_id, status, scheduled_at),
  CONSTRAINT fk_sales_followups_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_followups_assignee FOREIGN KEY (assigned_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_followups_created_by FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_site_visits (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  scheduled_at DATETIME(3) NOT NULL,
  assigned_salesperson VARCHAR(36) NOT NULL,
  attendee_count INT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED',
  customer_feedback TEXT NULL,
  objections_concerns TEXT NULL,
  next_action TEXT NULL,
  completed_at DATETIME(3) NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_sales_site_visits_project_date (organization_id, project_id, scheduled_at),
  KEY idx_sales_site_visits_assignee (organization_id, assigned_salesperson, status, scheduled_at),
  CONSTRAINT fk_sales_site_visits_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_site_visits_assignee FOREIGN KEY (assigned_salesperson) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_site_visits_created_by FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_unit_blocks (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  unit_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  blocked_by VARCHAR(36) NOT NULL,
  blocked_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE',
  notes TEXT NULL,
  active_unit_key TINYINT GENERATED ALWAYS AS (IF(status = 'ACTIVE', 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_unit_blocks_active (unit_id, active_unit_key),
  KEY idx_sales_unit_blocks_expiry (status, expires_at),
  CONSTRAINT fk_sales_unit_blocks_unit FOREIGN KEY (unit_id, organization_id, project_id)
    REFERENCES sales_units(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_blocks_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_unit_blocks_by FOREIGN KEY (blocked_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sales_bookings (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  lead_id VARCHAR(36) NOT NULL,
  unit_id VARCHAR(36) NULL,
  booked_by VARCHAR(36) NOT NULL,
  booking_date DATE NOT NULL,
  customer_name VARCHAR(160) NOT NULL,
  customer_mobile VARCHAR(24) NOT NULL,
  booking_amount DECIMAL(15,2) NULL,
  booking_reference VARCHAR(120) NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'CONFIRMED',
  cancellation_reason TEXT NULL,
  cancelled_by VARCHAR(36) NULL,
  cancelled_at DATETIME(3) NULL,
  active_booking_key TINYINT GENERATED ALWAYS AS (IF(status = 'CONFIRMED', 1, NULL)) STORED,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_sales_bookings_confirmed_lead (lead_id, active_booking_key),
  UNIQUE KEY uq_sales_bookings_idempotency (organization_id, idempotency_key),
  KEY idx_sales_bookings_project_date (organization_id, project_id, booking_date),
  KEY idx_sales_bookings_unit_status (unit_id, status),
  CONSTRAINT fk_sales_bookings_lead FOREIGN KEY (lead_id, organization_id, project_id)
    REFERENCES sales_leads(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_bookings_unit FOREIGN KEY (unit_id, organization_id, project_id)
    REFERENCES sales_units(id, organization_id, project_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_bookings_by FOREIGN KEY (booked_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sales_bookings_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Organization owners/admins receive all Sales permissions. Sales Users receive
-- assigned/self-created operational access only. Platform roles are excluded.
INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), sales_permissions.resource, sales_permissions.action, r.id
FROM `role` r
JOIN (
  SELECT 'leads' resource, 'read-own' action UNION ALL
  SELECT 'leads', 'read-team' UNION ALL SELECT 'leads', 'read-all' UNION ALL
  SELECT 'leads', 'create' UNION ALL SELECT 'leads', 'assign' UNION ALL
  SELECT 'leads', 'reassign' UNION ALL SELECT 'leads', 'update' UNION ALL
  SELECT 'leads', 'convert' UNION ALL SELECT 'followups', 'manage' UNION ALL
  SELECT 'site-visits', 'manage' UNION ALL SELECT 'inventory', 'read' UNION ALL
  SELECT 'inventory', 'manage' UNION ALL SELECT 'inventory', 'block' UNION ALL SELECT 'inventory', 'book' UNION ALL
  SELECT 'sales-reports', 'read'
) sales_permissions
WHERE r.name IN ('Organization Owner', 'Builder Admin', 'Independent Contractor Owner')
  AND NOT EXISTS (
    SELECT 1 FROM permission p WHERE p.roleId = r.id
      AND p.resource = sales_permissions.resource AND p.action = sales_permissions.action
  );

INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), sales_permissions.resource, sales_permissions.action, r.id
FROM `role` r
JOIN (
  SELECT 'leads' resource, 'read-own' action UNION ALL
  SELECT 'leads', 'create' UNION ALL SELECT 'leads', 'update' UNION ALL
  SELECT 'leads', 'convert' UNION ALL SELECT 'followups', 'manage' UNION ALL
  SELECT 'site-visits', 'manage' UNION ALL SELECT 'inventory', 'read' UNION ALL
  SELECT 'inventory', 'block' UNION ALL SELECT 'inventory', 'book'
) sales_permissions
WHERE r.name = 'Sales User'
  AND NOT EXISTS (
    SELECT 1 FROM permission p WHERE p.roleId = r.id
      AND p.resource = sales_permissions.resource AND p.action = sales_permissions.action
  );
