-- Backfill permanent Worker deletion for existing organization owner/admin roles.
-- The permission is organization-wide only and is intentionally not granted to
-- project-scoped roles.

INSERT INTO permission (id, resource, action, roleId)
SELECT UUID(), 'workers', 'delete', r.id
FROM `role` r
WHERE r.name IN (
  'Organization Owner',
  'Builder Admin',
  'Independent Contractor Owner'
)
AND NOT EXISTS (
  SELECT 1
  FROM permission p
  WHERE p.roleId = r.id
    AND p.resource = 'workers'
    AND p.action = 'delete'
);
