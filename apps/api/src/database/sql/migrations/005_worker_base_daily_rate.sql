-- Worker trade and base daily rate are Worker-master details.
-- Project assignments retain a rate snapshot for historical and future Wages use.

ALTER TABLE workers
  ADD COLUMN base_daily_rate DECIMAL(12,2) NULL AFTER trade;

UPDATE workers w
SET w.base_daily_rate = (
  SELECT wpa.daily_rate
  FROM worker_project_assignments wpa
  WHERE wpa.organization_id = w.organization_id
    AND wpa.worker_id = w.id
    AND wpa.daily_rate IS NOT NULL
  ORDER BY (wpa.status = 'ACTIVE') DESC, wpa.updated_at DESC, wpa.created_at DESC
  LIMIT 1
)
WHERE w.base_daily_rate IS NULL;
