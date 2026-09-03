import { NotFoundException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import type { ProjectAccessService } from "../project-access/project-access.service";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const actor = {
    id: "00000000-0000-4000-8000-000000000001",
  } as AuthenticatedUser;
  const repository = {
    summary: jest.fn(),
    markRead: jest.fn(),
    deactivateDevice: jest.fn(),
    registerDevice: jest.fn(),
  } as unknown as jest.Mocked<NotificationsRepository>;
  const projectAccess = {
    resolveOrganizationAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const service = new NotificationsService(repository, projectAccess);

  beforeEach(() => jest.clearAllMocks());

  it("returns only the authenticated recipient unread count after membership access", async () => {
    repository.summary.mockResolvedValue({ unreadCount: 4 });
    await expect(service.summary("organization", actor)).resolves.toEqual({
      unreadCount: 4,
    });
    expect(projectAccess.resolveOrganizationAccess.mock.calls[0]).toEqual([
      actor,
      "organization",
      "notifications:read",
    ]);
    expect(repository.summary.mock.calls[0]).toEqual([
      "organization",
      actor.id,
    ]);
  });

  it("does not reveal another recipient notification", async () => {
    repository.markRead.mockResolvedValue(false);
    await expect(
      service.markRead("organization", "notification", actor),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("registers a device only for the authenticated user", async () => {
    const registration = {
      id: "device",
      platform: "ANDROID" as const,
      locale: "hi" as const,
      active: true,
      lastRegisteredAt: new Date().toISOString(),
    };
    repository.registerDevice.mockResolvedValue(registration);
    await expect(
      service.registerDevice(
        "organization",
        {
          expoPushToken: "ExponentPushToken[token]",
          platform: "ANDROID",
          locale: "hi",
        },
        actor,
      ),
    ).resolves.toEqual(registration);
    expect(repository.registerDevice.mock.calls[0]).toEqual([
      "organization",
      actor.id,
      "ExponentPushToken[token]",
      "ANDROID",
      "hi",
    ]);
  });
});
