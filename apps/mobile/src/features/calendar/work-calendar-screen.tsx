import { WEEKDAYS, type OrganizationWorkCalendar, type Weekday, type WorkingWeek, type WorkCalendarDayType, type WorkCalendarOverride, type EffectiveProjectWorkCalendarResponse } from '@nirman-app/shared';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, findNodeHandle, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon, AppText, Badge, BottomSheet, Button, Card, Chip, CompactScreenHeader, DateInput, EmptyState, FormError, FormField, IconButton, Input, NirmanScreenBackground } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { monthRange, monthValue, shiftMonth, todayDateOnly } from '../attendance/date-utils';
import { ProjectContextCard } from '../projects';
import { MonthCalendar } from './month-calendar';
import { createCalendarOverride, fetchOrganizationCalendar, fetchProjectCalendar, removeCalendarOverride, updateCalendarOverride, updateOrganizationCalendar, type CalendarScope } from './services';

type ScopeView = 'PROJECT' | 'ORGANIZATION';
type WeekPreset = 'SUNDAY_OFF' | 'NO_FIXED_OFF' | 'CUSTOM' | null;
type OverrideDraft = { startDate: string; endDate: string; dayType: WorkCalendarDayType; name: string; reason: string };

const emptyWeek = Object.fromEntries(WEEKDAYS.map((day) => [day, null])) as Record<Weekday, boolean | null>;

function inferPreset(week: WorkingWeek | null): WeekPreset {
  if (!week) return null;
  if (WEEKDAYS.every((day) => week[day])) return 'NO_FIXED_OFF';
  if (!week.SUNDAY && WEEKDAYS.filter((day) => day !== 'SUNDAY').every((day) => week[day])) return 'SUNDAY_OFF';
  return 'CUSTOM';
}

function presetWeek(preset: Exclude<WeekPreset, 'CUSTOM' | null>): WorkingWeek {
  return Object.fromEntries(WEEKDAYS.map((day) => [day, preset === 'NO_FIXED_OFF' || day !== 'SUNDAY'])) as WorkingWeek;
}

function friendlyError(error: unknown, fallback: string) {
  return getLocalizedErrorMessage(error, fallback);
}

export function WorkCalendarScreen() {
  const { t } = useTranslation('calendar');
  const { t: tCommon } = useTranslation('common');
  const { locale } = useLocalization();
  const { refreshSession, session, signOut } = useSession();
  const activeProject = getActiveProject(session);
  const projectPermissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canRead = projectPermissions.includes('work-calendar:read');
  const canUpdateOrganization = Boolean(session?.permissions.includes('work-calendar:update-organization'));
  const canUpdateProject = projectPermissions.includes('work-calendar:update-project');
  const [scope, setScope] = useState<ScopeView>('PROJECT');
  const [month, setMonth] = useState(monthValue());
  const [selectedDate, setSelectedDate] = useState(todayDateOnly());
  const [organizationCalendar, setOrganizationCalendar] = useState<OrganizationWorkCalendar | null>(null);
  const [projectCalendar, setProjectCalendar] = useState<EffectiveProjectWorkCalendarResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preset, setPreset] = useState<WeekPreset>(null);
  const [timezone, setTimezone] = useState('');
  const [week, setWeek] = useState<Record<Weekday, boolean | null>>(emptyWeek);
  const [weekError, setWeekError] = useState('');
  const [timezoneError, setTimezoneError] = useState('');
  const [weekApiError, setWeekApiError] = useState('');
  const [isSavingWeek, setIsSavingWeek] = useState(false);
  const [overrideSheet, setOverrideSheet] = useState<{ scope: CalendarScope; item: WorkCalendarOverride | null } | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft>({ startDate: '', endDate: '', dayType: 'NON_WORKING', name: '', reason: '' });
  const [overrideErrors, setOverrideErrors] = useState<Partial<Record<keyof OverrideDraft, string>>>({});
  const [overrideApiError, setOverrideApiError] = useState('');
  const [isMutatingOverride, setIsMutatingOverride] = useState(false);
  const requestId = useRef(0);
  const headingRef = useRef<View>(null);
  const sheetContext = useRef('');
  const contextKey = `${organizationId ?? ''}:${projectId ?? ''}`;
  const range = useMemo(() => monthRange(month), [month]);

  const applyOrganizationCalendar = useCallback((calendar: OrganizationWorkCalendar) => {
    setOrganizationCalendar(calendar);
    setTimezone(calendar.timezone);
    setWeek(calendar.workingWeek ? { ...calendar.workingWeek } : { ...emptyWeek });
    setPreset(inferPreset(calendar.workingWeek));
  }, []);

  const load = useCallback(async (background = false) => {
    if (!session?.accessToken || !organizationId || !canRead) return;
    const activeRequest = ++requestId.current;
    background ? setIsRefreshing(true) : setIsLoading(true);
    setError('');
    try {
      const [organizationResponse, projectResponse] = await Promise.all([
        fetchOrganizationCalendar(organizationId, session.accessToken),
        projectId ? fetchProjectCalendar(organizationId, projectId, range.startDate, range.endDate, session.accessToken) : Promise.resolve(null),
      ]);
      if (activeRequest !== requestId.current) return;
      applyOrganizationCalendar(organizationResponse);
      setProjectCalendar(projectResponse);
    } catch (loadError) {
      if (activeRequest !== requestId.current) return;
      if (loadError instanceof ApiRequestError && loadError.status === 401) {
        await signOut();
        return;
      }
      if (loadError instanceof ApiRequestError && loadError.status === 403) {
        setError(t('errors.accessChanged'));
        await refreshSession().catch(() => undefined);
      } else setError(friendlyError(loadError, t('errors.load')));
    } finally {
      if (activeRequest === requestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [applyOrganizationCalendar, canRead, organizationId, projectId, range.endDate, range.startDate, refreshSession, session?.accessToken, signOut, t]);

  useEffect(() => { void load(); }, [contextKey, month]); // request inputs intentionally drive loading.
  useEffect(() => {
    if (overrideSheet && sheetContext.current !== contextKey) {
      setOverrideSheet(null);
      setOverrideApiError('');
    }
  }, [contextKey, overrideSheet]);

  useEffect(() => {
    if (!overrideSheet) return;
    const stillAllowed = overrideSheet.scope === 'PROJECT' ? canUpdateProject : canUpdateOrganization;
    if (!stillAllowed) {
      setOverrideSheet(null);
      setOverrideApiError('');
      setSuccess(t('errors.accessChanged'));
      AccessibilityInfo.announceForAccessibility(t('errors.accessChanged'));
    }
  }, [canUpdateOrganization, canUpdateProject, overrideSheet, t]);

  const selectedDay = projectCalendar?.days.find((day) => day.date === selectedDate) ?? null;
  const currentOverrides = scope === 'PROJECT' ? projectCalendar?.projectOverrides ?? [] : organizationCalendar?.overrides ?? [];
  const canUpdateScope = scope === 'PROJECT' ? canUpdateProject : canUpdateOrganization;

  function changeMonth(nextMonth: string) {
    setMonth(nextMonth);
    const nextRange = monthRange(nextMonth);
    setSelectedDate(todayDateOnly() >= nextRange.startDate && todayDateOnly() <= nextRange.endDate ? todayDateOnly() : nextRange.startDate);
  }

  function choosePreset(nextPreset: Exclude<WeekPreset, null>) {
    setPreset(nextPreset);
    setWeekError('');
    if (nextPreset !== 'CUSTOM') setWeek(presetWeek(nextPreset));
  }

  async function saveWorkingWeek() {
    if (!organizationId || !session?.accessToken || isSavingWeek) return;
    const normalizedTimezone = timezone.trim();
    const missingDays = WEEKDAYS.filter((day) => typeof week[day] !== 'boolean');
    setTimezoneError(normalizedTimezone ? '' : t('weekly.timezoneRequired'));
    setWeekError(missingDays.length ? t('weekly.daysRequired') : '');
    setWeekApiError('');
    if (!normalizedTimezone || missingDays.length) return;
    setIsSavingWeek(true);
    try {
      const response = await updateOrganizationCalendar(organizationId, {
        timezone: normalizedTimezone,
        workingWeek: week as WorkingWeek,
      }, session.accessToken);
      applyOrganizationCalendar(response);
      setSuccess(t('success.weekSaved'));
      AccessibilityInfo.announceForAccessibility(t('success.weekSaved'));
      await load(true);
    } catch (saveError) {
      if (saveError instanceof ApiRequestError && saveError.status === 401) await signOut();
      else {
        if (saveError instanceof ApiRequestError && saveError.status === 403) await refreshSession().catch(() => undefined);
        setWeekApiError(friendlyError(saveError, t('errors.weekNotSaved')));
      }
    } finally {
      setIsSavingWeek(false);
    }
  }

  function openOverride(scopeValue: CalendarScope, item: WorkCalendarOverride | null = null) {
    const firstDate = scopeValue === 'PROJECT' ? selectedDate : range.startDate;
    sheetContext.current = contextKey;
    setOverrideSheet({ scope: scopeValue, item });
    setOverrideDraft(item ? {
      startDate: item.startDate,
      endDate: item.endDate,
      dayType: item.dayType,
      name: item.name,
      reason: item.reason ?? '',
    } : { startDate: firstDate, endDate: firstDate, dayType: 'NON_WORKING', name: '', reason: '' });
    setOverrideErrors({});
    setOverrideApiError('');
  }

  const overrideDirty = Boolean(overrideSheet) && (() => {
    const item = overrideSheet?.item;
    const original = item ? { startDate: item.startDate, endDate: item.endDate, dayType: item.dayType, name: item.name, reason: item.reason ?? '' } : { startDate: scope === 'PROJECT' ? selectedDate : range.startDate, endDate: scope === 'PROJECT' ? selectedDate : range.startDate, dayType: 'NON_WORKING' as const, name: '', reason: '' };
    return JSON.stringify(original) !== JSON.stringify(overrideDraft);
  })();

  function closeOverride(force = false) {
    if (isMutatingOverride) return;
    if (!force && overrideDirty) {
      Alert.alert(t('override.discardTitle'), t('override.discardMessage'), [
        { text: tCommon('actions.cancel'), style: 'cancel' },
        { text: t('actions.discard'), style: 'destructive', onPress: () => closeOverride(true) },
      ]);
      return;
    }
    setOverrideSheet(null);
    setOverrideApiError('');
    restoreHeadingFocus();
  }

  function restoreHeadingFocus() {
    setTimeout(() => {
      const handle = findNodeHandle(headingRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }, 300);
  }

  function validateOverride() {
    const errors: Partial<Record<keyof OverrideDraft, string>> = {};
    if (!overrideDraft.startDate) errors.startDate = t('override.startRequired');
    if (!overrideDraft.endDate) errors.endDate = t('override.endRequired');
    if (overrideDraft.startDate && overrideDraft.endDate && overrideDraft.endDate < overrideDraft.startDate) errors.endDate = t('override.rangeInvalid');
    if (!overrideDraft.name.trim()) errors.name = t('override.nameRequired');
    setOverrideErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveOverride() {
    if (!overrideSheet || !organizationId || !projectId || !session?.accessToken || isMutatingOverride || !validateOverride()) return;
    if (sheetContext.current !== contextKey) {
      setOverrideApiError(t('errors.contextChanged'));
      return;
    }
    setIsMutatingOverride(true);
    setOverrideApiError('');
    const input = {
      startDate: overrideDraft.startDate,
      endDate: overrideDraft.endDate,
      dayType: overrideDraft.dayType,
      name: overrideDraft.name.trim(),
      reason: overrideDraft.reason.trim() || null,
    };
    try {
      if (overrideSheet.item) await updateCalendarOverride(organizationId, projectId, overrideSheet.scope, overrideSheet.item.id, input, session.accessToken);
      else await createCalendarOverride(organizationId, projectId, overrideSheet.scope, input, session.accessToken);
      const message = t(overrideSheet.item ? 'success.overrideUpdated' : 'success.overrideCreated');
      setSuccess(message);
      setOverrideSheet(null);
      restoreHeadingFocus();
      AccessibilityInfo.announceForAccessibility(message);
      await load(true);
    } catch (saveError) {
      if (saveError instanceof ApiRequestError && saveError.status === 401) await signOut();
      else {
        if (saveError instanceof ApiRequestError && saveError.status === 403) await refreshSession().catch(() => undefined);
        setOverrideApiError(friendlyError(saveError, t('errors.overrideNotSaved')));
      }
    } finally {
      setIsMutatingOverride(false);
    }
  }

  function confirmRemoveOverride() {
    Alert.alert(t('override.removeTitle'), t('override.removeMessage'), [
      { text: t('override.keep'), style: 'cancel' },
      { text: t('override.removeConfirm'), style: 'destructive', onPress: () => void deleteOverride() },
    ]);
  }

  async function deleteOverride() {
    const item = overrideSheet?.item;
    if (!item || !overrideSheet || !organizationId || !projectId || !session?.accessToken || isMutatingOverride) return;
    setIsMutatingOverride(true);
    setOverrideApiError('');
    try {
      await removeCalendarOverride(organizationId, projectId, overrideSheet.scope, item.id, session.accessToken);
      setSuccess(t('success.overrideRemoved'));
      setOverrideSheet(null);
      restoreHeadingFocus();
      AccessibilityInfo.announceForAccessibility(t('success.overrideRemoved'));
      await load(true);
    } catch (removeError) {
      if (removeError instanceof ApiRequestError && removeError.status === 401) await signOut();
      else {
        if (removeError instanceof ApiRequestError && removeError.status === 403) await refreshSession().catch(() => undefined);
        setOverrideApiError(friendlyError(removeError, t('errors.overrideNotSaved')));
      }
    } finally {
      setIsMutatingOverride(false);
    }
  }

  return (
    <NirmanScreenBackground>
      <CompactScreenHeader
        copyRef={headingRef}
        leading={<IconButton accessibilityLabel={tCommon('actions.back')} icon="arrow-left" variant="glass" onPress={() => router.back()} />}
        title={t('title')}
        subtitle={activeProject?.name ?? t('project.none')}
      />
      <ProjectContextCard compact showSwitchAction />

      {!session?.activeOrganization ? <EmptyState title={t('empty.noOrganizationTitle')} description={t('empty.noOrganizationDescription')} />
        : session.projectAccess.projects.length === 0 ? <EmptyState title={t('empty.noAccessibleProjectsTitle')} description={t('empty.noAccessibleProjectsDescription')} />
        : !activeProject ? <EmptyState title={t('empty.noProjectTitle')} description={t('empty.noProjectDescription')} />
          : !canRead ? <EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} actionLabel={tCommon('actions.retry')} onAction={() => void refreshSession()} />
            : <>
              <View accessibilityRole="tablist" style={styles.scopeTabs}>
                {(['PROJECT', 'ORGANIZATION'] as const).map((value) => (
                  <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: scope === value }} onPress={() => setScope(value)} style={({ pressed }) => [styles.scopeTab, scope === value && styles.scopeTabSelected, pressed && styles.pressed]}>
                    <AppText style={[styles.scopeTabLabel, scope === value && styles.scopeTabLabelSelected]} weight={700}>{t(`scope.${value}`)}</AppText>
                  </Pressable>
                ))}
              </View>
              {success ? <Card accessibilityLiveRegion="polite" style={styles.successCard}><AppText style={styles.successText} weight={600}>{success}</AppText><Button fullWidth={false} label={tCommon('actions.close')} size="sm" variant="ghost" onPress={() => setSuccess('')} /></Card> : null}
              {isRefreshing ? <View style={styles.refreshing}><ActivityIndicator color={mobileTheme.color.action.primary} /><AppText style={styles.muted}>{t('loading.refreshing')}</AppText></View> : null}
              {error ? <EmptyState title={t('errors.loadTitle')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void load()} />
                : isLoading ? <View style={styles.loading}><ActivityIndicator color={mobileTheme.color.action.primary} /><AppText>{t('loading.calendar')}</AppText></View>
                  : scope === 'PROJECT' ? (
                    <>
                      <Card style={styles.monthControls}>
                        <View style={styles.monthRow}>
                          <IconButton accessibilityLabel={t('month.previous')} icon="chevron-left" variant="ghost" onPress={() => changeMonth(shiftMonth(month, -1))} />
                          <View style={styles.monthCopy}><AppText style={styles.monthTitle} weight={700}>{new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))}</AppText><Button fullWidth={false} label={t('month.today')} size="sm" variant="ghost" onPress={() => { setMonth(monthValue()); setSelectedDate(todayDateOnly()); }} /></View>
                          <IconButton accessibilityLabel={t('month.next')} icon="chevron-right" variant="ghost" onPress={() => changeMonth(shiftMonth(month, 1))} />
                        </View>
                        <AppText style={styles.precedence} weight={500}>{t('month.precedence')}</AppText>
                      </Card>
                      {!projectCalendar?.configured ? <EmptyState title={t('empty.notConfiguredTitle')} description={t('empty.notConfiguredDescription')} /> : projectCalendar ? <>
                        <Card style={styles.inheritanceCard}><AppIcon color={mobileTheme.color.text.brand} name="information-outline" size={mobileTheme.icon.md} /><View style={styles.flexCopy}><AppText style={styles.cardTitle} weight={700}>{selectedDay?.source === 'PROJECT_OVERRIDE' ? t('inheritance.projectOverride') : t('inheritance.organization')}</AppText><AppText style={styles.muted} weight={500}>{selectedDay?.source === 'PROJECT_OVERRIDE' ? t('inheritance.projectDescription') : t('inheritance.organizationDescription')}</AppText></View></Card>
                        <MonthCalendar calendar={projectCalendar} month={month} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
                        {selectedDay ? <Card style={styles.selectedDetail}><View style={styles.detailHeader}><View><AppText style={styles.cardTitle} weight={700}>{new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(`${selectedDay.date}T12:00:00`))}</AppText><AppText style={styles.muted} weight={500}>{t(`sources.${selectedDay.source}`)}</AppText></View><Badge label={t(`dayTypes.${selectedDay.dayType}`)} tone={selectedDay.isWorking ? 'success' : 'warning'} /></View>{selectedDay.override ? <><AppText style={styles.overrideName} weight={600}>{selectedDay.override.name}</AppText>{selectedDay.override.reason ? <AppText style={styles.muted}>{selectedDay.override.reason}</AppText> : null}</> : <AppText style={styles.muted}>{t('month.noDateOverride')}</AppText>}</Card> : null}
                      </> : null}
                      <OverrideSection title={t('override.projectTitle')} description={t('override.projectDescription')} items={currentOverrides} canUpdate={canUpdateScope} locale={locale} onAdd={() => openOverride('PROJECT')} onEdit={(item) => openOverride('PROJECT', item)} />
                    </>
                  ) : (
                    <>
                      <Card style={styles.weeklyCard}>
                        <View style={styles.sectionHeading}><View style={styles.flexCopy}><AppText style={styles.cardTitle} weight={700}>{t('weekly.title')}</AppText><AppText style={styles.muted} weight={500}>{organizationCalendar?.configured ? t('weekly.configuredDescription') : t('weekly.unconfiguredDescription')}</AppText></View><Badge label={t(organizationCalendar?.configured ? 'weekly.configured' : 'weekly.setupNeeded')} tone={organizationCalendar?.configured ? 'success' : 'warning'} /></View>
                        {canUpdateOrganization ? <>
                          <FormError message={weekApiError} />
                          <FormField label={t('weekly.timezone')} required error={timezoneError}><Input autoCapitalize="none" accessibilityLabel={t('weekly.timezone')} invalid={Boolean(timezoneError)} value={timezone} onChangeText={setTimezone} /></FormField>
                          <FormField label={t('weekly.quickChoice')} required error={weekError}>
                            <View style={styles.choiceWrap}>{(['SUNDAY_OFF', 'NO_FIXED_OFF', 'CUSTOM'] as const).map((value) => <Chip key={value} label={t(`weekly.presets.${value}`)} selected={preset === value} style={styles.presetChip} onPress={() => choosePreset(value)} />)}</View>
                          </FormField>
                          {(preset === 'CUSTOM' || organizationCalendar?.configured) ? <View style={styles.weekdayChoices}>{WEEKDAYS.map((day) => <FormField key={day} label={t(`weekdays.${day}`)} required error={weekError && week[day] === null ? t('weekly.chooseDay') : undefined}><View style={styles.dayChoiceRow}><Chip label={t('weekly.working')} selected={week[day] === true} style={styles.dayChoice} onPress={() => { setWeek((current) => ({ ...current, [day]: true })); setPreset('CUSTOM'); setWeekError(''); }} /><Chip label={t('weekly.nonWorking')} selected={week[day] === false} style={styles.dayChoice} onPress={() => { setWeek((current) => ({ ...current, [day]: false })); setPreset('CUSTOM'); setWeekError(''); }} /></View></FormField>)}</View> : null}
                          <Button disabled={isSavingWeek} label={isSavingWeek ? t('weekly.saving') : t('weekly.save')} onPress={() => void saveWorkingWeek()} />
                        </> : organizationCalendar?.workingWeek ? <View style={styles.weekReadOnly}>{WEEKDAYS.map((day) => <View key={day} style={styles.weekReadOnlyRow}><AppText style={styles.flexCopy} weight={600}>{t(`weekdays.${day}`)}</AppText><Badge label={t(organizationCalendar.workingWeek![day] ? 'weekly.working' : 'weekly.nonWorking')} tone={organizationCalendar.workingWeek![day] ? 'success' : 'neutral'} /></View>)}</View> : <AppText style={styles.muted}>{t('weekly.noAssumption')}</AppText>}
                        {!canUpdateOrganization ? <AppText style={styles.readOnly} weight={500}>{t('weekly.readOnly')}</AppText> : null}
                      </Card>
                      <OverrideSection title={t('override.organizationTitle')} description={t('override.organizationDescription')} items={currentOverrides} canUpdate={canUpdateScope} locale={locale} onAdd={() => openOverride('ORGANIZATION')} onEdit={(item) => openOverride('ORGANIZATION', item)} />
                    </>
                  )}
            </>}

      {overrideSheet ? <BottomSheet visible scroll showCloseButton={false} title={t(overrideSheet.item ? 'override.editTitle' : 'override.addTitle', { scope: t(`scope.${overrideSheet.scope}`) })} description={t('override.sheetDescription')} onClose={() => closeOverride()} footer={<View style={styles.sheetActions}><Button disabled={isMutatingOverride} label={tCommon('actions.cancel')} variant="secondary" onPress={() => closeOverride()} />{overrideSheet.item ? <Button disabled={isMutatingOverride || (overrideSheet.scope === 'PROJECT' ? !canUpdateProject : !canUpdateOrganization)} label={t('override.remove')} variant="danger" onPress={confirmRemoveOverride} /> : null}<Button disabled={isMutatingOverride || (overrideSheet.scope === 'PROJECT' ? !canUpdateProject : !canUpdateOrganization)} label={isMutatingOverride ? t('override.saving') : t(overrideSheet.item ? 'override.update' : 'override.save')} onPress={() => void saveOverride()} /></View>}>
        <FormError message={overrideApiError} />
        <FormField label={t('override.startDate')} required error={overrideErrors.startDate}><DateInput allowClear={false} accessibilityLabel={t('override.startDate')} invalid={Boolean(overrideErrors.startDate)} value={overrideDraft.startDate} onChangeText={(startDate) => setOverrideDraft((current) => ({ ...current, startDate }))} /></FormField>
        <FormField label={t('override.endDate')} required error={overrideErrors.endDate}><DateInput allowClear={false} accessibilityLabel={t('override.endDate')} invalid={Boolean(overrideErrors.endDate)} minimumDate={overrideDraft.startDate ? new Date(`${overrideDraft.startDate}T12:00:00`) : undefined} value={overrideDraft.endDate} onChangeText={(endDate) => setOverrideDraft((current) => ({ ...current, endDate }))} /></FormField>
        <FormField label={t('override.dayType')} required><View style={styles.choiceWrap}>{(['NON_WORKING', 'SPECIAL_WORKING'] as const).map((type) => <Chip key={type} accessibilityRole="radio" accessibilityState={{ selected: overrideDraft.dayType === type }} label={t(`dayTypes.${type}`)} selected={overrideDraft.dayType === type} style={styles.presetChip} onPress={() => setOverrideDraft((current) => ({ ...current, dayType: type }))} />)}</View></FormField>
        <FormField label={t('override.name')} required error={overrideErrors.name}><Input accessibilityLabel={t('override.name')} invalid={Boolean(overrideErrors.name)} maxLength={160} value={overrideDraft.name} onChangeText={(name) => setOverrideDraft((current) => ({ ...current, name }))} /></FormField>
        <FormField label={t('override.reason')} optional><Input accessibilityLabel={t('override.reason')} maxLength={2000} multiline numberOfLines={4} style={styles.notesInput} textAlignVertical="top" value={overrideDraft.reason} onChangeText={(reason) => setOverrideDraft((current) => ({ ...current, reason }))} /></FormField>
      </BottomSheet> : null}
    </NirmanScreenBackground>
  );
}

function OverrideSection({ title, description, items, canUpdate, locale, onAdd, onEdit }: { title: string; description: string; items: WorkCalendarOverride[]; canUpdate: boolean; locale: string; onAdd: () => void; onEdit: (item: WorkCalendarOverride) => void }) {
  const { t } = useTranslation('calendar');
  const date = (value: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
  return <Card style={styles.overrideSection}><View style={styles.sectionHeading}><View style={styles.flexCopy}><AppText style={styles.cardTitle} weight={700}>{title}</AppText><AppText style={styles.muted} weight={500}>{description}</AppText></View>{canUpdate ? <Button fullWidth={false} label={t('override.add')} leadingIcon="plus" size="sm" variant="secondary" onPress={onAdd} /> : null}</View>{items.length ? <View style={styles.overrideList}>{items.map((item) => <View key={item.id} style={styles.overrideRow}><View style={styles.flexCopy}><View style={styles.overrideMeta}><Badge label={t(`scope.${item.scope}`)} tone="info" /><Badge label={t(`dayTypes.${item.dayType}`)} tone={item.dayType === 'NON_WORKING' ? 'warning' : 'success'} /></View><AppText style={styles.overrideName} weight={700}>{item.name}</AppText><AppText style={styles.muted} weight={500}>{t('override.range', { start: date(item.startDate), end: date(item.endDate) })}</AppText>{item.reason ? <AppText style={styles.muted}>{item.reason}</AppText> : null}</View>{canUpdate ? <Button fullWidth={false} label={t('actions.edit')} size="sm" variant="ghost" onPress={() => onEdit(item)} /> : null}</View>)}</View> : <AppText style={styles.emptyCopy} weight={500}>{t('override.empty')}</AppText>}{!canUpdate ? <AppText style={styles.readOnly} weight={500}>{t('override.readOnly')}</AppText> : null}</Card>;
}

const styles = StyleSheet.create({
  scopeTabs: { backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.subtle, borderRadius: mobileTheme.component.field.radius, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[1], padding: mobileTheme.spacing[1] },
  scopeTab: { alignItems: 'center', borderRadius: mobileTheme.radius.md, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: mobileTheme.spacing[2] },
  scopeTabSelected: { backgroundColor: mobileTheme.color.action.active },
  scopeTabLabel: { ...mobileText.label, color: mobileTheme.color.text.secondary, textAlign: 'center' },
  scopeTabLabelSelected: { color: mobileTheme.color.text.inverse },
  pressed: { opacity: 0.78 },
  successCard: { alignItems: 'center', borderColor: mobileTheme.color.status.success.border, flexDirection: 'row', gap: mobileTheme.spacing[2], justifyContent: 'space-between' },
  successText: { ...mobileText.body, color: mobileTheme.color.status.success.foreground, flex: 1 },
  refreshing: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  loading: { alignItems: 'center', gap: mobileTheme.spacing[3], justifyContent: 'center', minHeight: 180 },
  monthControls: { gap: mobileTheme.spacing[2] },
  monthRow: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  monthCopy: { alignItems: 'center', flex: 1, gap: mobileTheme.spacing[1] },
  monthTitle: { ...mobileText.sectionTitle, textAlign: 'center' },
  precedence: { ...mobileText.caption, color: mobileTheme.color.text.secondary, textAlign: 'center' },
  inheritanceCard: { alignItems: 'flex-start', borderColor: mobileTheme.color.status.info.border, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  flexCopy: { flex: 1 },
  cardTitle: { ...mobileText.sectionTitle, fontSize: 18, lineHeight: 24 },
  muted: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  selectedDetail: { gap: mobileTheme.spacing[3] },
  detailHeader: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  overrideName: { ...mobileText.body, color: mobileTheme.color.text.primary },
  weeklyCard: { gap: mobileTheme.spacing[4] },
  sectionHeading: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  presetChip: { minHeight: 48 },
  weekdayChoices: { gap: mobileTheme.spacing[4] },
  dayChoiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  dayChoice: { flexGrow: 1, minHeight: 48 },
  weekReadOnly: { gap: mobileTheme.spacing[2] },
  weekReadOnlyRow: { alignItems: 'center', borderBottomColor: mobileTheme.color.border.subtle, borderBottomWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 48 },
  readOnly: { ...mobileText.caption, backgroundColor: mobileTheme.color.status.info.background, borderRadius: mobileTheme.radius.md, color: mobileTheme.color.status.info.foreground, padding: mobileTheme.spacing[3] },
  overrideSection: { gap: mobileTheme.spacing[4] },
  overrideList: { gap: mobileTheme.spacing[3] },
  overrideRow: { alignItems: 'flex-start', borderTopColor: mobileTheme.color.border.subtle, borderTopWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[2], paddingTop: mobileTheme.spacing[3] },
  overrideMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2], marginBottom: mobileTheme.spacing[2] },
  emptyCopy: { ...mobileText.body, borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.md, borderStyle: 'dashed', borderWidth: 1, color: mobileTheme.color.text.secondary, padding: mobileTheme.spacing[4], textAlign: 'center' },
  sheetActions: { flex: 1, gap: mobileTheme.spacing[2] },
  notesInput: { minHeight: 104, paddingTop: mobileTheme.spacing[3] },
});
