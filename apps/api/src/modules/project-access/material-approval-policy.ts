import type { RowDataPacket } from "mysql2/promise";
import type { PermissionKey } from "@nirman-app/shared";
import type { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";

export interface MaterialApprovalMember extends RowDataPacket {
  memberId: string;
  userId: string;
  name: string;
  roleName: string;
  isOwner: number;
  delegated: number;
  canApprove: number;
}

// One eligibility query for session permissions, actions and notification routing.
// Delegation never grants project access or Materials read access.
export async function findMaterialApprovalMembers(
  database: DatabaseService,
  organizationId: string,
  projectId: string,
  connection?: DatabaseConnection,
) {
  return database.query<MaterialApprovalMember>(
    `SELECT om.id memberId, om.user_id userId, u.name, r.name roleName,
      ((o.type = 'BUILDER' AND r.name = 'Organization Owner') OR
       (o.type = 'CONTRACTOR' AND r.name = 'Independent Contractor Owner')) isOwner,
      (ma.member_id IS NOT NULL) delegated,
      ((ma.member_id IS NOT NULL AND NOT (
        (o.type = 'BUILDER' AND r.name = 'Organization Owner') OR
        (o.type = 'CONTRACTOR' AND r.name = 'Independent Contractor Owner'))) OR (
        ((o.type = 'BUILDER' AND r.name = 'Organization Owner') OR
         (o.type = 'CONTRACTOR' AND r.name = 'Independent Contractor Owner'))
        AND EXISTS (SELECT 1 FROM permission p WHERE p.roleId = om.role_id
          AND p.resource = 'materials' AND p.action = 'approve-final'${connection ? " FOR UPDATE" : ""})
        AND (pm.permission_mode IS NULL OR pm.permission_mode = 'ROLE_DEFAULT' OR EXISTS (
          SELECT 1 FROM project_member_permission_grants g WHERE g.organization_id = om.organization_id
          AND g.project_id = pm.project_id AND g.member_id = om.id AND g.permission_key = 'materials:approve-final'${connection ? " FOR UPDATE" : ""}))
      )) canApprove
     FROM organization_members om
     INNER JOIN organizations o ON o.id = om.organization_id AND o.status = 'ACTIVE'
     INNER JOIN role r ON r.id = om.role_id
     INNER JOIN \`user\` u ON u.id = om.user_id AND u.isActive = 1
     LEFT JOIN project_members pm ON pm.organization_id = om.organization_id
       AND pm.project_id = ? AND pm.member_id = om.id AND pm.status = 'ACTIVE'
       AND (pm.starts_on IS NULL OR pm.starts_on <= CURRENT_DATE)
       AND (pm.ends_on IS NULL OR pm.ends_on >= CURRENT_DATE)
     LEFT JOIN project_material_approvers ma ON ma.organization_id = om.organization_id
       AND ma.project_id = ? AND ma.member_id = om.id
     WHERE om.organization_id = ? AND om.status = 'ACTIVE'
       AND (om.organization_wide_project_access = 1 OR pm.id IS NOT NULL)
       AND EXISTS (SELECT 1 FROM permission p WHERE p.roleId = om.role_id
         AND p.resource = 'materials' AND p.action = 'read'${connection ? " FOR UPDATE" : ""})
       AND (pm.permission_mode IS NULL OR pm.permission_mode = 'ROLE_DEFAULT' OR EXISTS (
         SELECT 1 FROM project_member_permission_grants g WHERE g.organization_id = om.organization_id
         AND g.project_id = pm.project_id AND g.member_id = om.id AND g.permission_key = 'materials:read'${connection ? " FOR UPDATE" : ""}))
     ORDER BY u.name, om.id${connection ? " FOR UPDATE" : ""}`,
    [projectId, projectId, organizationId],
    connection,
  );
}

export function withMaterialApprovalPermissions(
  permissions: readonly PermissionKey[],
  canApprove: boolean,
): PermissionKey[] {
  const result = permissions.filter(
    (p) =>
      p !== "materials:approve-final" &&
      p !== "materials:reject" &&
      p !== "materials:approve-level-1",
  );
  return canApprove
    ? [...result, "materials:approve-final", "materials:reject"]
    : result;
}
