-- Password recovery requests for every NirmanSite user identity.
-- This migration is additive and must not be executed without explicit target approval.
-- Raw recovery tokens and email/IP values are never stored.

CREATE TABLE IF NOT EXISTS password_reset_requests (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NULL,
  email_hash CHAR(64) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  requested_ip_hash CHAR(64) NULL,
  expires_at DATETIME(3) NOT NULL,
  used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_requests_token_hash (token_hash),
  KEY idx_password_reset_requests_email_created (email_hash, created_at),
  KEY idx_password_reset_requests_ip_created (requested_ip_hash, created_at),
  KEY idx_password_reset_requests_user_active (user_id, used_at, expires_at),
  CONSTRAINT fk_password_reset_requests_user_id
    FOREIGN KEY (user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
