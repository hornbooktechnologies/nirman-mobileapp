import { useEffect, useState } from 'react';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { fetchOrganizationMembers, fetchProjectMembers } from '../members/services';
import { localTime } from './sales-rules';

export function useSalesAssignees() {
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const org = session?.activeOrganization?.id;
  const token = session?.accessToken;
  const projectId = project?.id;
  const canProject = permissions.includes('project-members:read');
  const canOrg = permissions.includes('members:read');
  const timezone = session?.activeOrganization?.workingTimezone || session?.activeOrganization?.timezone || 'Asia/Kolkata';
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setOptions([]); setError(false);
    if (!org || !projectId || !token || !canProject) return;
    void (async () => {
      try {
        const members = await fetchProjectMembers(org, projectId, token);
        const today = localTime(new Date().toISOString(), timezone).slice(0, 10);
        const choices = members.filter(m => m.status === 'ACTIVE' && (!m.startsOn || m.startsOn <= today) && (!m.endsOn || m.endsOn >= today)).map(m => ({ value: m.user.id, label: m.user.name }));
        if (canOrg) for (const m of await fetchOrganizationMembers(org, token)) {
          if (m.status === 'ACTIVE' && m.organizationWideProjectAccess && !choices.some(c => c.value === m.userId)) choices.push({ value: m.userId, label: m.user?.name ?? m.userId });
        }
        if (active) setOptions(choices);
      } catch { if (active) setError(true); }
    })();
    return () => { active = false; };
  }, [org, projectId, token, canProject, canOrg, timezone]);
  return { options, error };
}
