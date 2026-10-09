/* eslint-disable @typescript-eslint/unbound-method */
import { TotalExpensesService } from "./total-expenses.service";
import { TotalExpensesRepository } from "./total-expenses.repository";
import { TotalExpensesQueryDto } from "./total-expenses.dto";
import { ProjectAccessService } from "../project-access/project-access.service";
import type { AuthenticatedUser } from "../auth/types/auth.types";
describe("Total Expenses access and query boundaries", () => {
  const repo = {
    summary: jest.fn(),
    list: jest.fn(),
    materials: jest.fn(),
  } as unknown as jest.Mocked<TotalExpensesRepository>;
  const access = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const service = new TotalExpensesService(repo, access);
  const actor = { id: "owner" } as AuthenticatedUser;
  beforeEach(() => {
    jest.clearAllMocks();
    access.resolveProjectAccess.mockResolvedValue({} as never);
  });
  it("requires dedicated project report access before reading financial sources", async () => {
    access.resolveProjectAccess.mockRejectedValue(new Error("Forbidden"));
    await expect(
      service.read("org", "project", actor, new TotalExpensesQueryDto()),
    ).rejects.toThrow("Forbidden");
    expect(repo.list).not.toHaveBeenCalled();
    expect(access.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      "org",
      "project",
      "total-expenses:read",
    );
  });
  it("report permission permits all source totals without requiring source-detail permissions", async () => {
    const q = new TotalExpensesQueryDto();
    q.source = "MATERIALS";
    await service.read("org", "project", actor, q, true);
    expect(repo.summary).toHaveBeenCalledWith("org", "project", q);
    expect(access.resolveProjectAccess).toHaveBeenCalledTimes(1);
  });
  it("material overview uses the dedicated report permission and never requires payment or source-read permission", async () => {
    const q = new TotalExpensesQueryDto();
    await service.read("org", "project", actor, q, "materials");
    expect(access.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      "org",
      "project",
      "total-expenses:read",
    );
    expect(repo.materials).toHaveBeenCalledWith("org", "project", q);
    expect(repo.list).not.toHaveBeenCalled();
    expect(repo.summary).not.toHaveBeenCalled();
  });
  it("denies material snapshots before any repository read when project access fails", async () => {
    access.resolveProjectAccess.mockRejectedValue(new Error("Forbidden"));
    await expect(
      service.read(
        "org",
        "project",
        actor,
        new TotalExpensesQueryDto(),
        "materials",
      ),
    ).rejects.toThrow("Forbidden");
    expect(repo.materials).not.toHaveBeenCalled();
  });
  it.each([
    { startDate: "2026-09-01" },
    { startDate: "2026-09-30", endDate: "2026-09-01" },
    { startDate: "2026-02-30", endDate: "2026-03-01" },
  ])("rejects incomplete/reversed/invalid range %j", async (dates) => {
    await expect(
      service.read(
        "org",
        "project",
        actor,
        Object.assign(new TotalExpensesQueryDto(), dates),
      ),
    ).rejects.toThrow("valid inclusive");
    expect(repo.list).not.toHaveBeenCalled();
  });
  it("reports setup unavailable rather than misleading zero totals before schema rollout", async () => {
    repo.summary.mockRejectedValueOnce({
      code: "ER_NO_SUCH_TABLE",
      sqlMessage: "Table 'fixture.site_expense_payments' does not exist",
    });
    await expect(
      service.read("org", "project", actor, new TotalExpensesQueryDto(), true),
    ).rejects.toThrow("Payment tracking is not available yet");
  });
});
