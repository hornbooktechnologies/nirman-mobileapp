-- Read-only preflight for migration 026_wage_batch_cancellation.sql.

SELECT
  COUNT(*) AS wage_batch_count,
  SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS existing_cancelled_batches
FROM wage_batches;

SELECT
  COUNT(*) AS kharchi_allocation_count,
  COUNT(DISTINCT wage_batch_id) AS wage_batches_with_kharchi_allocations
FROM kharchi_deduction_allocations;

SELECT r.name AS role_name,
       SUM(CASE WHEN p.resource = 'wages' AND p.action = 'cancel' THEN 1 ELSE 0 END) AS existing_cancel_grants
FROM `role` r
LEFT JOIN permission p ON p.roleId = r.id
WHERE r.name IN ('Organization Owner', 'Builder Admin', 'Independent Contractor Owner')
GROUP BY r.id, r.name;
