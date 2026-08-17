import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { PermissionKey } from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type {
  DatabaseConnection,
  QueryParam,
} from "../../database/database.types";
import { CreateProjectDto } from "./dto/create-project.dto";
import { QueryProjectDto } from "./dto/query-project.dto";
import type { MemberProjectAssignmentDto } from "./dto/save-member-project-assignments.dto";
import type { ProjectMemberBatchAssignmentDto } from "./dto/save-project-member-assignments.dto";
import { UpdateProjectDto } from "./dto/update-project.dto";
import { UpsertProjectMemberDto } from "./dto/upsert-project-member.dto";
import {
  ProjectEntity,
  ProjectMemberEntity,
  ProjectMemberRow,
  ProjectRow,
  OrganizationProjectAssignmentEntity,
  OrganizationProjectAssignmentRow,
  AssignmentProjectSummary,
} from "./types/projects.types";

function normalizeProjectCode(code?: string | null) {
  const trimmed = code?.trim();
  return trimmed ? trimmed.toUpperCase() : null;
}

function mapProjectRow(row: ProjectRow): ProjectEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    projectCode: row.project_code,
    type: row.type,
    address: {
      line1: row.address_line1,
      line2: row.address_line2,
      city: row.city,
      state: row.state,
      postalCode: row.postal_code,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    status: row.status,
    startDate: row.start_date,
    expectedCompletionDate: row.expected_completion_date,
    description: row.description,
    coverFileId: row.cover_file_id,
    memberCount: Number(row.memberCount ?? 0),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    archivedBy: row.archived_by,
  };
}

function mapProjectMemberRow(
  row: ProjectMemberRow,
  grantedPermissions: PermissionKey[] = [],
): ProjectMemberEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    memberId: row.member_id,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone,
    },
    role: {
      id: row.role_id,
      name: row.role_name,
    },
    roleLabel: row.role_label,
    permissionMode: row.permission_mode,
    grantedPermissions,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOrganizationProjectAssignmentRow(
  row: OrganizationProjectAssignmentRow,
  grantedPermissions: PermissionKey[] = [],
): OrganizationProjectAssignmentEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    memberId: row.member_id,
    project: {
      id: row.project_id,
      name: row.project_name,
      projectCode: row.project_code,
      status: row.project_status,
    },
    roleLabel: row.role_label,
    permissionMode: row.permission_mode,
    grantedPermissions,
    status: row.status,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PermissionGrantRow extends ProjectMemberRow {
  permission_key: PermissionKey;
}

function permissionGrantKey(projectId: string, memberId: string) {
  return `${projectId}:${memberId}`;
}

@Injectable()
export class ProjectsRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(
    organizationId: string,
    dto: CreateProjectDto,
    actorId: string,
    connection?: DatabaseConnection,
  ) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO projects
        (id, organization_id, name, project_code, type, address_line1, address_line2,
          city, state, postal_code, latitude, longitude, status, start_date,
          expected_completion_date, description, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        organizationId,
        dto.name.trim(),
        normalizeProjectCode(dto.projectCode),
        dto.type,
        dto.address?.line1 ?? null,
        dto.address?.line2 ?? null,
        dto.address?.city ?? null,
        dto.address?.state ?? null,
        dto.address?.postalCode ?? null,
        dto.address?.latitude ?? null,
        dto.address?.longitude ?? null,
        dto.status ?? "DRAFT",
        dto.startDate ?? null,
        dto.expectedCompletionDate ?? null,
        dto.description ?? null,
        actorId,
        actorId,
      ],
      connection,
    );
    return this.findById(organizationId, id, connection);
  }

  async findAll(
    organizationId: string,
    query: QueryProjectDto,
    memberId: string,
    organizationWideProjectAccess: boolean,
  ) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const params: QueryParam[] = [organizationId];
    const where = ["p.organization_id = ?"];
    const join = organizationWideProjectAccess
      ? ""
      : "INNER JOIN project_members current_pm ON current_pm.project_id = p.id AND current_pm.organization_id = p.organization_id AND current_pm.member_id = ? AND current_pm.status = 'ACTIVE'";

    if (!organizationWideProjectAccess) params.push(memberId);
    if (query.search) {
      where.push("(p.name LIKE ? OR p.project_code LIKE ? OR p.city LIKE ?)");
      params.push(
        `%${query.search}%`,
        `%${query.search}%`,
        `%${query.search}%`,
      );
    }
    if (query.status) {
      where.push("p.status = ?");
      params.push(query.status);
    }
    if (query.type) {
      where.push("p.type = ?");
      params.push(query.type);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const [rows, totalRows] = await Promise.all([
      this.database.query<ProjectRow>(
        `${this.projectSelectSql()}
        ${join}
        ${whereSql}
        GROUP BY p.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ total: number } & ProjectRow>(
        `SELECT COUNT(DISTINCT p.id) AS total
        FROM projects p
        ${join}
        ${whereSql}`,
        params,
      ),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    return {
      data: rows.map(mapProjectRow),
      meta: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(
    organizationId: string,
    projectId: string,
    connection?: DatabaseConnection,
  ) {
    const rows = await this.database.query<ProjectRow>(
      `${this.projectSelectSql()}
      WHERE p.organization_id = ? AND p.id = ?
      GROUP BY p.id
      LIMIT 1`,
      [organizationId, projectId],
      connection,
    );
    return rows[0] ? mapProjectRow(rows[0]) : null;
  }

  async findByProjectCode(
    organizationId: string,
    projectCode: string,
    excludedProjectId?: string,
  ) {
    const params: QueryParam[] = [
      organizationId,
      normalizeProjectCode(projectCode),
    ];
    const excludeSql = excludedProjectId ? "AND id <> ?" : "";
    if (excludedProjectId) params.push(excludedProjectId);
    const rows = await this.database.query<ProjectRow>(
      `SELECT * FROM projects
      WHERE organization_id = ? AND project_code = ? ${excludeSql}
      LIMIT 1`,
      params,
    );
    return rows[0] ? mapProjectRow({ ...rows[0], memberCount: 0 }) : null;
  }

  async update(
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
    actorId: string,
    connection?: DatabaseConnection,
  ) {
    const entries = (
      [
        ["name", dto.name?.trim()],
        [
          "project_code",
          dto.projectCode === undefined
            ? undefined
            : normalizeProjectCode(dto.projectCode),
        ],
        ["type", dto.type],
        ["address_line1", dto.address?.line1],
        ["address_line2", dto.address?.line2],
        ["city", dto.address?.city],
        ["state", dto.address?.state],
        ["postal_code", dto.address?.postalCode],
        ["latitude", dto.address?.latitude],
        ["longitude", dto.address?.longitude],
        ["status", dto.status],
        ["start_date", dto.startDate],
        ["expected_completion_date", dto.expectedCompletionDate],
        ["description", dto.description],
      ] as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      await this.database.execute(
        `UPDATE projects
        SET ${entries.map(([column]) => `${column} = ?`).join(", ")},
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE organization_id = ? AND id = ?`,
        [
          ...entries.map(([, value]) => value),
          actorId,
          organizationId,
          projectId,
        ],
        connection,
      );
    }
    return this.findById(organizationId, projectId, connection);
  }

  async archive(organizationId: string, projectId: string, actorId: string) {
    await this.database.execute(
      `UPDATE projects
      SET status = 'ARCHIVED',
        archived_at = CURRENT_TIMESTAMP(3),
        archived_by = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE organization_id = ? AND id = ?`,
      [actorId, actorId, organizationId, projectId],
    );
    return this.findById(organizationId, projectId);
  }

  async restore(
    organizationId: string,
    projectId: string,
    actorId: string,
    connection?: DatabaseConnection,
  ) {
    await this.database.execute(
      `UPDATE projects
      SET status = 'ACTIVE',
        archived_at = NULL,
        archived_by = NULL,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE organization_id = ? AND id = ?`,
      [actorId, organizationId, projectId],
      connection,
    );
    return this.findById(organizationId, projectId, connection);
  }

  async findProjectMembers(organizationId: string, projectId: string) {
    const rows = await this.database.query<ProjectMemberRow>(
      `${this.projectMemberSelectSql()}
      WHERE pm.organization_id = ? AND pm.project_id = ?
      ORDER BY u.name ASC`,
      [organizationId, projectId],
    );
    const grants = await this.findPermissionGrantMap(
      organizationId,
      projectId,
    );
    return rows.map((row) =>
      mapProjectMemberRow(
        row,
        grants.get(permissionGrantKey(row.project_id, row.member_id)) ?? [],
      ),
    );
  }

  async findOrganizationProjectAssignments(organizationId: string) {
    const rows = await this.database.query<OrganizationProjectAssignmentRow>(
      `SELECT
        pm.id,
        pm.organization_id,
        pm.project_id,
        pm.member_id,
        pm.role_label,
        pm.permission_mode,
        pm.status,
        pm.starts_on,
        pm.ends_on,
        pm.created_at,
        pm.updated_at,
        p.name AS project_name,
        p.project_code,
        p.status AS project_status
      FROM project_members pm
      INNER JOIN projects p
        ON p.id = pm.project_id
        AND p.organization_id = pm.organization_id
      WHERE pm.organization_id = ?
        AND pm.status <> 'ENDED'
      ORDER BY p.name ASC`,
      [organizationId],
    );
    const grants = await this.findPermissionGrantMap(organizationId);
    return rows.map((row) =>
      mapOrganizationProjectAssignmentRow(
        row,
        grants.get(permissionGrantKey(row.project_id, row.member_id)) ?? [],
      ),
    );
  }

  async findAssignmentProjects(
    organizationId: string,
  ): Promise<AssignmentProjectSummary[]> {
    const rows = await this.database.query<ProjectRow>(
      `SELECT p.*
      FROM projects p
      WHERE p.organization_id = ?
      ORDER BY p.name ASC`,
      [organizationId],
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      projectCode: row.project_code,
      status: row.status,
    }));
  }

  async findMemberProjectAssignments(organizationId: string, memberId: string) {
    const rows = await this.database.query<OrganizationProjectAssignmentRow>(
      `SELECT
        pm.id,
        pm.organization_id,
        pm.project_id,
        pm.member_id,
        pm.role_label,
        pm.permission_mode,
        pm.status,
        pm.starts_on,
        pm.ends_on,
        pm.created_at,
        pm.updated_at,
        p.name AS project_name,
        p.project_code,
        p.status AS project_status
      FROM project_members pm
      INNER JOIN projects p
        ON p.id = pm.project_id
        AND p.organization_id = pm.organization_id
      WHERE pm.organization_id = ?
        AND pm.member_id = ?
        AND pm.status <> 'ENDED'
      ORDER BY p.name ASC`,
      [organizationId, memberId],
    );
    const grants = await this.findPermissionGrantMap(
      organizationId,
      undefined,
      memberId,
    );
    return rows.map((row) =>
      mapOrganizationProjectAssignmentRow(
        row,
        grants.get(permissionGrantKey(row.project_id, row.member_id)) ?? [],
      ),
    );
  }

  async findProjectsByIds(organizationId: string, projectIds: string[]) {
    if (projectIds.length === 0) return [];
    const rows = await this.database.query<ProjectRow>(
      `${this.projectSelectSql()}
      WHERE p.organization_id = ?
        AND p.id IN (${projectIds.map(() => "?").join(", ")})
      GROUP BY p.id`,
      [organizationId, ...projectIds],
    );
    return rows.map(mapProjectRow);
  }

  async saveMemberProjectAssignments(
    organizationId: string,
    memberId: string,
    assignments: MemberProjectAssignmentDto[],
    unassignProjectIds: string[],
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      for (const assignment of assignments) {
        const existing = await this.findProjectMemberInConnection(
          organizationId,
          assignment.projectId,
          memberId,
          connection,
        );
        if (existing) {
          await this.database.execute(
            `UPDATE project_members
            SET role_label = ?,
              permission_mode = ?,
              status = ?,
              starts_on = ?,
              ends_on = ?,
              ended_at = CASE WHEN ? = 'ENDED' THEN CURRENT_TIMESTAMP(3) ELSE NULL END,
              ended_by = CASE WHEN ? = 'ENDED' THEN ? ELSE NULL END,
              updated_by = ?,
              updated_at = CURRENT_TIMESTAMP(3)
            WHERE organization_id = ? AND project_id = ? AND member_id = ?`,
            [
              assignment.roleLabel ?? null,
              assignment.permissionMode ?? "ROLE_DEFAULT",
              assignment.status ?? "ACTIVE",
              assignment.startsOn ?? null,
              assignment.endsOn ?? null,
              assignment.status ?? "ACTIVE",
              assignment.status ?? "ACTIVE",
              actorId,
              actorId,
              organizationId,
              assignment.projectId,
              memberId,
            ],
            connection,
          );
        } else {
          await this.database.execute(
            `INSERT INTO project_members
              (id, organization_id, project_id, member_id, role_label, permission_mode, status,
                starts_on, ends_on, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              randomUUID(),
              organizationId,
              assignment.projectId,
              memberId,
              assignment.roleLabel ?? null,
              assignment.permissionMode ?? "ROLE_DEFAULT",
              assignment.status ?? "ACTIVE",
              assignment.startsOn ?? null,
              assignment.endsOn ?? null,
              actorId,
              actorId,
            ],
            connection,
          );
        }
        await this.replacePermissionGrants(
          organizationId,
          assignment.projectId,
          memberId,
          assignment.permissionMode ?? "ROLE_DEFAULT",
          assignment.permissions ?? [],
          actorId,
          connection,
        );
      }

      if (unassignProjectIds.length > 0) {
        await this.database.execute(
          `UPDATE project_members
          SET status = 'ENDED',
            ended_at = CURRENT_TIMESTAMP(3),
            ended_by = ?,
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP(3)
          WHERE organization_id = ?
            AND member_id = ?
            AND project_id IN (${unassignProjectIds.map(() => "?").join(", ")})`,
          [actorId, actorId, organizationId, memberId, ...unassignProjectIds],
          connection,
        );
      }
    });

    return this.findMemberProjectAssignments(organizationId, memberId);
  }

  async findProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
  ) {
    const rows = await this.database.query<ProjectMemberRow>(
      `${this.projectMemberSelectSql()}
      WHERE pm.organization_id = ? AND pm.project_id = ? AND pm.member_id = ?
      LIMIT 1`,
      [organizationId, projectId, memberId],
    );
    if (!rows[0]) return null;
    const grants = await this.findPermissionGrantMap(
      organizationId,
      projectId,
      memberId,
    );
    return mapProjectMemberRow(
      rows[0],
      grants.get(permissionGrantKey(projectId, memberId)) ?? [],
    );
  }

  async saveProjectMemberAssignments(
    organizationId: string,
    projectId: string,
    assignments: ProjectMemberBatchAssignmentDto[],
    unassignMemberIds: string[],
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      for (const assignment of assignments) {
        const existing = await this.findProjectMemberInConnection(
          organizationId,
          projectId,
          assignment.memberId,
          connection,
        );
        if (existing) {
          await this.database.execute(
            `UPDATE project_members
            SET role_label = ?, permission_mode = ?, status = ?, starts_on = ?,
              ends_on = ?, ended_at = NULL, ended_by = NULL, updated_by = ?,
              updated_at = CURRENT_TIMESTAMP(3)
            WHERE organization_id = ? AND project_id = ? AND member_id = ?`,
            [
              assignment.roleLabel ?? null,
              assignment.permissionMode ?? "ROLE_DEFAULT",
              assignment.status ?? "ACTIVE",
              assignment.startsOn ?? null,
              assignment.endsOn ?? null,
              actorId,
              organizationId,
              projectId,
              assignment.memberId,
            ],
            connection,
          );
        } else {
          await this.database.execute(
            `INSERT INTO project_members
              (id, organization_id, project_id, member_id, role_label,
                permission_mode, status, starts_on, ends_on, created_by, updated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              randomUUID(),
              organizationId,
              projectId,
              assignment.memberId,
              assignment.roleLabel ?? null,
              assignment.permissionMode ?? "ROLE_DEFAULT",
              assignment.status ?? "ACTIVE",
              assignment.startsOn ?? null,
              assignment.endsOn ?? null,
              actorId,
              actorId,
            ],
            connection,
          );
        }
        await this.replacePermissionGrants(
          organizationId,
          projectId,
          assignment.memberId,
          assignment.permissionMode ?? "ROLE_DEFAULT",
          assignment.permissions ?? [],
          actorId,
          connection,
        );
      }
      if (unassignMemberIds.length > 0) {
        await this.database.execute(
          `UPDATE project_members
          SET status = 'ENDED', ended_at = CURRENT_TIMESTAMP(3), ended_by = ?,
            updated_by = ?, updated_at = CURRENT_TIMESTAMP(3)
          WHERE organization_id = ? AND project_id = ?
            AND member_id IN (${unassignMemberIds.map(() => "?").join(", ")})`,
          [actorId, actorId, organizationId, projectId, ...unassignMemberIds],
          connection,
        );
      }
    });
    return this.findProjectMembers(organizationId, projectId);
  }

  async upsertProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    dto: UpsertProjectMemberDto,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      const existing = await this.findProjectMemberInConnection(
        organizationId,
        projectId,
        memberId,
        connection,
      );
      if (existing) {
        await this.database.execute(
          `UPDATE project_members
          SET role_label = ?,
            permission_mode = ?,
            status = ?,
            starts_on = ?,
            ends_on = ?,
            ended_at = CASE WHEN ? = 'ENDED' THEN CURRENT_TIMESTAMP(3) ELSE NULL END,
            ended_by = CASE WHEN ? = 'ENDED' THEN ? ELSE NULL END,
            updated_by = ?,
            updated_at = CURRENT_TIMESTAMP(3)
          WHERE organization_id = ? AND project_id = ? AND member_id = ?`,
          [
            dto.roleLabel ?? null,
            dto.permissionMode ?? "ROLE_DEFAULT",
            dto.status ?? "ACTIVE",
            dto.startsOn ?? null,
            dto.endsOn ?? null,
            dto.status ?? "ACTIVE",
            dto.status ?? "ACTIVE",
            actorId,
            actorId,
            organizationId,
            projectId,
            memberId,
          ],
          connection,
        );
        await this.replacePermissionGrants(
          organizationId,
          projectId,
          memberId,
          dto.permissionMode ?? "ROLE_DEFAULT",
          dto.permissions ?? [],
          actorId,
          connection,
        );
        return;
      }

      await this.database.execute(
        `INSERT INTO project_members
          (id, organization_id, project_id, member_id, role_label, permission_mode, status,
            starts_on, ends_on, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          organizationId,
          projectId,
          memberId,
          dto.roleLabel ?? null,
          dto.permissionMode ?? "ROLE_DEFAULT",
          dto.status ?? "ACTIVE",
          dto.startsOn ?? null,
          dto.endsOn ?? null,
          actorId,
          actorId,
        ],
        connection,
      );
      await this.replacePermissionGrants(
        organizationId,
        projectId,
        memberId,
        dto.permissionMode ?? "ROLE_DEFAULT",
        dto.permissions ?? [],
        actorId,
        connection,
      );
    });
    return this.findProjectMember(organizationId, projectId, memberId);
  }

  async updateProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    dto: UpsertProjectMemberDto,
    actorId: string,
  ) {
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `UPDATE project_members
        SET role_label = ?,
          permission_mode = COALESCE(?, permission_mode),
          status = COALESCE(?, status),
          starts_on = ?,
          ends_on = ?,
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE organization_id = ? AND project_id = ? AND member_id = ?`,
        [
          dto.roleLabel ?? null,
          dto.permissionMode ?? null,
          dto.status ?? null,
          dto.startsOn ?? null,
          dto.endsOn ?? null,
          actorId,
          organizationId,
          projectId,
          memberId,
        ],
        connection,
      );
      if (dto.permissionMode !== undefined || dto.permissions !== undefined) {
        await this.replacePermissionGrants(
          organizationId,
          projectId,
          memberId,
          dto.permissionMode ?? "ROLE_DEFAULT",
          dto.permissions ?? [],
          actorId,
          connection,
        );
      }
    });
    return this.findProjectMember(organizationId, projectId, memberId);
  }

  async unassignProjectMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    actorId: string,
  ) {
    await this.database.execute(
      `UPDATE project_members
      SET status = 'ENDED',
        ended_at = CURRENT_TIMESTAMP(3),
        ended_by = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP(3)
      WHERE organization_id = ? AND project_id = ? AND member_id = ?`,
      [actorId, actorId, organizationId, projectId, memberId],
    );
  }

  private async findProjectMemberInConnection(
    organizationId: string,
    projectId: string,
    memberId: string,
    connection: DatabaseConnection,
  ) {
    const rows = await this.database.query<ProjectMemberRow>(
      `${this.projectMemberSelectSql()}
      WHERE pm.organization_id = ? AND pm.project_id = ? AND pm.member_id = ?
      LIMIT 1`,
      [organizationId, projectId, memberId],
      connection,
    );
    return rows[0] ? mapProjectMemberRow(rows[0]) : null;
  }

  private projectSelectSql() {
    return `SELECT
      p.*,
      COUNT(DISTINCT pm.id) AS memberCount
    FROM projects p
    LEFT JOIN project_members pm
      ON pm.project_id = p.id
      AND pm.organization_id = p.organization_id
      AND pm.status = 'ACTIVE'`;
  }

  private projectMemberSelectSql() {
    return `SELECT
      pm.*,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      r.id AS role_id,
      r.name AS role_name
    FROM project_members pm
    INNER JOIN organization_members om
      ON om.id = pm.member_id
      AND om.organization_id = pm.organization_id
    INNER JOIN \`user\` u ON u.id = om.user_id
    INNER JOIN \`role\` r ON r.id = om.role_id`;
  }

  private async findPermissionGrantMap(
    organizationId: string,
    projectId?: string,
    memberId?: string,
    connection?: DatabaseConnection,
  ) {
    const where = ["organization_id = ?"];
    const params: QueryParam[] = [organizationId];
    if (projectId) {
      where.push("project_id = ?");
      params.push(projectId);
    }
    if (memberId) {
      where.push("member_id = ?");
      params.push(memberId);
    }
    const rows = await this.database.query<PermissionGrantRow>(
      `SELECT project_id, member_id, permission_key
      FROM project_member_permission_grants
      WHERE ${where.join(" AND ")}
      ORDER BY permission_key ASC`,
      params,
      connection,
    );
    const grants = new Map<string, PermissionKey[]>();
    for (const row of rows) {
      const key = permissionGrantKey(row.project_id, row.member_id);
      grants.set(key, [...(grants.get(key) ?? []), row.permission_key]);
    }
    return grants;
  }

  private async replacePermissionGrants(
    organizationId: string,
    projectId: string,
    memberId: string,
    permissionMode: "ROLE_DEFAULT" | "CUSTOM",
    permissions: PermissionKey[],
    actorId: string,
    connection: DatabaseConnection,
  ) {
    await this.database.execute(
      `DELETE FROM project_member_permission_grants
      WHERE organization_id = ? AND project_id = ? AND member_id = ?`,
      [organizationId, projectId, memberId],
      connection,
    );
    if (permissionMode !== "CUSTOM") return;
    for (const permission of permissions) {
      await this.database.execute(
        `INSERT INTO project_member_permission_grants
          (id, organization_id, project_id, member_id, permission_key, created_by)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          randomUUID(),
          organizationId,
          projectId,
          memberId,
          permission,
          actorId,
        ],
        connection,
      );
    }
  }
}
