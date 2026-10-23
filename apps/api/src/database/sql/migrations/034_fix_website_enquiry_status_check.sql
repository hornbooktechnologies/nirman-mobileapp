-- Migration 030 created a legacy NEW/CONVERTED CHECK constraint. MySQL 5.7
-- parsed but ignored it, while MySQL 8 enforces it. Migration 032 changed the
-- workflow/default to SUBMITTED without replacing that constraint, causing
-- inserts to fail on MySQL 8 deployments.

SET @legacy_enquiry_status_check = (
  SELECT tc.CONSTRAINT_NAME
  FROM information_schema.TABLE_CONSTRAINTS tc
  WHERE tc.CONSTRAINT_SCHEMA = DATABASE()
    AND tc.TABLE_NAME = 'website_enquiries'
    AND tc.CONSTRAINT_TYPE = 'CHECK'
  ORDER BY tc.CONSTRAINT_NAME
  LIMIT 1
);

SET @drop_legacy_enquiry_status_check = IF(
  @legacy_enquiry_status_check IS NULL,
  'SELECT 1',
  CONCAT(
    'ALTER TABLE website_enquiries DROP CHECK `',
    REPLACE(@legacy_enquiry_status_check, '`', '``'),
    '`'
  )
);

PREPARE drop_legacy_enquiry_status_check_statement
  FROM @drop_legacy_enquiry_status_check;
EXECUTE drop_legacy_enquiry_status_check_statement;
DEALLOCATE PREPARE drop_legacy_enquiry_status_check_statement;

ALTER TABLE website_enquiries
  ADD CONSTRAINT chk_website_enquiries_status
  CHECK (status IN (
    'SUBMITTED',
    'CONTACTED',
    'FOLLOW_UP',
    'INTERESTED',
    'NOT_INTERESTED',
    'CREATED'
  ));
