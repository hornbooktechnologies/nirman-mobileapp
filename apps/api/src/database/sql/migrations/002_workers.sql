-- Workers / Labour Management.
-- Approved contract: docs/modules/construction/workers/CONTRACT.md.
-- Workers are organization-owned records, separate from application users.
-- Offline worker writes, Attendance, Wages, Kharchi, and effective-dated rate history are deferred.

CREATE TABLE IF NOT EXISTS workers (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  worker_code VARCHAR(40) NOT NULL,
  name VARCHAR(160) NOT NULL,
  trade VARCHAR(80) NOT NULL,
  mobile_number VARCHAR(20) NULL,
  notes TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  deactivated_at DATETIME(3) NULL,
  deactivated_by VARCHAR(36) NULL,
  client_created_id VARCHAR(80) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workers_organization_worker_code (organization_id, worker_code),
  UNIQUE KEY uq_workers_id_organization (id, organization_id),
  KEY idx_workers_organization_status (organization_id, status),
  KEY idx_workers_organization_name (organization_id, name),
  KEY idx_workers_organization_mobile (organization_id, mobile_number),
  KEY idx_workers_created_by (created_by),
  KEY idx_workers_updated_by (updated_by),
  KEY idx_workers_deactivated_by (deactivated_by),
  CONSTRAINT fk_workers_organization_id
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_workers_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_workers_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_workers_deactivated_by
    FOREIGN KEY (deactivated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS worker_project_assignments (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  worker_id VARCHAR(36) NOT NULL,
  role_label VARCHAR(120) NULL,
  daily_rate DECIMAL(12, 2) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
  starts_on DATE NOT NULL,
  ends_on DATE NULL,
  created_by VARCHAR(36) NULL,
  updated_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  ended_at DATETIME(3) NULL,
  ended_by VARCHAR(36) NULL,
  client_created_id VARCHAR(80) NULL,
  PRIMARY KEY (id),
  KEY idx_worker_assignments_organization_project_status (organization_id, project_id, status),
  KEY idx_worker_assignments_organization_worker_status (organization_id, worker_id, status),
  KEY idx_worker_assignments_project_worker (project_id, worker_id),
  KEY idx_worker_assignments_created_by (created_by),
  KEY idx_worker_assignments_updated_by (updated_by),
  KEY idx_worker_assignments_ended_by (ended_by),
  CONSTRAINT fk_worker_assignments_organization_id
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_worker_assignments_project_organization
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_worker_assignments_worker_organization
    FOREIGN KEY (worker_id, organization_id) REFERENCES workers(id, organization_id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_worker_assignments_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_worker_assignments_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_worker_assignments_ended_by
    FOREIGN KEY (ended_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
