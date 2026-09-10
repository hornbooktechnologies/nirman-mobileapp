import { BadRequestException, ConflictException } from "@nestjs/common";
import { ProgressService } from "./progress.service";

describe("ProgressService", () => {
  const repository = {
    findLatestUpdates: jest.fn(),
    buildSummary: jest.fn(),
    findHistory: jest.fn(),
    record: jest.fn(),
  };
  const projectAccess = {
    resolveProjectAccess: jest.fn(),
    resolveOrganizationAccess: jest.fn(),
    getProjectAccessSummary: jest.fn(),
  };
  const service = new ProgressService(
    repository as never,
    projectAccess as never,
  );
  const actor = { id: "user-1" } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    projectAccess.resolveProjectAccess.mockResolvedValue({
      membership: { id: "member-1" },
      project: { status: "ACTIVE" },
    });
    repository.findLatestUpdates.mockResolvedValue([]);
    repository.buildSummary.mockReturnValue({
      overallPercentage: 0,
      stages: [],
    });
  });

  it("enforces project access before returning a summary", async () => {
    await service.summary("org-1", "project-1", actor);
    expect(projectAccess.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      "org-1",
      "project-1",
      "progress:read",
    );
  });

  it("rejects a future update date before persistence", async () => {
    await expect(
      service.record(
        "org-1",
        "project-1",
        {
          stage: "FOUNDATION",
          percentage: 10,
          updateDate: "2999-01-01",
          expectedPreviousPercentage: null,
          idempotencyKey: "progress-key-1",
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.record).not.toHaveBeenCalled();
  });

  it("returns the refreshed summary after recording", async () => {
    repository.record.mockResolvedValue({ id: "update-1" });
    repository.buildSummary.mockReturnValue({
      overallPercentage: 5,
      stages: [],
    });
    const result = await service.record(
      "org-1",
      "project-1",
      {
        stage: "FOUNDATION",
        percentage: 45,
        updateDate: "2026-09-02",
        expectedPreviousPercentage: null,
        idempotencyKey: "progress-key-2",
      },
      actor,
    );
    expect(repository.record).toHaveBeenCalledWith(
      "org-1",
      "project-1",
      expect.objectContaining({ percentage: 45 }),
      { userId: "user-1", memberId: "member-1" },
    );
    expect(result.overallPercentage).toBe(5);
  });

  it("maps stale-stage repository conflicts to HTTP conflicts", async () => {
    repository.record.mockRejectedValue(
      Object.assign(new Error("PROGRESS_VERSION_CONFLICT"), {
        code: "PROGRESS_VERSION_CONFLICT",
      }),
    );
    await expect(
      service.record(
        "org-1",
        "project-1",
        {
          stage: "SLAB",
          percentage: 25,
          updateDate: "2026-09-02",
          expectedPreviousPercentage: 10,
          idempotencyKey: "progress-key-3",
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
