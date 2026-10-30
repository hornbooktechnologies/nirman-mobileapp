import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/ui';
import { useSession } from '../../providers';
import { mobileText } from '../../theme';
import { fetchProjectMembers } from './services';

export function ProjectMemberName({ organizationId, projectId, memberId, canRead }: { organizationId: string; projectId: string; memberId: string | null; canRead: boolean }) {
  const { session } = useSession();
  const { t } = useTranslation('materials');
  const token = session?.accessToken;
  const [name, setName] = useState('');
  useEffect(() => {
    let active = true;
    setName('');
    if (memberId && canRead && token) void fetchProjectMembers(organizationId, projectId, token)
      .then(rows => { if (active) setName(rows.find(row => row.memberId === memberId)?.user.name ?? ''); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [organizationId, projectId, memberId, token, canRead]);
  return <AppText style={mobileText.body}>{t('fields.responsible')}: {!memberId ? t('common.unassigned') : name || t('common.memberUnavailable')}</AppText>;
}
