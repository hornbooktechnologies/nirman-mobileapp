import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../database/database.service';
import { DbRow } from '../../database/database.types';
import { UserRow } from '../users/users.types';
import { mapUserRow } from '../users/users.repository';
import { UserWithRolePermissions, RefreshTokenWithUser } from './types/auth-db.types';

interface CountRow extends DbRow {
  total: number;
}

interface PasswordResetRow extends DbRow {
  id: string;
  user_id: string | null;
  expires_at: Date;
  used_at: Date | null;
  user_is_active: number | boolean | null;
  user_name: string | null;
  user_email: string | null;
}

interface PermissionJoinRow extends DbRow {
  permission_id: string;
  permission_resource: string;
  permission_action: string;
  permission_roleId: string;
}

interface RefreshTokenRow extends UserRow {
  refresh_id: string;
  refresh_token: string;
  refresh_userId: string;
  refresh_expiresAt: Date;
  refresh_createdAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findUserByEmail(email: string) {
    return this.findUserWithPermissions('u.email = ?', [email]);
  }

  async findUserById(id: string) {
    const rows = await this.database.query<UserRow>(
      `SELECT
        u.*,
        r.id AS role_id,
        r.name AS role_name,
        r.description AS role_description,
        r.isSystem AS role_isSystem,
        r.createdAt AS role_createdAt,
        r.updatedAt AS role_updatedAt,
        r.createdBy AS role_createdBy,
        r.updatedBy AS role_updatedBy
      FROM \`user\` u
      LEFT JOIN \`role\` r ON r.id = u.roleId
      WHERE u.id = ?
      LIMIT 1`,
      [id],
    );

    return rows[0] ? mapUserRow(rows[0]) : null;
  }

  async findUserWithPermissionsById(id: string) {
    return this.findUserWithPermissions('u.id = ?', [id]);
  }

  async findRefreshToken(token: string): Promise<RefreshTokenWithUser | null> {
    const rows = await this.database.query<RefreshTokenRow>(
      `SELECT
        rt.id AS refresh_id,
        rt.token AS refresh_token,
        rt.userId AS refresh_userId,
        rt.expiresAt AS refresh_expiresAt,
        rt.createdAt AS refresh_createdAt,
        u.*,
        r.id AS role_id,
        r.name AS role_name,
        r.description AS role_description,
        r.isSystem AS role_isSystem,
        r.createdAt AS role_createdAt,
        r.updatedAt AS role_updatedAt,
        r.createdBy AS role_createdBy,
        r.updatedBy AS role_updatedBy
      FROM refreshtoken rt
      INNER JOIN \`user\` u ON u.id = rt.userId
      LEFT JOIN \`role\` r ON r.id = u.roleId
      WHERE rt.token = ?
      LIMIT 1`,
      [token],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.refresh_id,
      token: row.refresh_token,
      userId: row.refresh_userId,
      expiresAt: row.refresh_expiresAt,
      createdAt: row.refresh_createdAt,
      user: mapUserRow(row),
    };
  }

  async storeRefreshToken(userId: string, token: string, expiresAt: Date) {
    await this.database.execute(
      'INSERT INTO refreshtoken (id, userId, token, expiresAt, createdAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3))',
      [randomUUID(), userId, token, expiresAt],
    );
  }

  async deleteRefreshToken(token: string) {
    await this.database.execute('DELETE FROM refreshtoken WHERE token = ?', [token]);
  }

  async countRecentPasswordResetRequests(
    emailHash: string,
    requestedIpHash: string | null,
    since: Date,
  ) {
    const emailRows = await this.database.query<CountRow>(
      `SELECT COUNT(*) AS total
      FROM password_reset_requests
      WHERE email_hash = ? AND created_at >= ?`,
      [emailHash, since],
    );
    let ipTotal = 0;
    if (requestedIpHash) {
      const ipRows = await this.database.query<CountRow>(
        `SELECT COUNT(*) AS total
        FROM password_reset_requests
        WHERE requested_ip_hash = ? AND created_at >= ?`,
        [requestedIpHash, since],
      );
      ipTotal = Number(ipRows[0]?.total ?? 0);
    }
    return {
      emailTotal: Number(emailRows[0]?.total ?? 0),
      ipTotal,
    };
  }

  async createPasswordResetRequest(input: {
    userId: string | null;
    emailHash: string;
    tokenHash: string;
    requestedIpHash: string | null;
    expiresAt: Date;
  }) {
    const id = randomUUID();
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        `UPDATE password_reset_requests
        SET used_at = CURRENT_TIMESTAMP(3)
        WHERE email_hash = ? AND used_at IS NULL`,
        [input.emailHash],
        connection,
      );
      await this.database.execute(
        `INSERT INTO password_reset_requests
          (id, user_id, email_hash, token_hash, requested_ip_hash, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          input.userId,
          input.emailHash,
          input.tokenHash,
          input.requestedIpHash,
          input.expiresAt,
        ],
        connection,
      );
    });
    return id;
  }

  async completePasswordReset(tokenHash: string, passwordHash: string) {
    return this.database.transaction(async (connection) => {
      const rows = await this.database.query<PasswordResetRow>(
        `SELECT
          prr.id,
          prr.user_id,
          prr.expires_at,
          prr.used_at,
          u.isActive AS user_is_active,
          u.name AS user_name,
          u.email AS user_email
        FROM password_reset_requests prr
        LEFT JOIN \`user\` u ON u.id = prr.user_id
        WHERE prr.token_hash = ?
        LIMIT 1
        FOR UPDATE`,
        [tokenHash],
        connection,
      );
      const request = rows[0];
      if (
        !request ||
        !request.user_id ||
        request.used_at ||
        request.expires_at.getTime() <= Date.now() ||
        !(request.user_is_active === true || request.user_is_active === 1)
      ) {
        return null;
      }

      await this.database.execute(
        `UPDATE \`user\`
        SET password = ?, updatedAt = CURRENT_TIMESTAMP(3)
        WHERE id = ?`,
        [passwordHash, request.user_id],
        connection,
      );
      await this.database.execute(
        `UPDATE password_reset_requests
        SET used_at = CURRENT_TIMESTAMP(3)
        WHERE user_id = ? AND used_at IS NULL`,
        [request.user_id],
        connection,
      );
      await this.database.execute(
        'DELETE FROM refreshtoken WHERE userId = ?',
        [request.user_id],
        connection,
      );
      return {
        userId: request.user_id,
        name: request.user_name ?? 'NirmanSite user',
        email: request.user_email ?? '',
      };
    });
  }

  async updatePasswordAndRevokeSessions(userId: string, password: string) {
    await this.database.transaction(async (connection) => {
      await this.database.execute(
        'UPDATE `user` SET password = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [password, userId],
        connection,
      );
      await this.database.execute(
        'DELETE FROM refreshtoken WHERE userId = ?',
        [userId],
        connection,
      );
    });
  }

  async updatePassword(userId: string, password: string) {
    await this.database.execute(
      'UPDATE `user` SET password = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [password, userId],
    );
  }

  private async findUserWithPermissions(
    whereSql: string,
    params: [string],
  ): Promise<UserWithRolePermissions | null> {
    const rows = await this.database.query<UserRow & PermissionJoinRow>(
      `SELECT
        u.*,
        r.id AS role_id,
        r.name AS role_name,
        r.description AS role_description,
        r.isSystem AS role_isSystem,
        r.createdAt AS role_createdAt,
        r.updatedAt AS role_updatedAt,
        r.createdBy AS role_createdBy,
        r.updatedBy AS role_updatedBy,
        p.id AS permission_id,
        p.resource AS permission_resource,
        p.action AS permission_action,
        p.roleId AS permission_roleId
      FROM \`user\` u
      INNER JOIN \`role\` r ON r.id = u.roleId
      LEFT JOIN permission p ON p.roleId = r.id
      WHERE ${whereSql}
      ORDER BY p.resource ASC, p.action ASC`,
      params,
    );

    if (rows.length === 0) return null;

    const user = mapUserRow(rows[0]) as UserWithRolePermissions;
    user.role.permissions = rows
      .filter((row) => row.permission_id)
      .map((row) => ({
        id: row.permission_id,
        resource: row.permission_resource,
        action: row.permission_action,
        roleId: row.permission_roleId,
      }));

    return user;
  }
}
