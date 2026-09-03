-- Preserve server-authoritative conversion snapshots and make booking retries
-- and cancellation restoration independently auditable.

ALTER TABLE sales_bookings
  ADD COLUMN request_fingerprint CHAR(64) NULL AFTER idempotency_key,
  ADD COLUMN lead_source VARCHAR(40) NULL AFTER customer_mobile,
  ADD COLUMN lead_stage_before_booking VARCHAR(40) NULL AFTER lead_source,
  ADD COLUMN unit_status_before_booking VARCHAR(24) NULL AFTER lead_stage_before_booking,
  ADD COLUMN restored_lead_stage VARCHAR(40) NULL AFTER cancellation_reason,
  ADD COLUMN restored_unit_status VARCHAR(24) NULL AFTER restored_lead_stage,
  ADD KEY idx_sales_bookings_project_status_date (
    organization_id,
    project_id,
    status,
    booking_date
  );

UPDATE sales_bookings b
INNER JOIN sales_leads l
  ON l.id = b.lead_id
 AND l.organization_id = b.organization_id
 AND l.project_id = b.project_id
SET b.lead_source = l.source
WHERE b.lead_source IS NULL;

