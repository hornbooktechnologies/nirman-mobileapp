ALTER TABLE notifications
  ADD COLUMN importance ENUM('NORMAL', 'HIGH', 'URGENT') NOT NULL DEFAULT 'NORMAL' AFTER message;

CREATE TABLE notification_push_devices (
  id VARCHAR(36) NOT NULL,
  organization_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  expo_push_token VARCHAR(255) NOT NULL,
  platform ENUM('ANDROID', 'IOS') NOT NULL,
  locale ENUM('en', 'hi', 'gu') NOT NULL DEFAULT 'en',
  active TINYINT(1) NOT NULL DEFAULT 1,
  last_registered_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_push_device_owner_token (organization_id, user_id, expo_push_token),
  KEY idx_notification_push_devices_delivery (user_id, organization_id, active),
  CONSTRAINT fk_notification_push_devices_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_notification_push_devices_user
    FOREIGN KEY (user_id) REFERENCES `user`(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notification_push_deliveries (
  id VARCHAR(36) NOT NULL,
  notification_id VARCHAR(36) NOT NULL,
  device_id VARCHAR(36) NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'SENT', 'RETRY', 'FAILED') NOT NULL DEFAULT 'PENDING',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  provider_ticket_id VARCHAR(255) NULL,
  last_error VARCHAR(1000) NULL,
  locked_at DATETIME(3) NULL,
  delivered_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_notification_push_delivery (notification_id, device_id),
  KEY idx_notification_push_delivery_queue (status, next_attempt_at, locked_at),
  CONSTRAINT fk_notification_push_deliveries_notification
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_notification_push_deliveries_device
    FOREIGN KEY (device_id) REFERENCES notification_push_devices(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
