-- Backfill Wages RBAC for existing owner/admin role templates.
-- Wages was added after some customer roles may already have been seeded.

INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), 'wages', wage_actions.action, r.id
FROM `role` r
JOIN (
  SELECT 'read' AS action
  UNION ALL SELECT 'generate'
  UNION ALL SELECT 'update'
  UNION ALL SELECT 'mark-paid'
  UNION ALL SELECT 'export'
) wage_actions
WHERE r.name IN (
  'Organization Owner',
  'Builder Admin',
  'Independent Contractor Owner'
)
AND NOT EXISTS (
  SELECT 1
  FROM permission p
  WHERE p.roleId = r.id
    AND p.resource = 'wages'
    AND p.action = wage_actions.action
);
