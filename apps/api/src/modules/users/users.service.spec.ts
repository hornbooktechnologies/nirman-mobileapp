/* eslint-disable @typescript-eslint/unbound-method */
import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { UsersRepository } from "./users.repository";
import { UsersService } from "./users.service";

describe("UsersService platform role boundary", () => {
  const usersRepo = {
    findByEmail: jest.fn(),
    findRoleById: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<UsersRepository>;
  const service = new UsersService(usersRepo);
  const platformOwner: AuthenticatedUser = {
    id: "platform-owner-id",
    email: "owner@example.test",
    name: "Platform Owner",
    phone: null,
    avatar: null,
    isActive: true,
    roleId: "platform-owner-role-id",
    roleName: "Platform Super Admin",
    permissions: [],
  };
  const dto = {
    name: "New User",
    email: "new.user@example.test",
    password: "Password123!",
    roleId: "role-id",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usersRepo.findByEmail.mockResolvedValue(null);
  });

  it("rejects customer organization roles on the global users endpoint", async () => {
    usersRepo.findRoleById.mockResolvedValue({
      id: dto.roleId,
      name: "Organization Owner",
      isSystem: true,
    });

    await expect(service.create(dto, platformOwner)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(usersRepo.create).not.toHaveBeenCalled();
  });

  it("allows a platform owner to create a custom platform-role user", async () => {
    usersRepo.findRoleById.mockResolvedValue({
      id: dto.roleId,
      name: "Billing Operator",
      isSystem: false,
    });
    usersRepo.create.mockResolvedValue({ id: "new-user-id" } as never);

    await service.create(dto, platformOwner);

    expect(usersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: dto.email,
        roleId: dto.roleId,
        password: expect.not.stringMatching(/^Password123!$/),
      }),
    );
  });

  it("prevents a non-owner platform user from assigning Platform Super Admin", async () => {
    usersRepo.findRoleById.mockResolvedValue({
      id: dto.roleId,
      name: "Platform Super Admin",
      isSystem: true,
    });

    await expect(
      service.create(dto, {
        ...platformOwner,
        roleName: "User Manager",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
