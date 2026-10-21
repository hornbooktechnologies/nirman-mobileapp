-- Website enquiries contain pre-customer personal data and are restricted to
-- system/platform administrators. Compatibility User Managers must not see it.
DELETE p
FROM permission p
INNER JOIN `role` r ON r.id = p.roleId
WHERE r.name = 'User Manager'
  AND p.resource = 'platform-enquiries'
  AND p.action IN ('read', 'update');
