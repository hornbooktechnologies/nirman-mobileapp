import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { DbRow } from '../../database/database.types';

interface PermissionRow extends DbRow {
  resource: string;
  action: string;
}

interface AccessibleProjectRow extends DbRow {
  id: string;
  name: string;
  project_code: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  role_label: string | null;
}

interface ProjectRow extends AccessibleProjectRow {
  organization_id: string;
  type: 'RESIDENTIAL' | 'COMMERCIAL' | 'MIXED' | 'SHED' | 'OTHER';
}

interface ProjectMemberRow extends DbRow {
  id: string;
  role_label: string | null;
}

@Injectable()
export class ProjectAccessRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPermissionsForMemberRole(roleId: string) {
    const rows = await this.database.query<PermissionRow>(
      `SELECT resource, action
      FROM permission
      WHERE roleId = ?
      ORDER BY resource ASC, action ASC`,
      [roleId],
    );
    return rows.map((row) => `${row.resource}:${row.action}`);
  }

  async findAccessibleProjects(
    organizationId: string,
    memberId: string,
    organizationWideProjectAccess: boolean,
  ) {
    const rows = await this.database.query<AccessibleProjectRow>(
      organizationWideProjectAccess
        ? `SELECT p.id, p.name, p.project_code, p.status, NULL AS role_label
          FROM projects p
          WHERE p.organization_id = ?
          ORDER BY FIELD(p.status, 'ACTIVE', 'DRAFT', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'), p.name ASC`
        : `SELECT p.id, p.name, p.project_code, p.status, pm.role_label
          FROM project_members pm
          INNER JOIN projects p ON p.id = pm.project_id AND p.organization_id = pm.organization_id
          WHERE pm.organization_id = ? AND pm.member_id = ? AND pm.status = 'ACTIVE'
          ORDER BY FIELD(p.status, 'ACTIVE', 'DRAFT', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'), p.name ASC`,
      organizationWideProjectAccess ? [organizationId] : [organizationId, memberId],
    );
    return rows;
  }

  async findProjectById(organizationId: string, projectId: string) {
    const rows = await this.database.query<ProjectRow>(
      `SELECT id, organization_id, name, project_code, type, status, NULL AS role_label
      FROM projects
      WHERE organization_id = ? AND id = ?
      LIMIT 1`,
      [organizationId, projectId],
    );
    return rows[0] ?? null;
  }

  async findActiveProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
  ) {
    const rows = await this.database.query<ProjectMemberRow>(
      `SELECT id, role_label
      FROM project_members
      WHERE organization_id = ?
        AND project_id = ?
        AND member_id = ?
        AND status = 'ACTIVE'
      LIMIT 1`,
      [organizationId, projectId, memberId],
    );
    return rows[0] ?? null;
  }
}
