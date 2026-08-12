import { Injectable } from "@nestjs/common";
import {
  ORGANIZATION_ROLE_NAMES_BY_TYPE,
  type OrganizationType,
} from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { DbRow, QueryParam } from "../../database/database.types";
import { UpdateMemberDto } from "./dto/update-member.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import {
  OrganizationEntity,
  OrganizationMemberEntity,
  OrganizationMemberRow,
  OrganizationRow,
} from "./types/organizations.types";

export function mapOrganizationRow(row: OrganizationRow): OrganizationEntity {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    operatingProfile: row.operating_profile,
    timezone: row.timezone,
    currency: row.currency,
    logoFileId: row.logo_file_id,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapOrganizationMemberRow(
  row: OrganizationMemberRow,
): OrganizationMemberEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    roleId: row.role_id,
    status: row.status,
    designation: row.designation,
    organizationWideProjectAccess: Boolean(
      row.organization_wide_project_access,
    ),
    joinedAt: row.joined_at,
    invitedBy: row.invited_by,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    user: row.user_name
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email ?? null,
          phone: row.user_phone ?? null,
          avatar: row.user_avatar ?? null,
        }
      : undefined,
    role: row.role_name
      ? {
          id: row.role_id,
          name: row.role_name,
          description: row.role_description ?? null,
          isSystem: Boolean(row.role_isSystem),
        }
      : undefined,
  };
}

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAll() {
    const rows = await this.database.query<OrganizationRow>(
      "SELECT * FROM organizations ORDER BY name ASC",
    );
    return rows.map(mapOrganizationRow);
  }

  async findAllForUser(userId: string) {
    const rows = await this.database.query<OrganizationRow>(
      `SELECT DISTINCT o.*
      FROM organizations o
      INNER JOIN organization_members om ON om.organization_id = o.id
      WHERE om.user_id = ?
      ORDER BY o.name ASC`,
      [userId],
    );
    return rows.map(mapOrganizationRow);
  }

  async findById(id: string) {
    const rows = await this.database.query<OrganizationRow>(
      "SELECT * FROM organizations WHERE id = ? LIMIT 1",
      [id],
    );
    return rows[0] ? mapOrganizationRow(rows[0]) : null;
  }

  async update(id: string, dto: UpdateOrganizationDto, actorId: string) {
    const entries = (
      [
        ["name", dto.name?.trim()],
        ["status", dto.status],
        ["operating_profile", dto.operatingProfile],
        ["timezone", dto.timezone],
        ["currency", dto.currency],
      ] as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      await this.database.execute(
        `UPDATE organizations
        SET ${entries.map(([column]) => `${column} = ?`).join(", ")},
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ?`,
        [...entries.map(([, value]) => value), actorId, id],
      );
    }
    return this.findById(id);
  }

  async findMembers(organizationId: string) {
    const rows = await this.database.query<OrganizationMemberRow>(
      `${this.memberSelectSql()}
      WHERE om.organization_id = ?
      ORDER BY u.name ASC`,
      [organizationId],
    );
    return rows.map(mapOrganizationMemberRow);
  }

  async findMemberById(organizationId: string, memberId: string) {
    const rows = await this.database.query<OrganizationMemberRow>(
      `${this.memberSelectSql()}
      WHERE om.organization_id = ? AND om.id = ?
      LIMIT 1`,
      [organizationId, memberId],
    );
    return rows[0] ? mapOrganizationMemberRow(rows[0]) : null;
  }

  async findActiveMemberForUser(organizationId: string, userId: string) {
    const rows = await this.database.query<OrganizationMemberRow>(
      `${this.memberSelectSql()}
      WHERE om.organization_id = ? AND om.user_id = ? AND om.status = 'ACTIVE'
      LIMIT 1`,
      [organizationId, userId],
    );
    return rows[0] ? mapOrganizationMemberRow(rows[0]) : null;
  }

  async findMembershipsForUser(userId: string) {
    const rows = await this.database.query<
      OrganizationMemberRow & {
        organization_name: string;
        organization_type: OrganizationRow["type"];
        organization_status: OrganizationRow["status"];
        organization_operating_profile: OrganizationRow["operating_profile"];
        organization_timezone: string;
        organization_currency: string;
        organization_logo_file_id: string | null;
        organization_created_at: Date;
        organization_updated_at: Date;
      }
    >(
      `SELECT
        om.*,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.avatar AS user_avatar,
        r.name AS role_name,
        r.description AS role_description,
        r.isSystem AS role_isSystem,
        o.name AS organization_name,
        o.type AS organization_type,
        o.status AS organization_status,
        o.operating_profile AS organization_operating_profile,
        o.timezone AS organization_timezone,
        o.currency AS organization_currency,
        o.logo_file_id AS organization_logo_file_id,
        o.created_at AS organization_created_at,
        o.updated_at AS organization_updated_at
      FROM organization_members om
      INNER JOIN organizations o ON o.id = om.organization_id
      INNER JOIN \`user\` u ON u.id = om.user_id
      INNER JOIN \`role\` r ON r.id = om.role_id
      WHERE om.user_id = ?
      ORDER BY o.name ASC`,
      [userId],
    );

    return rows.map((row) => ({
      ...mapOrganizationMemberRow(row),
      organization: {
        id: row.organization_id,
        name: row.organization_name,
        type: row.organization_type,
        status: row.organization_status,
        operatingProfile: row.organization_operating_profile,
        timezone: row.organization_timezone,
        currency: row.organization_currency,
        logoFileId: row.organization_logo_file_id,
        createdBy: null,
        updatedBy: null,
        createdAt: row.organization_created_at,
        updatedAt: row.organization_updated_at,
      } satisfies OrganizationEntity,
    }));
  }

  async countActiveOwners(organizationId: string) {
    const rows = await this.database.query<
      { total: number } & OrganizationMemberRow
    >(
      `SELECT COUNT(*) AS total
      FROM organization_members om
      INNER JOIN \`role\` r ON r.id = om.role_id
      WHERE om.organization_id = ?
        AND om.status = 'ACTIVE'
        AND r.name IN (
          'Organization Owner',
          'Independent Contractor Owner',
          'Owner',
          'Admin'
        )`,
      [organizationId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async findRoleById(roleId: string) {
    const rows = await this.database.query<
      DbRow & {
        id: string;
        name: string;
        isSystem: number | boolean;
      }
    >("SELECT id, name, isSystem FROM `role` WHERE id = ? LIMIT 1", [roleId]);
    return rows[0]
      ? {
          id: rows[0].id,
          name: rows[0].name,
          isSystem: Boolean(rows[0].isSystem),
        }
      : null;
  }

  async findOrganizationRoleTemplates(organizationType: OrganizationType) {
    const roleNames = ORGANIZATION_ROLE_NAMES_BY_TYPE[organizationType];
    const rows = await this.database.query<
      DbRow & {
        id: string;
        name: string;
        description: string | null;
        isSystem: number | boolean;
      }
    >(
      `SELECT id, name, description, isSystem
      FROM \`role\`
      WHERE isSystem = 1
        AND name IN (${roleNames.map(() => "?").join(", ")})
      ORDER BY name ASC`,
      [...roleNames],
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isSystem: Boolean(row.isSystem),
    }));
  }

  async updateMember(
    organizationId: string,
    memberId: string,
    dto: UpdateMemberDto,
    actorId: string,
  ) {
    const entries = (
      [
        ["role_id", dto.roleId],
        ["status", dto.status],
        ["designation", dto.designation],
        ["organization_wide_project_access", dto.organizationWideProjectAccess],
      ] as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      await this.database.execute(
        `UPDATE organization_members
        SET ${entries.map(([column]) => `${column} = ?`).join(", ")},
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE organization_id = ? AND id = ?`,
        [
          ...entries.map(([, value]) => value),
          actorId,
          organizationId,
          memberId,
        ],
      );
    }
    return this.findMemberById(organizationId, memberId);
  }

  private memberSelectSql() {
    return `SELECT
      om.*,
      u.name AS user_name,
      u.email AS user_email,
      u.phone AS user_phone,
      u.avatar AS user_avatar,
      r.name AS role_name,
      r.description AS role_description,
      r.isSystem AS role_isSystem
    FROM organization_members om
    INNER JOIN \`user\` u ON u.id = om.user_id
    INNER JOIN \`role\` r ON r.id = om.role_id`;
  }
}
