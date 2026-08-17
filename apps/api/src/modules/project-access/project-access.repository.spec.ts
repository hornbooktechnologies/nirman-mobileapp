/* eslint-disable @typescript-eslint/unbound-method */
import { DatabaseService } from '../../database/database.service';
import { ProjectAccessRepository } from './project-access.repository';

describe('ProjectAccessRepository assignment date windows', () => {
  const database = {
    query: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<DatabaseService>;
  const repository = new ProjectAccessRepository(database);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters the assigned-project list by active status and date window', async () => {
    await repository.findAccessibleProjects(
      'organization-id',
      'member-id',
      false,
    );

    const sql = database.query.mock.calls[0][0];
    expect(sql).toContain("pm.status = 'ACTIVE'");
    expect(sql).toContain('pm.starts_on <= CURRENT_DATE');
    expect(sql).toContain('pm.ends_on >= CURRENT_DATE');
  });

  it('requires an active assignment whose date window includes today', async () => {
    await repository.findActiveProjectMember(
      'organization-id',
      'project-id',
      'member-id',
    );

    const sql = database.query.mock.calls[0][0];
    expect(sql).toContain("status = 'ACTIVE'");
    expect(sql).toContain('starts_on <= CURRENT_DATE');
    expect(sql).toContain('ends_on >= CURRENT_DATE');
  });
});
