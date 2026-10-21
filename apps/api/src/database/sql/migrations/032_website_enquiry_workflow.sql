-- Expand the platform enquiry inbox into a small follow-up workflow.
-- Existing NEW/CONVERTED rows are retained as SUBMITTED/CREATED. The current
-- production database is MySQL 5.7, where the CHECK in migration 030 is parsed
-- but not stored or enforced, so there is no constraint to remove here.

ALTER TABLE website_enquiries
  ADD COLUMN next_follow_up_at DATETIME(3) NULL AFTER status,
  ADD COLUMN admin_notes VARCHAR(2000) NULL AFTER next_follow_up_at,
  ADD COLUMN last_contacted_at DATETIME(3) NULL AFTER admin_notes;

UPDATE website_enquiries SET status = 'SUBMITTED' WHERE status = 'NEW';
UPDATE website_enquiries SET status = 'CREATED' WHERE status = 'CONVERTED';

ALTER TABLE website_enquiries
  MODIFY status VARCHAR(24) NOT NULL DEFAULT 'SUBMITTED',
  ADD KEY idx_website_enquiries_follow_up (next_follow_up_at, status);

CREATE TABLE IF NOT EXISTS website_enquiry_activities (
  id VARCHAR(36) NOT NULL,
  enquiry_id VARCHAR(36) NOT NULL,
  actor_id VARCHAR(36) NOT NULL,
  previous_status VARCHAR(24) NOT NULL,
  status VARCHAR(24) NOT NULL,
  note VARCHAR(2000) NULL,
  follow_up_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_website_enquiry_activities_timeline (enquiry_id, created_at, id),
  CONSTRAINT fk_website_enquiry_activities_enquiry FOREIGN KEY (enquiry_id)
    REFERENCES website_enquiries(id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_website_enquiry_activities_actor FOREIGN KEY (actor_id)
    REFERENCES `user`(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
