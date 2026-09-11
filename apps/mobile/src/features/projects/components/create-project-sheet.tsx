import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { BottomSheet, Button, FormError } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { useSession } from '../../../providers';
import { createProject } from '../services';
import type { Project, ProjectInput } from '../types';
import { ProjectFormSheet } from './project-form-sheet';

export function CreateProjectSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('projects');
  const { session, refreshSession } = useSession();
  const [saving, setSaving] = useState(false);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const busy = useRef(false);
  const canCreate = Boolean(session?.activeOrganization && session.permissions.includes('projects:create'));

  async function openProject(project: Project) {
    setRefreshError('');
    try {
      await refreshSession(project.id);
      onClose();
      router.push({ pathname: '/(app)/project-detail', params: { projectId: project.id } });
    } catch (error) {
      // Creation already succeeded. Retrying here must never issue another POST.
      setRefreshError(getLocalizedErrorMessage(error, t('form.errors.refreshFailed')));
    }
  }

  async function submit(input: ProjectInput) {
    if (busy.current || !canCreate || !session?.activeOrganization) return;
    busy.current = true;
    setSaving(true);
    try {
      const project = await createProject(session.activeOrganization.id, session.accessToken, input);
      setCreatedProject(project);
      await openProject(project);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  if (!canCreate) return null;

  if (createdProject) {
    return (
      <BottomSheet visible title={t('form.createdTitle')} description={t('form.createdDescription', { name: createdProject.name })} onClose={() => { if (!busy.current) onClose(); }}>
        <FormError message={refreshError} />
        <Button label={saving ? t('detail.loading') : t('form.actions.openProject')} disabled={saving} onPress={() => {
          if (busy.current) return;
          busy.current = true;
          setSaving(true);
          void openProject(createdProject).finally(() => { busy.current = false; setSaving(false); });
        }} />
      </BottomSheet>
    );
  }

  return <ProjectFormSheet saving={saving} onClose={() => { if (!busy.current) onClose(); }} onSave={submit} />;
}
