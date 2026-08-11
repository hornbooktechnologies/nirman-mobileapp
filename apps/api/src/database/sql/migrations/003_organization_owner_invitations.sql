-- Organization Owner onboarding invitations.
-- This migration is additive and must not be executed without explicit target approval.
-- New customer organizations remain DRAFT until their primary Owner accepts the invitation.

CREATE TABLE IF NOT EXISTS invitations (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  membership_id VARCHAR(36) NOT NULL,
  invited_email VARCHAR(190) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  requires_password_setup TINYINT(1) NOT NULL DEFAULT 1,
  expires_at DATETIME(3) NOT NULL,
  accepted_at DATETIME(3) NULL,
  revoked_at DATETIME(3) NULL,
  created_by VARCHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitations_token_hash (token_hash),
  UNIQUE KEY uq_invitations_membership (membership_id),
  KEY idx_invitations_organization_status (organization_id, status),
  KEY idx_invitations_user_status (user_id, status),
  KEY idx_invitations_expires_at (expires_at),
  KEY idx_invitations_created_by (created_by),
  CONSTRAINT fk_invitations_organization_id
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_invitations_user_id
    FOREIGN KEY (user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_invitations_membership_id
    FOREIGN KEY (membership_id) REFERENCES organization_members(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_invitations_created_by
    FOREIGN KEY (created_by) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
