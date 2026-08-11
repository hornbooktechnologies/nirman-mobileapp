import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { QueryParam } from '../../database/database.types';
import { CreateRoleDto } from './dto/create-role.dto';
import { PermissionItemDto } from './dto/set-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PermissionEntity, PermissionRow, RoleEntity, RoleRow } from './roles.types';

function mapRoleRow(row: RoleRow): RoleEntity {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isSystem: Boolean(row.isSystem),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    _count: {
      users: Number(row.userCount ?? 0),
      permissions: Number(row.permissionCount ?? 0),
    },
  };
}

function mapPermissionRow(row: PermissionRow): PermissionEntity {
  return {
    id: row.id,
    resource: row.resource,
    action: row.action,
    roleId: row.roleId,
  };
}

@Injectable()
export class RolesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAll() {
    const rows = await this.database.query<RoleRow>(
      `SELECT
        r.*,
        COUNT(DISTINCT u.id) AS userCount,
        COUNT(DISTINCT p.id) AS permissionCount
      FROM \`role\` r
      LEFT JOIN \`user\` u ON u.roleId = r.id
      LEFT JOIN permission p ON p.roleId = r.id
      GROUP BY r.id
      ORDER BY r.name ASC`,
    );
    return rows.map(mapRoleRow);
  }

  async findById(id: string) {
    const rows = await this.database.query<RoleRow>(
      `SELECT
        r.*,
        COUNT(DISTINCT u.id) AS userCount,
        COUNT(DISTINCT p.id) AS permissionCount
      FROM \`role\` r
      LEFT JOIN \`user\` u ON u.roleId = r.id
      LEFT JOIN permission p ON p.roleId = r.id
      WHERE r.id = ?
      GROUP BY r.id
      LIMIT 1`,
      [id],
    );

    if (!rows[0]) return null;

    return {
      ...mapRoleRow(rows[0]),
      permissions: await this.findPermissions(id),
    };
  }

  async create(dto: CreateRoleDto) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO \`role\`
        (id, name, description, isSystem, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      [id, dto.name, dto.description ?? null, false],
    );
    const role = await this.findById(id);
    return { ...role, permissions: role?.permissions ?? [] };
  }

  async update(id: string, dto: UpdateRoleDto) {
    const entries = (Object.entries({
      name: dto.name,
      description: dto.description,
    }) as [string, QueryParam | undefined][])
      .filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length > 0) {
      await this.database.execute(
        `UPDATE \`role\`
        SET ${entries.map(([column]) => `\`${column}\` = ?`).join(', ')},
          updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ?`,
        [...entries.map(([, value]) => value), id],
      );
    }

    const role = await this.findById(id);
    return { ...role, permissions: role?.permissions ?? [] };
  }

  async delete(id: string) {
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        'DELETE FROM permission WHERE roleId = ?',
        [id],
        connection,
      );
      await this.database.execute(
        'DELETE FROM `role` WHERE id = ?',
        [id],
        connection,
      );
    });
  }

  async findPermissions(id: string) {
    const rows = await this.database.query<PermissionRow>(
      `SELECT id, resource, action, roleId
      FROM permission
      WHERE roleId = ?
      ORDER BY resource ASC, action ASC`,
      [id],
    );
    return rows.map(mapPermissionRow);
  }

  async replacePermissions(roleId: string, permissions: PermissionItemDto[]) {
    await this.database.transaction(async (connection) => {
      await this.database.execute('DELETE FROM permission WHERE roleId = ?', [roleId], connection);

      for (const permission of permissions) {
        await this.database.execute(
          'INSERT IGNORE INTO permission (id, resource, action, roleId) VALUES (?, ?, ?, ?)',
          [randomUUID(), permission.resource, permission.action, roleId],
          connection,
        );
      }
    });
  }
}
