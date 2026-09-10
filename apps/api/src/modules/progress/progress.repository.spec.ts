import { PROJECT_PROGRESS_STAGES } from "@nirman-app/shared";
import { ProgressRepository } from "./progress.repository";

describe("ProgressRepository summary", () => {
  const repository = new ProgressRepository({} as never, {} as never);

  it("counts untouched stages as zero in the equal-weight overall value", () => {
    const summary = repository.buildSummary("org-1", "project-1", [
      {
        id: "update-1",
        organizationId: "org-1",
        projectId: "project-1",
        stage: "FOUNDATION",
        percentage: 90,
        previousPercentage: null,
        updateDate: "2026-09-02",
        notes: null,
        updatedByUserId: "user-1",
        updatedByMemberId: "member-1",
        updatedBy: "Owner",
        createdAt: "2026-09-02T10:00:00.000Z",
      },
    ]);

    expect(PROJECT_PROGRESS_STAGES).toHaveLength(9);
    expect(summary.overallPercentage).toBe(10);
    expect(summary.updatedStages).toBe(1);
    expect(summary.stages).toHaveLength(9);
  });

  it("uses the latest update as the summary activity", () => {
    const newest = {
      id: "update-2",
      organizationId: "org-1",
      projectId: "project-1",
      stage: "SLAB" as const,
      percentage: 50,
      previousPercentage: 40,
      updateDate: "2026-09-02",
      notes: null,
      updatedByUserId: "user-1",
      updatedByMemberId: "member-1",
      updatedBy: "Owner",
      createdAt: "2026-09-02T10:00:00.000Z",
    };
    const summary = repository.buildSummary("org-1", "project-1", [newest]);
    expect(summary.latestUpdate).toEqual(newest);
  });
});
