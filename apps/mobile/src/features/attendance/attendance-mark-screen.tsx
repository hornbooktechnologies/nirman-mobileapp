import { attendanceRowActions } from '@nirman-app/shared';
import { AttendanceReadRequest } from "./attendance-read-request";
import { RefreshFlatList } from "../../components/ui/refresh-control";
import type {
  AttendanceSummaryResponse,
  AttendanceSummaryRow,
  DerivedAttendanceState,
} from "@nirman-app/shared";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Alert,
  findNodeHandle,
  StyleSheet,
  View,
  type ViewInstance,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useRefreshOnFocus } from "../../lib/use-refresh-on-focus";

import {
  AppText,
  Badge,
  Button,
  Card,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormField,
  IconButton,
  ListControls,
  LottieLoader,
  NirmanScreenBackground,
  SearchField,
  Toggle,
} from "../../components/ui";
import { getLocalizedErrorMessage } from "../../i18n";
import { ApiRequestError } from "../../lib/api";
import { getActiveProject, getActiveProjectPermissions } from "../../lib/auth";
import { useLocalization, useSession } from "../../providers";
import { mobileText, mobileTheme } from "../../theme";
import { CustomerTabBar } from "../home/components";
import { ProjectContextCard } from "../projects";
import {
  AttendanceExceptionSheet,
  emptyAttendanceExceptionDraft,
  type AttendanceExceptionDraft,
} from "./attendance-exception-sheet";
import { DailyAttendanceTotals } from "./attendance-ui";
import { todayDateOnly } from "./date-utils";
import {
  createAttendanceException,
  fetchAttendanceSummary,
  removeAttendanceException,
  updateAttendanceException,
} from "./services";

const PAGE_SIZE = 30;

const stateTones: Record<
  DerivedAttendanceState,
  "success" | "warning" | "danger" | "neutral"
> = {
  PRESENT: "success",
  HALF_DAY: "warning",
  ABSENT: "danger",
  NON_WORKING: "neutral",
};

const DailyWorkerCard = memo(function DailyWorkerCard({
  canCreate,
  canUpdate,
  row,
  onEdit,
  onRestore,
  onHistory,
  busy,
}: {
  busy: boolean;
  onHistory: (row: AttendanceSummaryRow) => void;
  canCreate: boolean;
  canUpdate: boolean;
  row: AttendanceSummaryRow;
  onEdit: (row: AttendanceSummaryRow) => void;
  onRestore: (row: AttendanceSummaryRow) => void;
}) {
  const { t } = useTranslation("attendance");
  const state = row.selectedDate?.state ?? "NON_WORKING";
  const actions = attendanceRowActions(row.selectedDate, ["attendance:read", ...(canCreate ? ["attendance:mark"] : []), ...(canUpdate ? ["attendance:update"] : [])]);

  return (
    <Card style={styles.workerCard}>
      <View style={styles.workerTopRow}>
        <View
          accessible
          accessibilityLabel={t("workerCard.a11y", {
            name: row.worker.name,
            code: row.worker.workerCode,
            trade: row.worker.trade,
            state: t(`states.${state}`),
          })}
          style={styles.workerIdentity}
        >
          <AppText style={styles.workerName} weight={700}>
            {row.worker.name}
          </AppText>
          <AppText style={styles.workerMeta} weight={500}>
            {row.worker.workerCode} · {row.worker.trade}
          </AppText>
        </View>
        <Badge
          accessibilityLabel={t("workerCard.stateA11y", {
            state: t(`states.${state}`),
          })}
          label={t(`states.${state}`)}
          tone={stateTones[state]}
        />
      </View>
      {actions.mark ? (
        <Button
          accessibilityHint={t("workerCard.markHint")}
          disabled={busy}
          label={t("actions.markAbsent")}
          onPress={() => onEdit(row)}
        />
      ) : actions.edit || actions.restore ? (
        <View style={styles.rowActions}>
          {actions.edit ? <Button
            disabled={busy}
            fullWidth={false}
            label={t("actions.editAttendance")}
            style={styles.rowAction}
            variant="secondary"
            onPress={() => onEdit(row)}
          /> : null}
          <Button
            disabled={busy}
            fullWidth={false}
            label={t("actions.restorePresent")}
            style={styles.rowAction}
            variant="danger"
            onPress={() => onRestore(row)}
          />
        </View>
      ) : state === "NON_WORKING" ? (
        <AppText style={styles.cardNote} weight={500}>
          {t("workerCard.nonWorking")}
        </AppText>
      ) : (
        <AppText style={styles.cardNote} weight={500}>
          {t("workerCard.readOnly")}
        </AppText>
      )}
      <Button label={t("actions.viewAttendance")} variant="ghost" onPress={() => onHistory(row)} />
    </Card>
  );
});

export function AttendanceMarkScreen() {
  const params = useLocalSearchParams<{ date?: string; workerSearch?: string; projectId?: string }>();
  const { t } = useTranslation("attendance");
  const { t: tCommon } = useTranslation("common");
  const { locale } = useLocalization();
  const { refreshSession, session, signOut } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canRead = permissions.includes("attendance:read");
  const canCreate = permissions.includes("attendance:mark");
  const canUpdate = permissions.includes("attendance:update");
  const workingTimezone = session?.activeOrganization?.workingTimezone ?? session?.activeOrganization?.timezone;
  const [date, setDate] = useState(() => params.date ?? todayDateOnly(workingTimezone));
  const [search, setSearch] = useState(params.workerSearch ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(params.workerSearch ?? "");
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingRow, setEditingRow] = useState<AttendanceSummaryRow | null>(
    null,
  );
  const [draft, setDraft] = useState<AttendanceExceptionDraft>(
    emptyAttendanceExceptionDraft,
  );
  const [formError, setFormError] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const readRequest = useRef(new AttendanceReadRequest());
  const sessionActions = useRef({ refreshSession, signOut });
  sessionActions.current = { refreshSession, signOut };
  const hasData = useRef(false);
  hasData.current = Boolean(summary);
  const cancelRead = useCallback(() => {
    readRequest.current.cancel();
    setIsLoading(false);
    setIsRefreshing(false);
    setIsLoadingMore(false);
  }, []);
  const headingRef = useRef<ViewInstance>(null);
  const contextKey = `${organizationId ?? ""}:${projectId ?? ""}`;
  const sheetContextKey = useRef(contextKey);
  const originalDraft = editingRow
    ? {
        duration: editingRow.selectedDate?.exception?.duration ?? "FULL_DAY",
        reasonCode: editingRow.selectedDate?.exception?.reasonCode ?? "",
        notes: editingRow.selectedDate?.exception?.notes ?? "",
      }
    : null;
  const dirty =
    Boolean(originalDraft) &&
    (draft.duration !== originalDraft!.duration ||
      draft.reasonCode !== originalDraft!.reasonCode ||
      draft.notes !== originalDraft!.notes);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search.trim()),
      search.trim() ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [search]);

  const latestReadScope = useRef(
    `${organizationId}:${projectId}:${date}:${debouncedSearch}:${exceptionsOnly}`,
  );
  latestReadScope.current = `${organizationId}:${projectId}:${date}:${debouncedSearch}:${exceptionsOnly}`;

  const load = useCallback(
    async (page = 1, background = false, force = false) => {
      if (!session?.accessToken || !organizationId || !projectId || !canRead)
        return;
      // Ignore a delayed reload from a mutation belonging to an old filter/Project.
      if (
        latestReadScope.current !==
        `${organizationId}:${projectId}:${date}:${debouncedSearch}:${exceptionsOnly}`
      )
        return;
      if (force) readRequest.current.cancel();
      const request = readRequest.current.start(
        `${organizationId}:${projectId}:${date}:${debouncedSearch}:${exceptionsOnly}:${page}`,
      );
      if (!request) return;
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      if (page > 1) setIsLoadingMore(true);
      else if (background && hasData.current) setIsRefreshing(true);
      else setIsLoading(true);
      if (page === 1) setError("");
      try {
        const response = await fetchAttendanceSummary(
          organizationId,
          projectId,
          {
            startDate: date,
            endDate: date,
            selectedDate: date,
            exceptionsOnly: exceptionsOnly || undefined,
            search: debouncedSearch || undefined,
            page,
            pageSize: PAGE_SIZE,
          },
          session.accessToken,
          request.signal,
        );
        if (!request.isCurrent()) return;
        setSummary((current) =>
          page === 1
            ? response
            : {
                ...response,
                rows: [...(current?.rows ?? []), ...response.rows],
              },
        );
      } catch (loadError) {
        if (!request.isCurrent()) return;
        if (loadError instanceof ApiRequestError && loadError.status === 401) {
          await sessionActions.current.signOut();
          return;
        }
        if (loadError instanceof ApiRequestError && loadError.status === 403) {
          setError(t("errors.accessChanged"));
          await sessionActions.current.refreshSession().catch(() => undefined);
        } else {
          setError(getLocalizedErrorMessage(loadError, t("errors.loadDaily")));
        }
      } finally {
        if (request.isCurrent()) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
          request.finish();
        }
      }
    },
    [
      canRead,
      date,
      debouncedSearch,
      exceptionsOnly,
      organizationId,
      projectId,
      session?.accessToken,
      t,
    ],
  );

  useRefreshOnFocus({
    scopeKey: `${contextKey}:${date}:${debouncedSearch}:${exceptionsOnly}`,
    refresh: load,
    cancel: cancelRead,
    reset: () => {
      hasData.current = false;
      setSummary(null);
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
      setSuccess("");
    },
  });

  useEffect(() => {
    if (!editingRow || sheetContextKey.current === contextKey) return;
    setFormError(t("errors.contextChanged"));
  }, [contextKey, editingRow, t]);

  useEffect(() => {
    if (!editingRow) return;
    const stillAllowed =
      canRead && (editingRow.selectedDate?.exception ? canUpdate : canCreate);
    if (!stillAllowed) {
      setFormError(t("errors.accessChangedRetained"));
      AccessibilityInfo.announceForAccessibility(
        t("errors.accessChangedRetained"),
      );
    }
  }, [canCreate, canRead, canUpdate, editingRow, t]);

  function restoreHeadingFocus() {
    setTimeout(() => {
      const handle = findNodeHandle(headingRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }, 300);
  }

  function openSheet(row: AttendanceSummaryRow) {
    const exception = row.selectedDate?.exception;
    sheetContextKey.current = contextKey;
    setDraft({
      duration: exception?.duration ?? "FULL_DAY",
      reasonCode: exception?.reasonCode ?? "",
      notes: exception?.notes ?? "",
    });
    setFormError("");
    setEditingRow(row);
  }

  function closeSheet(force = false) {
    if (isMutating) return;
    if (!force && dirty) {
      Alert.alert(t("sheet.discardTitle"), t("sheet.discardMessage"), [
        { text: tCommon("actions.cancel"), style: "cancel" },
        {
          text: t("actions.discard"),
          style: "destructive",
          onPress: () => closeSheet(true),
        },
      ]);
      return;
    }
    setEditingRow(null);
    setFormError("");
    restoreHeadingFocus();
  }

  async function saveException() {
    if (
      !editingRow ||
      !organizationId ||
      !projectId ||
      !session?.accessToken ||
      isMutating
    )
      return;
    const exception = editingRow.selectedDate?.exception;
    const stillAllowed = canRead && (exception ? canUpdate : canCreate);
    if (sheetContextKey.current !== contextKey) {
      setFormError(t("errors.contextChanged"));
      return;
    }
    if (!stillAllowed) {
      setFormError(t("errors.accessChangedRetained"));
      return;
    }
    setIsMutating(true);
    setFormError("");
    const input = {
      duration: draft.duration,
      reasonCode: draft.reasonCode.trim() || null,
      notes: draft.notes.trim() || null,
    };
    try {
      if (exception) {
        await updateAttendanceException(
          organizationId,
          projectId,
          exception.id,
          input,
          session.accessToken,
        );
      } else {
        await createAttendanceException(
          organizationId,
          projectId,
          {
            workerAssignmentId: editingRow.workerAssignmentId,
            workDate: date,
            exceptionType: "ABSENCE",
            ...input,
          },
          session.accessToken,
        );
      }
      const message = t(exception ? "success.updated" : "success.created");
      setSuccess(message);
      setEditingRow(null);
      restoreHeadingFocus();
      AccessibilityInfo.announceForAccessibility(message);
      await load(1, true, true);
    } catch (saveError) {
      if (saveError instanceof ApiRequestError && saveError.status === 401)
        await signOut();
      else {
        if (saveError instanceof ApiRequestError && saveError.status === 403)
          await refreshSession().catch(() => undefined);
        setFormError(getLocalizedErrorMessage(saveError, t("errors.notSaved")));
      }
    } finally {
      setIsMutating(false);
    }
  }

  function confirmRestore(row: AttendanceSummaryRow) {
    Alert.alert(t("remove.title"), t("remove.message"), [
      { text: t("remove.keep"), style: "cancel" },
      {
        text: t("actions.restorePresent"),
        style: "destructive",
        onPress: () => void restorePresent(row),
      },
    ]);
  }

  async function restorePresent(row: AttendanceSummaryRow) {
    const exception = row.selectedDate?.exception;
    if (
      !exception ||
      !organizationId ||
      !projectId ||
      !session?.accessToken ||
      isMutating ||
      !canUpdate
    )
      return;
    setIsMutating(true);
    setError("");
    try {
      await removeAttendanceException(
        organizationId,
        projectId,
        exception.id,
        session.accessToken,
      );
      const message = t("success.removed");
      setSuccess(message);
      AccessibilityInfo.announceForAccessibility(message);
      await load(1, true, true);
    } catch (removeError) {
      if (removeError instanceof ApiRequestError && removeError.status === 401)
        await signOut();
      else {
        if (
          removeError instanceof ApiRequestError &&
          removeError.status === 403
        )
          await refreshSession().catch(() => undefined);
        setError(getLocalizedErrorMessage(removeError, t("errors.notSaved")));
      }
    } finally {
      setIsMutating(false);
    }
  }

  const header = (
    <View style={styles.headerContent}>
      <CompactScreenHeader
        copyRef={headingRef}
        leading={
          <IconButton
            accessibilityLabel={tCommon("actions.back")}
            icon="arrow-left"
            variant="glass"
            onPress={() => router.back()}
          />
        }
        title={t("markScreen.title")}
        subtitle={activeProject?.name ?? t("project.none")}
      />
      <ProjectContextCard compact showSwitchAction />
      <Card style={styles.dateCard}>
        <View style={styles.sectionHeading}>
          <AppText style={styles.sectionTitle} weight={700}>
            {t("markScreen.dateTitle")}
          </AppText>
          <AppText style={styles.sectionDescription} weight={500}>
            {t("markScreen.description")}
          </AppText>
        </View>
        <FormField label={t("period.attendanceDate")} required>
          <DateInput
            allowClear={false}
            accessibilityLabel={t("period.selectDate")}
            value={date}
            onChangeText={(value) => value && setDate(value)}
          />
        </FormField>
      </Card>
      {canRead && summary ? (
        <DailyAttendanceTotals locale={locale} totals={summary.totals} />
      ) : null}
      {success ? (
        <Card accessibilityLiveRegion="polite" style={styles.successCard}>
          <AppText style={styles.successText} weight={600}>
            {success}
          </AppText>
          <Button
            fullWidth={false}
            label={tCommon("actions.close")}
            size="sm"
            variant="ghost"
            onPress={() => setSuccess("")}
          />
        </Card>
      ) : null}
      <ListControls>
        <SearchField
          debounceMs={0}
          accessibilityLabel={t("filters.searchA11y")}
          placeholder={t("filters.searchPlaceholder")}
          value={search}
          onChangeText={setSearch}
        />
        <Toggle accessibilityRole="checkbox" accessibilityState={{ checked: exceptionsOnly }} label={t("filters.exceptionsOnly")} value={exceptionsOnly} onValueChange={setExceptionsOnly} />
      </ListControls>
      {!canCreate && !canUpdate && canRead ? (
        <Card>
          <AppText style={styles.cardNote} weight={500}>
            {t("markScreen.readOnly")}
          </AppText>
        </Card>
      ) : null}
      {isRefreshing ? (
        <View accessibilityLiveRegion="polite" style={styles.refreshing}>
          <LottieLoader size={24} />
          <AppText style={styles.cardNote}>{t("loading.refreshing")}</AppText>
        </View>
      ) : null}
      {error ? (
        <EmptyState
          title={t("errors.dailyTitle")}
          description={error}
          actionLabel={tCommon("actions.retry")}
          onAction={() => void load(1)}
        />
      ) : null}
    </View>
  );

  const noContext =
    !session?.activeOrganization || !activeProject ? (
      <EmptyState
        title={t("empty.noProjectTitle")}
        description={t("empty.noProjectDescription")}
      />
    ) : !canRead ? (
      <EmptyState
        title={t("empty.permissionTitle")}
        description={t("empty.permissionDescription")}
        actionLabel={tCommon("actions.retry")}
        onRefresh={() => refreshSession()}
      />
    ) : null;
  const rows = noContext || error ? [] : (summary?.rows ?? []);

  return (
    <NirmanScreenBackground
      footer={<CustomerTabBar activeKey="attendance" />}
      scroll={false}
    >
      <RefreshFlatList
        busy={isLoading || isRefreshing}
        data={rows}
        keyExtractor={(row) => row.workerAssignmentId}
        renderItem={({ item }) => (
          <DailyWorkerCard
            busy={isMutating}
            canCreate={canCreate}
            canUpdate={canUpdate}
            row={item}
            onEdit={openSheet}
            onRestore={confirmRestore}
            onHistory={(row) => router.push({ pathname: "/(app)/worker-attendance", params: { workerId: row.worker.id, workerName: row.worker.name, workerCode: row.worker.workerCode, workerTrade: row.worker.trade, projectId: projectId ?? "", startDate: date, endDate: date } } as Href)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          noContext ??
          (isLoading ? (
            <View style={styles.loading}>
              <LottieLoader />
              <AppText>{t("loading.daily")}</AppText>
            </View>
          ) : !error ? (
            <EmptyState
              title={
                debouncedSearch || exceptionsOnly
                  ? t("empty.noMatchesTitle")
                  : t("empty.noDailyWorkersTitle")
              }
              description={
                debouncedSearch || exceptionsOnly
                  ? t("empty.noMatchesDescription")
                  : t("empty.noDailyWorkersDescription")
              }
            />
          ) : undefined)
        }
        ListFooterComponent={
          summary && summary.meta.page < summary.meta.totalPages ? (
            <Button
              disabled={isLoadingMore}
              label={isLoadingMore ? t("loading.more") : t("actions.loadMore")}
              variant="secondary"
              onPress={() => void load(summary.meta.page + 1)}
            />
          ) : undefined
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        showsVerticalScrollIndicator={false}
        onRefresh={() => load(1, true)}
      />

      {editingRow ? (
        <AttendanceExceptionSheet
          canSave={
            canRead &&
            sheetContextKey.current === contextKey &&
            (editingRow.selectedDate?.exception ? canUpdate : canCreate)
          }
          date={date}
          draft={draft}
          error={formError}
          locale={locale}
          projectName={activeProject?.name ?? ""}
          row={editingRow}
          saving={isMutating}
          onChange={setDraft}
          onClose={() => closeSheet()}
          onSave={() => void saveException()}
        />
      ) : null}
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: mobileTheme.spacing[4],
    paddingBottom: mobileTheme.spacing[4],
  },
  headerContent: {
    gap: mobileTheme.spacing[4],
    marginBottom: mobileTheme.spacing[1],
  },
  dateCard: { gap: mobileTheme.spacing[4] },
  sectionHeading: { gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle },
  sectionDescription: { ...mobileText.body },
  workerCard: { gap: mobileTheme.spacing[4] },
  workerTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing[3],
    justifyContent: "space-between",
  },
  workerIdentity: { flex: 1, gap: mobileTheme.spacing[1], minWidth: 180 },
  workerName: { ...mobileText.sectionTitle, fontSize: 18, lineHeight: 24 },
  workerMeta: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing[2],
  },
  rowAction: { flexBasis: 140, flexGrow: 1 },
  cardNote: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  refreshing: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
  },
  successCard: {
    alignItems: "center",
    borderColor: mobileTheme.color.status.success.border,
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    justifyContent: "space-between",
  },
  successText: {
    ...mobileText.body,
    color: mobileTheme.color.status.success.foreground,
    flex: 1,
  },
  loading: {
    alignItems: "center",
    gap: mobileTheme.spacing[3],
    justifyContent: "center",
    minHeight: 180,
  },
});
