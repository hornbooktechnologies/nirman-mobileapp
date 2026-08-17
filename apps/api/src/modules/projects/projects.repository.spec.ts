/* eslint-disable @typescript-eslint/unbound-method */
import { DatabaseService } from "../../database/database.service";
import type { DatabaseConnection } from "../../database/database.types";
import { ProjectsRepository } from "./projects.repository";

describe("ProjectsRepository batch member assignments", () => {
  it("writes assignment additions and removals in one database transaction", async () => {
    const connection = {
      name: "transaction-connection",
    } as unknown as DatabaseConnection;
    const database = {
      transaction: jest.fn(
        async (callback: (value: unknown) => Promise<unknown>) =>
          callback(connection),
      ),
      query: jest.fn().mockResolvedValue([]),
      execute: jest.fn().mockResolvedValue({ affectedRows: 1 }),
    } as unknown as jest.Mocked<DatabaseService>;
    const repository = new ProjectsRepository(database);

    await repository.saveMemberProjectAssignments(
      "organization-id",
      "member-id",
      [
        {
          projectId: "project-1",
          roleLabel: "Site Supervisor",
          status: "ACTIVE",
          startsOn: "2026-08-01",
          endsOn: null,
        },
      ],
      ["project-2"],
      "actor-id",
    );

    expect(database.transaction).toHaveBeenCalledTimes(1);
    const transactionalWrites = database.execute.mock.calls.filter(
      (call) => call[2] === connection,
    );
    expect(transactionalWrites).toHaveLength(3);
    expect(transactionalWrites[0][0]).toContain("INSERT INTO project_members");
    expect(transactionalWrites[1][0]).toContain(
      "DELETE FROM project_member_permission_grants",
    );
    expect(transactionalWrites[2][0]).toContain("SET status = 'ENDED'");
  });
});
