import { PROJECT_STATUSES, PROJECT_TYPES, type ProjectStatus, type ProjectType } from '@nirman-app/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppText, BottomSheet, Button, FilterGroup, FilterOption, LoadingState, OperationalEntityCard, SearchField } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { apiRequest } from '../../../lib/api';
import { useSession } from '../../../providers';
import { mobileText } from '../../../theme';
import type { Project } from '../types';

export function ProjectDirectory() {
  const { t } = useTranslation('projects');
  const { t: common } = useTranslation('common');
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProjectStatus | undefined>();
  const [type, setType] = useState<ProjectType | undefined>();
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Project[]>([]);
  const [pages, setPages] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
  const organizationId = session?.activeOrganization?.id;
  const token = session?.accessToken;
  const canRead = Boolean(session?.permissions.includes('projects:read'));
  useEffect(() => {
    let active = true;
    if (!open || !organizationId || !token || !canRead) return;
    const timer = setTimeout(() => {
      setLoading(true); setError('');
      const query = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search.trim()) query.set('search', search.trim());
      if (status) query.set('status', status);
      if (type) query.set('type', type);
      void apiRequest<{ data: Project[]; meta?: { pageCount: number } }>(`/organizations/${organizationId}/projects?${query}`, {}, { accessToken: token })
        .then(result => { if (active) { setRows(result.data); setPages(result.meta?.pageCount ?? 1); } })
        .catch(reason => { if (active) setError(getLocalizedErrorMessage(reason, t('detail.loadFailure'))); })
        .finally(() => { if (active) setLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [organizationId, token, canRead, open, page, search, status, type, retry, t]);
  if (!canRead) return null;
  return <>
    <Button label={t('directory.title')} variant="outline" onPress={() => setOpen(true)} />
    <BottomSheet visible={open} scroll title={t('directory.title')} onClose={() => setOpen(false)}>
      <SearchField accessibilityLabel={t('directory.search')} placeholder={t('directory.search')} value={search} onChangeText={value => { setSearch(value); setPage(1); }} />
      <FilterGroup label={t('form.fields.status')}><FilterOption label={t('directory.all')} selected={!status} onPress={() => { setStatus(undefined); setPage(1); }} />{PROJECT_STATUSES.map(value => <FilterOption key={value} label={t(`status.${value}`)} selected={status === value} onPress={() => { setStatus(value); setPage(1); }} />)}</FilterGroup>
      <FilterGroup label={t('form.fields.type')}><FilterOption label={t('directory.all')} selected={!type} onPress={() => { setType(undefined); setPage(1); }} />{PROJECT_TYPES.map(value => <FilterOption key={value} label={t(`type.${value}`)} selected={type === value} onPress={() => { setType(value); setPage(1); }} />)}</FilterGroup>
      {loading ? <LoadingState label={t('detail.loading')} /> : error ? <><AppText accessibilityRole="alert" style={mobileText.body}>{error}</AppText><Button label={common('actions.retry')} onPress={() => setRetry(value => value + 1)} /></> : <>
        {!rows.length ? <AppText style={mobileText.body}>{t('directory.empty')}</AppText> : null}
        {rows.map(row => <OperationalEntityCard key={row.id} contextLeading={row.projectCode || t('detail.defaultCode')} contextTrailing={t(`status.${row.status}`)} title={row.name} supporting={t(`type.${row.type}`)} onPress={() => { setOpen(false); router.push({ pathname: '/(app)/project-detail', params: { projectId: row.id } }); }} />)}
      </>}
      <AppText style={mobileText.caption}>{t('directory.page', { page, pages: Math.max(1, pages) })}</AppText>
      <Button label={t('directory.previous')} variant="outline" disabled={loading || page === 1} onPress={() => setPage(page - 1)} />
      <Button label={t('directory.next')} variant="outline" disabled={loading || page >= pages} onPress={() => setPage(page + 1)} />
    </BottomSheet>
  </>;
}
