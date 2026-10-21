import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import type {
  CreateWebsiteEnquiryDto,
  QueryWebsiteEnquiriesDto,
  UpdateWebsiteEnquiryDto,
  WebsiteEnquiryStatus,
} from "./dto/website-enquiries.dto";

interface WebsiteEnquiryRow extends RowDataPacket {
  id: string;
  submission_key: string;
  name: string;
  phone: string;
  email: string;
  message: string | null;
  source: string;
  status: WebsiteEnquiryStatus;
  next_follow_up_at: Date | null;
  admin_notes: string | null;
  last_contacted_at: Date | null;
  converted_organization_id: string | null;
  converted_organization_name: string | null;
  converted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface WebsiteEnquiryActivityRow extends RowDataPacket {
  id: string;
  enquiry_id: string;
  actor_id: string;
  actor_name: string | null;
  previous_status: WebsiteEnquiryStatus;
  status: WebsiteEnquiryStatus;
  note: string | null;
  follow_up_at: Date | null;
  created_at: Date;
}

@Injectable()
export class WebsiteEnquiriesRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(dto: CreateWebsiteEnquiryDto) {
    const id = randomUUID();
    await this.database.execute(
      `INSERT INTO website_enquiries (id, submission_key, name, phone, email, message)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE submission_key = VALUES(submission_key)`,
      [
        id,
        dto.submissionKey,
        dto.name,
        dto.phone,
        dto.email,
        dto.message ?? null,
      ],
    );
    const rows = await this.database.query<WebsiteEnquiryRow>(
      `${this.selectSql()} WHERE we.submission_key = ? LIMIT 1`,
      [dto.submissionKey],
    );
    return this.map(rows[0]);
  }

  async findAll(query: QueryWebsiteEnquiriesDto) {
    const where: string[] = ["1 = 1"];
    const params: (string | number)[] = [];
    if (query.status) {
      where.push("we.status = ?");
      params.push(query.status);
    }
    if (query.search?.trim()) {
      where.push("(we.name LIKE ? OR we.phone LIKE ? OR we.email LIKE ?)");
      const search = `%${query.search.trim()}%`;
      params.push(search, search, search);
    }
    const count = await this.database.query<RowDataPacket>(
      `SELECT COUNT(*) AS total FROM website_enquiries we WHERE ${where.join(" AND ")}`,
      params,
    );
    const offset = (query.page - 1) * query.limit;
    const rows = await this.database.query<WebsiteEnquiryRow>(
      `${this.selectSql()} WHERE ${where.join(" AND ")}
       ORDER BY we.created_at DESC, we.id DESC LIMIT ? OFFSET ?`,
      [...params, query.limit, offset],
    );
    return {
      data: rows.map((row) => this.map(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total: Number(count[0]?.total ?? 0),
      },
    };
  }

  async findById(id: string, connection?: DatabaseConnection) {
    const rows = await this.database.query<WebsiteEnquiryRow>(
      `${this.selectSql()} WHERE we.id = ? LIMIT 1`,
      [id],
      connection,
    );
    return this.map(rows[0]);
  }

  async updateWorkflow(
    id: string,
    dto: UpdateWebsiteEnquiryDto,
    actorId: string,
  ) {
    return this.database.transaction(async (connection) => {
      const rows = await this.database.query<WebsiteEnquiryRow>(
        `${this.selectSql()} WHERE we.id = ? LIMIT 1 FOR UPDATE`,
        [id],
        connection,
      );
      const current = rows[0];
      if (!current) return null;
      const status = dto.status ?? current.status;
      const nextFollowUpAt =
        dto.nextFollowUpAt === undefined
          ? current.next_follow_up_at
          : dto.nextFollowUpAt
            ? new Date(dto.nextFollowUpAt)
            : null;
      const adminNotes =
        dto.adminNotes === undefined ? current.admin_notes : dto.adminNotes;
      const lastContactedAt =
        status === "CONTACTED" && current.status !== "CONTACTED"
          ? new Date()
          : current.last_contacted_at;

      await this.database.execute(
        `UPDATE website_enquiries
         SET status = ?, next_follow_up_at = ?, admin_notes = ?, last_contacted_at = ?,
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [status, nextFollowUpAt, adminNotes, lastContactedAt, id],
        connection,
      );
      await this.addActivity(
        id,
        actorId,
        current.status,
        status,
        dto.adminNotes ?? null,
        nextFollowUpAt,
        connection,
      );
      return this.findById(id, connection);
    });
  }

  async markConverted(id: string, organizationId: string, actorId: string) {
    return this.database.transaction(async (connection) => {
      const rows = await this.database.query<WebsiteEnquiryRow>(
        `${this.selectSql()} WHERE we.id = ? LIMIT 1 FOR UPDATE`,
        [id],
        connection,
      );
      const current = rows[0];
      if (!current || current.status === "CREATED") return false;
      await this.database.execute(
        `UPDATE website_enquiries
         SET status = 'CREATED', converted_organization_id = ?, converted_by = ?,
             converted_at = CURRENT_TIMESTAMP(3), next_follow_up_at = NULL,
             updated_at = CURRENT_TIMESTAMP(3)
         WHERE id = ?`,
        [organizationId, actorId, id],
        connection,
      );
      await this.addActivity(
        id,
        actorId,
        current.status,
        "CREATED",
        "Organization created from enquiry",
        null,
        connection,
      );
      return true;
    });
  }

  async findActivities(id: string) {
    const rows = await this.database.query<WebsiteEnquiryActivityRow>(
      `SELECT wea.*, u.name AS actor_name
       FROM website_enquiry_activities wea
       LEFT JOIN \`user\` u ON u.id = wea.actor_id
       WHERE wea.enquiry_id = ?
       ORDER BY wea.created_at DESC, wea.id DESC`,
      [id],
    );
    return rows.map((row) => ({
      id: row.id,
      actor: { id: row.actor_id, name: row.actor_name },
      previousStatus: row.previous_status,
      status: row.status,
      note: row.note,
      followUpAt: row.follow_up_at,
      createdAt: row.created_at,
    }));
  }

  private async addActivity(
    enquiryId: string,
    actorId: string,
    previousStatus: WebsiteEnquiryStatus,
    status: WebsiteEnquiryStatus,
    note: string | null,
    followUpAt: Date | null,
    connection: DatabaseConnection,
  ) {
    await this.database.execute(
      `INSERT INTO website_enquiry_activities
       (id, enquiry_id, actor_id, previous_status, status, note, follow_up_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        randomUUID(),
        enquiryId,
        actorId,
        previousStatus,
        status,
        note,
        followUpAt,
      ],
      connection,
    );
  }

  private selectSql() {
    return `SELECT we.*, o.name AS converted_organization_name
      FROM website_enquiries we
      LEFT JOIN organizations o ON o.id = we.converted_organization_id`;
  }

  private map(row: WebsiteEnquiryRow | undefined) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      message: row.message,
      source: row.source,
      status: row.status,
      nextFollowUpAt: row.next_follow_up_at,
      adminNotes: row.admin_notes,
      lastContactedAt: row.last_contacted_at,
      convertedOrganization: row.converted_organization_id
        ? {
            id: row.converted_organization_id,
            name: row.converted_organization_name,
          }
        : null,
      convertedAt: row.converted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
