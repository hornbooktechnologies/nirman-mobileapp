/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { EmailService } from "../email/email.service";
import { ProjectAccessService } from "../project-access/project-access.service";

describe("AuthService password recovery", () => {
  const authRepo = {
    countRecentPasswordResetRequests: jest.fn(),
    findUserByEmail: jest.fn(),
    createPasswordResetRequest: jest.fn(),
    completePasswordReset: jest.fn(),
    findUserById: jest.fn(),
    updatePasswordAndRevokeSessions: jest.fn(),
  } as unknown as jest.Mocked<AuthRepository>;
  const emailService = {
    sendPasswordReset: jest.fn(),
    sendPasswordChangedNotice: jest.fn(),
  } as unknown as jest.Mocked<EmailService>;
  const projectAccess = {} as jest.Mocked<ProjectAccessService>;
  const jwtService = {} as never;
  const service = new AuthService(
    authRepo,
    jwtService,
    projectAccess,
    emailService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    authRepo.countRecentPasswordResetRequests.mockResolvedValue({
      emailTotal: 0,
      ipTotal: 0,
    });
    authRepo.createPasswordResetRequest.mockResolvedValue(
      "00000000-0000-4000-8000-000000000001",
    );
    emailService.sendPasswordReset.mockResolvedValue("EMAIL_SENT");
  });

  it("stores a hashed request and emails an active user without exposing the token", async () => {
    authRepo.findUserByEmail.mockResolvedValue({
      id: "user-id",
      name: "Test User",
      email: "user@example.test",
      isActive: true,
    } as never);

    await service.requestPasswordReset(
      { email: " USER@example.test " },
      "127.0.0.1",
    );

    const createdRequest =
      authRepo.createPasswordResetRequest.mock.calls[0]?.[0];
    expect(createdRequest?.userId).toBe("user-id");
    expect(createdRequest?.emailHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createdRequest?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createdRequest?.requestedIpHash).toMatch(/^[a-f0-9]{64}$/);
    expect(emailService.sendPasswordReset).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      expect.objectContaining({ recipientEmail: "user@example.test" }),
    );
  });

  it("uses the same storage path but sends no email for an unknown identity", async () => {
    authRepo.findUserByEmail.mockResolvedValue(null);

    await service.requestPasswordReset({ email: "missing@example.test" });

    expect(authRepo.createPasswordResetRequest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
    );
    expect(emailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it("silently throttles repeated requests", async () => {
    authRepo.countRecentPasswordResetRequests.mockResolvedValue({
      emailTotal: 3,
      ipTotal: 0,
    });

    await service.requestPasswordReset({ email: "user@example.test" });

    expect(authRepo.findUserByEmail).not.toHaveBeenCalled();
    expect(authRepo.createPasswordResetRequest).not.toHaveBeenCalled();
  });

  it("rejects an invalid or expired reset token with the shared error code", async () => {
    authRepo.completePasswordReset.mockResolvedValue(null);

    const error = await service
      .resetPassword({ token: "x".repeat(43), newPassword: "NewPassword123!" })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: "AUTH_PASSWORD_RESET_INVALID",
    });
  });

  it("requires the current password and revokes sessions when changing it", async () => {
    const password = await bcrypt.hash("CurrentPassword123!", 4);
    authRepo.findUserById.mockResolvedValue({
      id: "user-id",
      isActive: true,
      password,
    } as never);

    await service.changeOwnPassword("user-id", {
      currentPassword: "CurrentPassword123!",
      newPassword: "NewPassword123!",
    });

    expect(authRepo.updatePasswordAndRevokeSessions).toHaveBeenCalledWith(
      "user-id",
      expect.not.stringMatching(/^NewPassword123!$/),
    );
  });
});
