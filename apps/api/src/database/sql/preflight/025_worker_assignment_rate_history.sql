-- Read-only preflight for migration 025_worker_assignment_rate_history.sql.

SELECT
  COUNT(*) AS assignment_count,
  SUM(CASE WHEN daily_rate IS NULL THEN 1 ELSE 0 END) AS assignments_without_rate,
  SUM(CASE WHEN daily_rate IS NOT NULL THEN 1 ELSE 0 END) AS rate_baselines_to_create
FROM worker_project_assignments;

SELECT
  COUNT(*) AS existing_wage_item_count,
  SUM(CASE WHEN daily_rate < 0 THEN 1 ELSE 0 END) AS invalid_negative_wage_rates
FROM wage_items;

SELECT
  COUNT(*) AS invalid_assignment_rates
FROM worker_project_assignments
WHERE daily_rate < 0;
