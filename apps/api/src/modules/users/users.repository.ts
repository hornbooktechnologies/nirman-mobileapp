import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../../database/database.service";
import { DbRow, QueryParam } from "../../database/database.types";
import { CreateUserDto } from "./dto/create-user.dto";
import { QueryUserDto } from "./dto/query-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { RoleEntity, UserEntity, UserRow } from "./users.types";

const USER_SORT_COLUMNS = {
  name: "u.name",
  email: "u.email",
  createdAt: "u.createdAt",
} as const;

const USER_SELECT = `SELECT
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
LEFT JOIN \`role\` r ON r.id = u.roleId`;

export function mapUserRow(row: UserRow): UserEntity {
  const role =
    row.role_id === null
      ? undefined
      : ({
          id: row.role_id,
          name: row.role_name,
          description: row.role_description,
          isSystem: Boolean(row.role_isSystem),
          createdAt: row.role_createdAt,
          updatedAt: row.role_updatedAt,
          createdBy: row.role_createdBy,
          updatedBy: row.role_updatedBy,
        } as RoleEntity);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    phone: row.phone,
    avatar: row.avatar,
    isActive: Boolean(row.isActive),
    roleId: row.roleId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
    ...(role ? { role } : {}),
  };
}

@Injectable()
export class UsersRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAll(query: QueryUserDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where: string[] = [];
    const params: QueryParam[] = [];

    if (query.roleId) {
      where.push("u.roleId = ?");
      params.push(query.roleId);
    }

    if (query.search) {
      where.push("(u.name LIKE ? OR u.email LIKE ?)");
      params.push(`%${query.search}%`, `%${query.search}%`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const sortColumn =
      USER_SORT_COLUMNS[
        (query.sortBy ?? "createdAt") as keyof typeof USER_SORT_COLUMNS
      ] ?? USER_SORT_COLUMNS.createdAt;
    const sortOrder = query.sortOrder === "asc" ? "ASC" : "DESC";

    const [rows, totalRows] = await Promise.all([
      this.database.query<UserRow>(
        `${USER_SELECT}
        ${whereSql}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT ? OFFSET ?`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
      this.database.query<{ total: number } & UserRow>(
        `SELECT COUNT(*) AS total FROM \`user\` u ${whereSql}`,
        params,
      ),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    return {
      data: rows.map(mapUserRow),
      meta: {
        total,
        page,
        pageSize,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const rows = await this.database.query<UserRow>(
      `${USER_SELECT} WHERE u.id = ? LIMIT 1`,
      [id],
    );
    return rows[0] ? mapUserRow(rows[0]) : null;
  }

  async findByEmail(email: string) {
    const rows = await this.database.query<UserRow>(
      `${USER_SELECT} WHERE u.email = ? LIMIT 1`,
      [email],
    );
    return rows[0] ? mapUserRow(rows[0]) : null;
  }

  async findRoleById(roleId: string) {
    const rows = await this.database.query<
      DbRow & { id: string; name: string; isSystem: number | boolean }
    >("SELECT id, name, isSystem FROM `role` WHERE id = ? LIMIT 1", [roleId]);
    return rows[0]
      ? {
          id: rows[0].id,
          name: rows[0].name,
          isSystem: Boolean(rows[0].isSystem),
        }
      : null;
  }

  async create(data: CreateUserDto & { password: string }) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO \`user\`
        (id, name, email, password, phone, isActive, roleId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
      [
        id,
        data.name,
        data.email,
        data.password,
        data.phone ?? null,
        data.isActive ?? true,
        data.roleId,
      ],
    );
    return this.findById(id);
  }

  async update(id: string, data: UpdateUserDto) {
    await this.updateFields(id, data);
    return this.findById(id);
  }

  async updateProfile(id: string, data: UpdateProfileDto) {
    await this.updateFields(id, data);
    return this.findById(id);
  }

  async updatePassword(id: string, password: string) {
    await this.database.execute(
      "UPDATE `user` SET password = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [password, id],
    );
  }

  async delete(id: string) {
    await this.database.execute(
      "UPDATE `user` SET isActive = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [false, id],
    );
  }

  private async updateFields(
    id: string,
    data: UpdateUserDto | UpdateProfileDto,
  ): Promise<void> {
    const updateColumns = {
      name: data.name,
      email: "email" in data ? data.email : undefined,
      phone: data.phone,
      avatar: "avatar" in data ? data.avatar : undefined,
      roleId: "roleId" in data ? data.roleId : undefined,
      isActive: "isActive" in data ? data.isActive : undefined,
    };

    const entries = (
      Object.entries(updateColumns) as [string, QueryParam | undefined][]
    ).filter((entry): entry is [string, QueryParam] => entry[1] !== undefined);

    if (entries.length === 0) return;

    await this.database.execute(
      `UPDATE \`user\`
      SET ${entries.map(([column]) => `\`${column}\` = ?`).join(", ")},
        updatedAt = CURRENT_TIMESTAMP(3)
      WHERE id = ?`,
      [...entries.map(([, value]) => value), id],
    );
  }
}
