import type { RoleDashboardResponse } from '@nirman-app/shared';
import { apiRequest } from '../../lib/api';

export async function fetchRoleDashboard(organizationId: string, projectId: string, accessToken: string) {
  const response = await apiRequest<{ data: RoleDashboardResponse }>(
    `/organizations/${organizationId}/projects/${projectId}/dashboard`,
    {},
    { accessToken },
  );
  return response.data;
}
