-- Project-scoped Materials requests, workflow history, purchases, and deliveries.
-- Technical plan: docs/tasks/materials-api-technical-plan.md

CREATE TABLE IF NOT EXISTS project_material_settings (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  workflow_mode VARCHAR(32) NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_material_settings_project (organization_id, project_id),
  CONSTRAINT fk_project_material_settings_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_material_settings_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_project_material_settings_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_project_material_settings_mode
    CHECK (workflow_mode IN ('DIRECT','FINAL_APPROVAL','VERIFY_THEN_FINAL'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS material_requests (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  material_name VARCHAR(160) NOT NULL,
  category VARCHAR(120) NULL,
  requested_quantity DECIMAL(12,3) NOT NULL,
  unit_of_measure VARCHAR(32) NOT NULL,
  custom_unit_label VARCHAR(80) NULL,
  requested_on DATE NOT NULL,
  required_by_date DATE NULL,
  estimated_cost DECIMAL(14,2) NULL,
  responsible_contractor_member_id VARCHAR(36) NULL,
  requested_by_member_id VARCHAR(36) NOT NULL,
  workflow_mode VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
  notes TEXT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  last_transition_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by VARCHAR(36) NOT NULL,
  updated_by VARCHAR(36) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_material_requests_id_scope (id, organization_id, project_id),
  UNIQUE KEY uq_material_requests_idempotency (organization_id, idempotency_key),
  KEY idx_material_requests_scope_status (organization_id, project_id, status, required_by_date),
  KEY idx_material_requests_scope_requested (organization_id, project_id, requested_on, created_at),
  KEY idx_material_requests_requester (requested_by_member_id, created_at),
  KEY idx_material_requests_responsible (responsible_contractor_member_id, status),
  CONSTRAINT fk_material_requests_project
    FOREIGN KEY (project_id, organization_id) REFERENCES projects(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_requests_requester
    FOREIGN KEY (requested_by_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_requests_responsible
    FOREIGN KEY (responsible_contractor_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_requests_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_requests_updated_by
    FOREIGN KEY (updated_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_material_requests_quantity CHECK (requested_quantity > 0),
  CONSTRAINT chk_material_requests_estimated_cost CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
  CONSTRAINT chk_material_requests_mode
    CHECK (workflow_mode IN ('DIRECT','FINAL_APPROVAL','VERIFY_THEN_FINAL')),
  CONSTRAINT chk_material_requests_status
    CHECK (status IN ('DRAFT','SUBMITTED','PENDING_VERIFICATION','PENDING_FINAL','APPROVED','RETURNED_FOR_CHANGES','REJECTED','ORDERED','PARTIALLY_DELIVERED','DELIVERED','CANCELLED')),
  CONSTRAINT chk_material_requests_unit
    CHECK (unit_of_measure IN ('BAG','KG','TONNE','PIECE','CUBIC_FOOT','CUBIC_METER','SQUARE_FOOT','LITRE','METER','LOAD','OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS material_request_events (
  id VARCHAR(36) NOT NULL,
  material_request_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  previous_status VARCHAR(32) NULL,
  next_status VARCHAR(32) NOT NULL,
  comment VARCHAR(2000) NULL,
  actor_user_id VARCHAR(36) NOT NULL,
  actor_member_id VARCHAR(36) NOT NULL,
  metadata JSON NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_material_events_idempotency (organization_id, idempotency_key),
  KEY idx_material_events_request_time (material_request_id, created_at),
  KEY idx_material_events_actor (actor_user_id, created_at),
  CONSTRAINT fk_material_events_request
    FOREIGN KEY (material_request_id, organization_id, project_id)
    REFERENCES material_requests(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_events_actor_user
    FOREIGN KEY (actor_user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_events_actor_member
    FOREIGN KEY (actor_member_id, organization_id)
    REFERENCES organization_members(id, organization_id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS material_purchases (
  id VARCHAR(36) NOT NULL,
  material_request_id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  ordered_quantity DECIMAL(12,3) NOT NULL,
  vendor_name VARCHAR(160) NULL,
  order_reference VARCHAR(120) NULL,
  unit_cost DECIMAL(14,2) NULL,
  total_cost DECIMAL(14,2) NULL,
  purchased_on DATE NOT NULL,
  notes TEXT NULL,
  recorded_by VARCHAR(36) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_material_purchases_id_scope (id, material_request_id, organization_id, project_id),
  UNIQUE KEY uq_material_purchases_idempotency (organization_id, idempotency_key),
  KEY idx_material_purchases_request_time (material_request_id, purchased_on, created_at),
  CONSTRAINT fk_material_purchases_request
    FOREIGN KEY (material_request_id, organization_id, project_id)
    REFERENCES material_requests(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_purchases_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_material_purchases_quantity CHECK (ordered_quantity > 0),
  CONSTRAINT chk_material_purchases_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0),
  CONSTRAINT chk_material_purchases_total_cost CHECK (total_cost IS NULL OR total_cost >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS material_deliveries (
  id VARCHAR(36) NOT NULL,
  material_request_id VARCHAR(36) NOT NULL,
  material_purchase_id VARCHAR(36) NULL,
  organization_id VARCHAR(36) NOT NULL,
  project_id VARCHAR(36) NOT NULL,
  delivered_quantity DECIMAL(12,3) NOT NULL,
  delivered_on DATE NOT NULL,
  delivery_reference VARCHAR(120) NULL,
  notes TEXT NULL,
  recorded_by VARCHAR(36) NOT NULL,
  idempotency_key VARCHAR(120) NOT NULL,
  request_fingerprint CHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_material_deliveries_idempotency (organization_id, idempotency_key),
  KEY idx_material_deliveries_request_time (material_request_id, delivered_on, created_at),
  KEY idx_material_deliveries_purchase (material_purchase_id, created_at),
  CONSTRAINT fk_material_deliveries_request
    FOREIGN KEY (material_request_id, organization_id, project_id)
    REFERENCES material_requests(id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_deliveries_purchase
    FOREIGN KEY (material_purchase_id, material_request_id, organization_id, project_id)
    REFERENCES material_purchases(id, material_request_id, organization_id, project_id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_material_deliveries_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_material_deliveries_quantity CHECK (delivered_quantity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
