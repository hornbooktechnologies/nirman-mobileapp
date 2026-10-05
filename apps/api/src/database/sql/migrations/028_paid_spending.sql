-- Additive paid spending; NO historical payment inference. Separately authorized rollout required.

CREATE TABLE IF NOT EXISTS material_purchase_payments (
 id VARCHAR(36) NOT NULL, organization_id VARCHAR(36) NOT NULL, project_id VARCHAR(36) NOT NULL,
 material_purchase_id VARCHAR(36) NOT NULL, material_request_id VARCHAR(36) NOT NULL, amount DECIMAL(14,2) NOT NULL, payment_date DATE NOT NULL,
 payment_method VARCHAR(24) NOT NULL, reference VARCHAR(160) NULL, recorded_by VARCHAR(36) NOT NULL,
 idempotency_key VARCHAR(120) NOT NULL, request_fingerprint CHAR(64) NOT NULL,
 recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(id),
 UNIQUE KEY uq_material_purchase_payments_scope(id, organization_id, project_id),
 UNIQUE KEY uq_material_purchase_payments_retry(organization_id, project_id, idempotency_key),
 KEY idx_material_purchase_payments_date(organization_id, project_id, payment_date),
 KEY idx_material_purchase_payments_source(material_purchase_id),
 FOREIGN KEY (material_purchase_id, material_request_id, organization_id, project_id) REFERENCES material_purchases(id, material_request_id, organization_id, project_id) ON DELETE RESTRICT,
 FOREIGN KEY (recorded_by) REFERENCES `user`(id) ON DELETE RESTRICT,
 CHECK (amount > 0), CHECK (payment_method IN ('CASH','UPI','BANK_TRANSFER','CARD','CHEQUE','OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS material_purchase_payments_voids (
 id VARCHAR(36) NOT NULL, payment_id VARCHAR(36) NOT NULL, organization_id VARCHAR(36) NOT NULL,
 project_id VARCHAR(36) NOT NULL, reason VARCHAR(2000) NOT NULL, voided_by VARCHAR(36) NOT NULL,
 idempotency_key VARCHAR(120) NOT NULL, request_fingerprint CHAR(64) NOT NULL,
 voided_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(id), UNIQUE KEY uq_material_purchase_payments_void(payment_id),
 UNIQUE KEY uq_material_purchase_payments_void_retry(organization_id, project_id, idempotency_key),
 FOREIGN KEY (payment_id, organization_id, project_id) REFERENCES material_purchase_payments(id, organization_id, project_id) ON DELETE RESTRICT,
 FOREIGN KEY (voided_by) REFERENCES `user`(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_expense_payments (
 id VARCHAR(36) NOT NULL, organization_id VARCHAR(36) NOT NULL, project_id VARCHAR(36) NOT NULL,
 site_expense_id VARCHAR(36) NOT NULL, amount DECIMAL(14,2) NOT NULL, payment_date DATE NOT NULL,
 payment_method VARCHAR(24) NOT NULL, reference VARCHAR(160) NULL, recorded_by VARCHAR(36) NOT NULL,
 idempotency_key VARCHAR(120) NOT NULL, request_fingerprint CHAR(64) NOT NULL,
 recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(id),
 UNIQUE KEY uq_site_expense_payments_scope(id, organization_id, project_id),
 UNIQUE KEY uq_site_expense_payments_retry(organization_id, project_id, idempotency_key),
 KEY idx_site_expense_payments_date(organization_id, project_id, payment_date),
 KEY idx_site_expense_payments_source(site_expense_id),
 FOREIGN KEY (site_expense_id, organization_id, project_id) REFERENCES site_expenses(id, organization_id, project_id) ON DELETE RESTRICT,
 FOREIGN KEY (recorded_by) REFERENCES `user`(id) ON DELETE RESTRICT,
 CHECK (amount > 0), CHECK (payment_method IN ('CASH','UPI','BANK_TRANSFER','CARD','CHEQUE','OTHER'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS site_expense_payments_voids (
 id VARCHAR(36) NOT NULL, payment_id VARCHAR(36) NOT NULL, organization_id VARCHAR(36) NOT NULL,
 project_id VARCHAR(36) NOT NULL, reason VARCHAR(2000) NOT NULL, voided_by VARCHAR(36) NOT NULL,
 idempotency_key VARCHAR(120) NOT NULL, request_fingerprint CHAR(64) NOT NULL,
 voided_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY(id), UNIQUE KEY uq_site_expense_payments_void(payment_id),
 UNIQUE KEY uq_site_expense_payments_void_retry(organization_id, project_id, idempotency_key),
 FOREIGN KEY (payment_id, organization_id, project_id) REFERENCES site_expense_payments(id, organization_id, project_id) ON DELETE RESTRICT,
 FOREIGN KEY (voided_by) REFERENCES `user`(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO permission (id, roleId, resource, action) SELECT UUID(), r.id, 'total-expenses', 'read' FROM `role` r WHERE r.name IN ('Organization Owner','Independent Contractor Owner') AND NOT EXISTS (SELECT 1 FROM permission p WHERE p.roleId=r.id AND p.resource='total-expenses' AND p.action='read');

INSERT INTO permission (id, roleId, resource, action) SELECT UUID(), r.id, 'materials', 'mark-paid' FROM `role` r WHERE r.name IN ('Organization Owner','Independent Contractor Owner') AND NOT EXISTS (SELECT 1 FROM permission p WHERE p.roleId=r.id AND p.resource='materials' AND p.action='mark-paid');

INSERT INTO permission (id, roleId, resource, action) SELECT UUID(), r.id, 'materials', 'void-payment' FROM `role` r WHERE r.name IN ('Organization Owner','Independent Contractor Owner') AND NOT EXISTS (SELECT 1 FROM permission p WHERE p.roleId=r.id AND p.resource='materials' AND p.action='void-payment');

INSERT INTO permission (id, roleId, resource, action) SELECT UUID(), r.id, 'expenses', 'mark-paid' FROM `role` r WHERE r.name IN ('Organization Owner','Independent Contractor Owner') AND NOT EXISTS (SELECT 1 FROM permission p WHERE p.roleId=r.id AND p.resource='expenses' AND p.action='mark-paid');

INSERT INTO permission (id, roleId, resource, action) SELECT UUID(), r.id, 'expenses', 'void-payment' FROM `role` r WHERE r.name IN ('Organization Owner','Independent Contractor Owner') AND NOT EXISTS (SELECT 1 FROM permission p WHERE p.roleId=r.id AND p.resource='expenses' AND p.action='void-payment');
