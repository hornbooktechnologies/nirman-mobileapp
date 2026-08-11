import { ConflictException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseTransaction } from "../../database/database.types";
import type { CreateOrganizationDto } from "./dto/create-organization.dto";
import {
  InvitationRow,
  OnboardingRoleRow,
  OnboardingUserRow,
  OrganizationOnboardingResult,
} from "./types/organization-onboarding.types";
import { mapOrganizationRow } from "./organizations.repository";
import type { OrganizationRow } from "./types/organizations.types";

const PLATFORM_ROLE_NAMES = new Set(["Platform Super Admin", "Super Admin"]);

@Injectable()
export class OrganizationOnboardingRepository {
  constructor(private readonly database: DatabaseService) {}

  async createOrganizationWithOwner(
    dto: CreateOrganizationDto,
    actorId: string,
    tokenHash: string,
    expiresAt: Date,
    placeholderPassword: string,
  ): Promise<
    Omit<OrganizationOnboardingResult, "invitation"> & {
      invitationId: string;
      requiresPasswordSetup: boolean;
    }
  > {
    return this.database.transaction(async (connection) => {
      const roleName =
        dto.type === "BUILDER"
          ? "Organization Owner"
          : "Independent Contractor Owner";
      const role = await this.findRoleByName(roleName, connection);
      if (!role) {
        throw new ConflictException(
          `${roleName} role template is not available. Run the approved role-template seed first.`,
        );
      }

      const ownerEmail = dto.owner.email.trim().toLowerCase();
      let user = await this.findUserByEmail(ownerEmail, connection);
      let requiresPasswordSetup = false;

      if (user) {
        if (PLATFORM_ROLE_NAMES.has(user.role_name)) {
          throw new ConflictException(
            "A platform-only user cannot be assigned as a customer organization Owner",
          );
        }
        if (!isDatabaseFlagEnabled(user.isActive)) {
          const hasPendingSetup = await this.hasPendingPasswordSetupInvitation(
            user.id,
            connection,
          );
          if (!hasPendingSetup) {
            throw new ConflictException(
              "An inactive account already uses this email. Reactivate it before onboarding.",
            );
          }
          requiresPasswordSetup = true;
        }
      } else {
        const userId = randomUUID();
        await this.database.execute(
          `INSERT INTO \`user\`
            (id, name, email, password, phone, isActive, roleId, createdBy, updatedBy, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))`,
          [
            userId,
            dto.owner.name,
            ownerEmail,
            placeholderPassword,
            dto.owner.mobile,
            role.id,
            actorId,
            actorId,
          ],
          connection,
        );
        user = await this.findUserByEmail(ownerEmail, connection);
        requiresPasswordSetup = true;
      }

      if (!user) {
        throw new ConflictException("Owner account could not be prepared");
      }

      const organizationId = randomUUID();
      await this.database.execute(
        `INSERT INTO organizations
          (id, name, type, status, operating_profile, timezone, currency, created_by, updated_by)
        VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)`,
        [
          organizationId,
          dto.name.trim(),
          dto.type,
          dto.operatingProfile ?? "CUSTOM",
          dto.timezone ?? "Asia/Kolkata",
          dto.currency ?? "INR",
          actorId,
          actorId,
        ],
        connection,
      );

      const membershipId = randomUUID();
      await this.database.execute(
        `INSERT INTO organization_members
          (id, organization_id, user_id, role_id, status, designation,
            organization_wide_project_access, invited_by, created_by, updated_by)
        VALUES (?, ?, ?, ?, 'INVITED', ?, 1, ?, ?, ?)`,
        [
          membershipId,
          organizationId,
          user.id,
          role.id,
          dto.owner.designation ?? null,
          actorId,
          actorId,
          actorId,
        ],
        connection,
      );

      const invitationId = randomUUID();
      await this.database.execute(
        `INSERT INTO invitations
          (id, organization_id, user_id, membership_id, invited_email, token_hash,
            status, requires_password_setup, expires_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
        [
          invitationId,
          organizationId,
          user.id,
          membershipId,
          ownerEmail,
          tokenHash,
          requiresPasswordSetup,
          expiresAt,
          actorId,
        ],
        connection,
      );

      const organizationRows = await this.database.query<OrganizationRow>(
        "SELECT * FROM organizations WHERE id = ? LIMIT 1",
        [organizationId],
        connection,
      );
      const organization = organizationRows[0]
        ? mapOrganizationRow(organizationRows[0])
        : null;
      if (!organization) {
        throw new ConflictException("Organization could not be created");
      }

      return {
        organization,
        ownerMembership: {
          id: membershipId,
          userId: user.id,
          roleId: role.id,
          status: "INVITED",
        },
        invitationId,
        requiresPasswordSetup,
      };
    });
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const rows = await this.database.query<InvitationRow>(
      `${this.invitationSelectSql()}
      WHERE i.token_hash = ?
      LIMIT 1`,
      [tokenHash],
    );
    return rows[0] ?? null;
  }

  async acceptInvitation(
    invitationId: string,
    passwordHash: string | null,
  ): Promise<boolean> {
    return this.database.transaction(async (connection) => {
      const invitations = await this.database.query<InvitationRow>(
        `${this.invitationSelectSql()}
        WHERE i.id = ?
        LIMIT 1
        FOR UPDATE`,
        [invitationId],
        connection,
      );
      const invitation = invitations[0];
      if (
        !invitation ||
        invitation.status !== "PENDING" ||
        invitation.expires_at.getTime() <= Date.now() ||
        invitation.membership_status !== "INVITED"
      ) {
        return false;
      }

      if (passwordHash) {
        await this.database.execute(
          `UPDATE \`user\`
          SET password = ?, isActive = 1, updatedAt = CURRENT_TIMESTAMP(3)
          WHERE id = ?`,
          [passwordHash, invitation.user_id],
          connection,
        );
      }

      const membershipResult = await this.database.execute(
        `UPDATE organization_members
        SET status = 'ACTIVE', joined_at = CURRENT_TIMESTAMP(3),
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND status = 'INVITED'`,
        [invitation.membership_id],
        connection,
      );
      if (membershipResult.affectedRows !== 1) {
        throw new ConflictException(
          "The invited organization membership is no longer available",
        );
      }
      await this.database.execute(
        `UPDATE organizations
        SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND status = 'DRAFT'`,
        [invitation.organization_id],
        connection,
      );
      const result = await this.database.execute(
        `UPDATE invitations
        SET status = 'ACCEPTED', accepted_at = CURRENT_TIMESTAMP(3),
          updated_at = CURRENT_TIMESTAMP(3)
        WHERE id = ? AND status = 'PENDING'`,
        [invitation.id],
        connection,
      );
      if (result.affectedRows !== 1) {
        throw new ConflictException(
          "The invitation was changed while it was being accepted",
        );
      }
      return true;
    });
  }

  private async findRoleByName(name: string, connection: DatabaseTransaction) {
    const rows = await this.database.query<OnboardingRoleRow>(
      "SELECT id, name FROM `role` WHERE name = ? LIMIT 1",
      [name],
      connection,
    );
    return rows[0] ?? null;
  }

  private async findUserByEmail(
    email: string,
    connection: DatabaseTransaction,
  ) {
    const rows = await this.database.query<OnboardingUserRow>(
      `SELECT u.id, u.name, u.email, u.password, u.phone, u.isActive, u.roleId,
        r.name AS role_name
      FROM \`user\` u
      INNER JOIN \`role\` r ON r.id = u.roleId
      WHERE u.email = ?
      LIMIT 1`,
      [email],
      connection,
    );
    return rows[0] ?? null;
  }

  private async hasPendingPasswordSetupInvitation(
    userId: string,
    connection: DatabaseTransaction,
  ) {
    const rows = await this.database.query<InvitationRow>(
      `SELECT i.*, '' AS organization_name, 'BUILDER' AS organization_type,
        '' AS user_name, '' AS user_email, '' AS user_password,
        0 AS user_is_active, 'INVITED' AS membership_status, '' AS role_name
      FROM invitations i
      WHERE i.user_id = ?
        AND i.status = 'PENDING'
        AND i.requires_password_setup = 1
        AND i.expires_at > CURRENT_TIMESTAMP(3)
      LIMIT 1`,
      [userId],
      connection,
    );
    return rows.length > 0;
  }

  private invitationSelectSql() {
    return `SELECT
      i.*,
      o.name AS organization_name,
      o.type AS organization_type,
      u.name AS user_name,
      u.email AS user_email,
      u.password AS user_password,
      u.isActive AS user_is_active,
      om.status AS membership_status,
      r.name AS role_name
    FROM invitations i
    INNER JOIN organizations o ON o.id = i.organization_id
    INNER JOIN \`user\` u ON u.id = i.user_id
    INNER JOIN organization_members om ON om.id = i.membership_id
    INNER JOIN \`role\` r ON r.id = om.role_id`;
  }
}

function isDatabaseFlagEnabled(value: number | boolean) {
  return value === true || value === 1;
}
