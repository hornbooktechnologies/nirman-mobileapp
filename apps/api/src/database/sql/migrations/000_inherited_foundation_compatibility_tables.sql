-- Inherited foundation compatibility tables required by current mysql2 runtime.
-- These preserve the existing physical names used by repositories and seed:
-- `role`, `permission`, `user`, `refreshtoken`, and `systemsetting`.

CREATE TABLE IF NOT EXISTS `role` (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description TEXT NULL,
  isSystem TINYINT(1) NOT NULL DEFAULT 0,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  createdBy VARCHAR(36) NULL,
  updatedBy VARCHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user` (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(190) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NULL,
  avatar TEXT NULL,
  isActive TINYINT(1) NOT NULL DEFAULT 1,
  roleId VARCHAR(36) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  createdBy VARCHAR(36) NULL,
  updatedBy VARCHAR(36) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_user_email (email),
  KEY idx_user_roleId (roleId),
  KEY idx_user_createdBy (createdBy),
  KEY idx_user_updatedBy (updatedBy),
  CONSTRAINT fk_user_roleId
    FOREIGN KEY (roleId) REFERENCES `role`(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_user_createdBy
    FOREIGN KEY (createdBy) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_user_updatedBy
    FOREIGN KEY (updatedBy) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permission (
  id VARCHAR(36) NOT NULL,
  resource VARCHAR(120) NOT NULL,
  action VARCHAR(120) NOT NULL,
  roleId VARCHAR(36) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_permission_resource_action_role (resource, action, roleId),
  KEY idx_permission_roleId (roleId),
  CONSTRAINT fk_permission_roleId
    FOREIGN KEY (roleId) REFERENCES `role`(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refreshtoken (
  id VARCHAR(36) NOT NULL,
  token VARCHAR(512) NOT NULL,
  userId VARCHAR(36) NOT NULL,
  expiresAt DATETIME(3) NOT NULL,
  createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_refreshtoken_token (token),
  KEY idx_refreshtoken_userId (userId),
  KEY idx_refreshtoken_expiresAt (expiresAt),
  CONSTRAINT fk_refreshtoken_userId
    FOREIGN KEY (userId) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS systemsetting (
  `key` VARCHAR(160) NOT NULL,
  value TEXT NOT NULL,
  updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  updatedBy VARCHAR(36) NULL,
  PRIMARY KEY (`key`),
  KEY idx_systemsetting_updatedBy (updatedBy),
  CONSTRAINT fk_systemsetting_updatedBy
    FOREIGN KEY (updatedBy) REFERENCES `user`(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
