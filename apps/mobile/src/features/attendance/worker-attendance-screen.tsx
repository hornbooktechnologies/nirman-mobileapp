import { attendancePeriodIssue } from '@nirman-app/shared';
import { AttendanceHistoryCorrection } from './attendance-history-correction';
import { AttendanceReadRequest } from "./attendance-read-request";
import { RefreshFlatList } from "../../components/ui/refresh-control";
import type {
  AttendanceException,
  WorkerAttendancePeriodResponse,
} from "@nirman-app/shared";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
  LottieLoader,
  NirmanScreenBackground,
  OperationalEntityCard,
} from "../../components/ui";
import { getLocalizedErrorMessage } from "../../i18n";
import { ApiRequestError } from "../../lib/api";
import { getActiveProject, getActiveProjectPermissions } from "../../lib/auth";
import { useLocalization, useSession } from "../../providers";
import { mobileText, mobileTheme } from "../../theme";
import { CustomerTabBar } from "../home/components";
import { ProjectContextCard } from "../projects";
import { AttendanceTotalsTable } from "./attendance-ui";
import { monthRange, todayDateOnly } from "./date-utils";
import { fetchWorkerAttendancePeriod } from "./services";

const ExceptionCard = memo(function ExceptionCard({
  exception,
  locale,
  onEdit,
  onRestore,
}: {
  exception: AttendanceException;
  locale: string;
  onEdit?: () => void;
  onRestore?: () => void;
}) {
  const { t } = useTranslation("attendance");
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(
    new Date(`${exception.workDate}T12:00:00`),
  );

  return (
    <Card
      accessible={false}
      accessibilityLabel={t("history.exceptionA11y", {
        date,
        duration: t(`durations.${exception.duration}`),
        reason: exception.reasonCode || t("history.noReason"),
      })}
      style={styles.exceptionCard}
    >
      <View style={styles.exceptionTopRow}>
        <View style={styles.exceptionDateCopy}>
          <AppText style={styles.exceptionDate} weight={700}>
            {date}
          </AppText>
          <AppText style={styles.exceptionType} weight={500}>
            {t("history.absenceException")}
          </AppText>
        </View>
        <Badge
          label={t(`durations.${exception.duration}`)}
          tone={exception.duration === "FULL_DAY" ? "danger" : "warning"}
        />
      </View>
      <View style={styles.detailGrid}>
        <View style={styles.detailBlock}>
          <AppText style={styles.detailLabel} weight={600}>
            {t("form.reason")}
          </AppText>
          <AppText style={styles.detailValue} weight={500}>
            {exception.reasonCode || t("history.noReason")}
          </AppText>
        </View>
        <View style={styles.detailBlock}>
          <AppText style={styles.detailLabel} weight={600}>
            {t("form.notes")}
          </AppText>
          <AppText style={styles.detailValue} weight={500}>
            {exception.notes || t("history.noNotes")}
          </AppText>
        </View>
      </View>
      {onEdit && onRestore ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: mobileTheme.spacing[2] }}><Button label={t("actions.editAttendance")} fullWidth={false} variant="secondary" onPress={onEdit} /><Button label={t("actions.restorePresent")} fullWidth={false} variant="danger" onPress={onRestore} /></View> : null}
    </Card>
  );
});

export function WorkerAttendanceScreen() {
  const { t } = useTranslation("attendance");
  const { t: tCommon } = useTranslation("common");
  const { locale } = useLocalization();
  const params = useLocalSearchParams<{
    workerId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    workerName?: string;
    workerCode?: string;
    workerTrade?: string;
  }>();
  const { refreshSession, session, signOut, switchActiveProject } =
    useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const workerId = params.workerId ?? "";
  const canRead = permissions.includes("attendance:read");
  const workingTimezone = session?.activeOrganization?.workingTimezone ?? session?.activeOrganization?.timezone;
  const defaultRange = useMemo(() => monthRange(todayDateOnly(workingTimezone).slice(0, 7)), [workingTimezone]);
  const [startDate, setStartDate] = useState(
    params.startDate ?? defaultRange.startDate,
  );
  const [endDate, setEndDate] = useState(
    params.endDate ?? defaultRange.endDate,
  );
  const [correction, setCorrection] = useState<{ exception: AttendanceException; mode: "edit" | "restore"; projectId: string | null } | null>(null);
  const [period, setPeriod] = useState<WorkerAttendancePeriodResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [deepLinkReady, setDeepLinkReady] = useState(false);
  const readRequest = useRef(new AttendanceReadRequest());
  const sessionActions = useRef({ refreshSession, signOut });
  sessionActions.current = { refreshSession, signOut };
  const hasData = useRef(false);
  hasData.current = Boolean(period);
  const cancelRead = useCallback(() => {
    readRequest.current.cancel();
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);
  const deepLinkHandled = useRef<string | null>(null);
  const invalidRange = Boolean(attendancePeriodIssue(startDate, endDate));
  const requiredParamsMissing = !params.workerId || !params.projectId;
  const requestedProjectAccessible = Boolean(
    params.projectId &&
    session?.projectAccess.projects.some(
      (project) => project.id === params.projectId,
    ),
  );
  const contextKey = `${organizationId ?? ""}:${projectId ?? ""}:${workerId}`;

  useEffect(() => {
    if (!session) return;
    const targetScope = `${organizationId}:${params.projectId ?? ""}`;
    if (deepLinkHandled.current === targetScope) return;
    deepLinkHandled.current = targetScope;
    setDeepLinkReady(false);
    if (!params.projectId) {
      setDeepLinkReady(true);
      return;
    }
    const target = session.projectAccess.projects.find(
      (project) => project.id === params.projectId,
    );
    if (!target || target.id === session.activeProjectId) {
      setDeepLinkReady(true);
      return;
    }
    void switchActiveProject(target.id)
      .catch(() => {
        if (deepLinkHandled.current === targetScope)
          setError(t("errors.accessChanged"));
      })
      .finally(() => {
        if (deepLinkHandled.current === targetScope) setDeepLinkReady(true);
      });
  }, [organizationId, params.projectId, session, switchActiveProject, t]);

  const latestReadScope = useRef(
    `${organizationId}:${projectId}:${workerId}:${startDate}:${endDate}`,
  );
  latestReadScope.current = `${organizationId}:${projectId}:${workerId}:${startDate}:${endDate}`;

  const load = useCallback(
    async (background = false) => {
      if (
        !deepLinkReady ||
        requiredParamsMissing ||
        !requestedProjectAccessible ||
        projectId !== params.projectId ||
        !session?.accessToken ||
        !organizationId ||
        !projectId ||
        !workerId ||
        !canRead ||
        invalidRange
      )
        return;
      // Ignore a delayed reload from a mutation belonging to an old filter/Project.
      if (
        latestReadScope.current !==
        `${organizationId}:${projectId}:${workerId}:${startDate}:${endDate}`
      )
        return;
      const request = readRequest.current.start(
        `${organizationId}:${projectId}:${workerId}:${startDate}:${endDate}`,
      );
      if (!request) return;
      setIsLoading(false);
      setIsRefreshing(false);
      if (background && hasData.current) setIsRefreshing(true);
      else setIsLoading(true);
      setError("");
      try {
        const response = await fetchWorkerAttendancePeriod(
          organizationId,
          projectId,
          workerId,
          { startDate, endDate },
          session.accessToken,
          request.signal,
        );
        if (request.isCurrent()) setPeriod(response);
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
          setError(
            getLocalizedErrorMessage(loadError, t("errors.loadHistory")),
          );
        }
      } finally {
        if (request.isCurrent()) {
          setIsLoading(false);
          setIsRefreshing(false);
          request.finish();
        }
      }
    },
    [
      canRead,
      deepLinkReady,
      requiredParamsMissing,
      requestedProjectAccessible,
      params.projectId,
      endDate,
      invalidRange,
      organizationId,
      projectId,
      session?.accessToken,
      startDate,
      t,
      workerId,
    ],
  );

  useRefreshOnFocus({
    scopeKey: `${contextKey}:${deepLinkReady}:${startDate}:${endDate}`,
    refresh: load,
    cancel: cancelRead,
    reset: () => {
      hasData.current = false;
      setPeriod(null);
      setIsLoading(false);
      setIsRefreshing(false);
    },
  });

  const workerName = params.workerName ?? t("history.workerFallback");
  const header = (
    <View style={styles.headerContent}>
      <CompactScreenHeader
        leading={
          <IconButton
            accessibilityLabel={tCommon("actions.back")}
            icon="arrow-left"
            variant="glass"
            onPress={() => router.back()}
          />
        }
        title={t("history.title")}
        subtitle={activeProject?.name ?? t("project.none")}
      />
      <ProjectContextCard compact showSwitchAction />
      <OperationalEntityCard
        accessibilityLabel={[workerName, params.workerCode, params.workerTrade]
          .filter(Boolean)
          .join(", ")}
        compact
        contextLeading={params.workerCode ?? t("history.workerFallback")}
        contextTrailing={params.workerTrade}
        title={workerName}
        tone="info"
      />
      <Card style={styles.periodCard}>
        <View style={styles.sectionHeading}>
          <AppText style={styles.sectionTitle} weight={700}>
            {t("period.title")}
          </AppText>
          <AppText style={styles.sectionDescription} weight={500}>
            {t("history.periodDescription")}
          </AppText>
        </View>
        <View style={styles.dateRow}>
          <FormField
            label={t("period.startDate")}
            required
            style={styles.dateField}
          >
            <DateInput
              allowClear={false}
              accessibilityLabel={t("period.selectStartDate")}
              maximumDate={new Date(`${endDate}T12:00:00`)}
              value={startDate}
              onChangeText={(value) => value && setStartDate(value)}
            />
          </FormField>
          <FormField
            label={t("period.endDate")}
            required
            error={invalidRange ? t("period.invalidPeriod") : undefined}
            style={styles.dateField}
          >
            <DateInput
              allowClear={false}
              accessibilityLabel={t("period.selectEndDate")}
              minimumDate={new Date(`${startDate}T12:00:00`)}
              value={endDate}
              onChangeText={(value) => value && setEndDate(value)}
            />
          </FormField>
        </View>
      </Card>
      {canRead && period ? (
        <AttendanceTotalsTable locale={locale} totals={period.totals} />
      ) : null}
      {isRefreshing ? (
        <View accessibilityLiveRegion="polite" style={styles.refreshing}>
          <LottieLoader size={24} />
          <AppText style={styles.subtleText}>{t("loading.refreshing")}</AppText>
        </View>
      ) : null}
      {error ? (
        <EmptyState
          title={t("errors.historyTitle")}
          description={error}
          actionLabel={tCommon("actions.retry")}
          onAction={() => void load()}
        />
      ) : null}
    </View>
  );

  const blockingState = requiredParamsMissing ? (
    <EmptyState
      title={t("history.invalidLinkTitle")}
      description={t("history.invalidLinkDescription")}
      actionLabel={t("actions.backToSummary")}
      onAction={() => router.replace("/(app)/attendance" as Href)}
    />
  ) : !requestedProjectAccessible ? (
    <EmptyState
      title={t("empty.permissionTitle")}
      description={t("empty.permissionDescription")}
      actionLabel={t("actions.backToSummary")}
      onAction={() => router.replace("/(app)/attendance" as Href)}
    />
  ) : !canRead ? (
    <EmptyState
      title={t("empty.permissionTitle")}
      description={t("empty.permissionDescription")}
      actionLabel={tCommon("actions.retry")}
      onRefresh={() => refreshSession()}
    />
  ) : null;
  const exceptions =
    blockingState || error || invalidRange ? [] : (period?.exceptions ?? []);

  return (
    <NirmanScreenBackground
      footer={<CustomerTabBar activeKey="attendance" />}
      scroll={false}
    >
      <RefreshFlatList
        busy={isLoading || isRefreshing}
        data={exceptions}
        keyExtractor={(exception) => exception.id}
        renderItem={({ item }) => (
          <ExceptionCard exception={item} locale={locale} onEdit={permissions.includes("attendance:update") ? () => setCorrection({ exception: item, mode: "edit", projectId }) : undefined} onRestore={permissions.includes("attendance:update") ? () => setCorrection({ exception: item, mode: "restore", projectId }) : undefined} />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={
          blockingState ??
          (isLoading ? (
            <View style={styles.loading}>
              <LottieLoader />
              <AppText>{t("loading.history")}</AppText>
            </View>
          ) : !error && !invalidRange ? (
            <EmptyState
              title={t("history.emptyTitle")}
              description={t("history.emptyDescription")}
            />
          ) : undefined)
        }
        contentContainerStyle={styles.listContent}
        refreshing={false}
        showsVerticalScrollIndicator={false}
        onRefresh={() => load(true)}
      />
      {correction && correction.projectId === projectId && session?.activeOrganization?.id === correction.exception.organizationId && canRead ? <AttendanceHistoryCorrection key={`${projectId}:${correction.exception.id}:${correction.mode}`} exception={correction.exception} mode={correction.mode} worker={{ id: workerId, name: params.workerName ?? t("history.workerFallback"), workerCode: params.workerCode ?? "", trade: params.workerTrade ?? "" }} onClose={() => setCorrection(null)} onSaved={() => load(true)} /> : null}
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
  subtleText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  periodCard: { gap: mobileTheme.spacing[4] },
  sectionHeading: { gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle },
  sectionDescription: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing[3],
  },
  dateField: { flexBasis: 150, flexGrow: 1 },
  exceptionCard: { gap: mobileTheme.spacing[4] },
  exceptionTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing[3],
    justifyContent: "space-between",
  },
  exceptionDateCopy: { flex: 1, gap: mobileTheme.spacing[1], minWidth: 190 },
  exceptionDate: { ...mobileText.sectionTitle, fontSize: 17, lineHeight: 23 },
  exceptionType: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  detailGrid: { gap: mobileTheme.spacing[3] },
  detailBlock: { gap: mobileTheme.spacing[1] },
  detailLabel: { ...mobileText.caption, color: mobileTheme.color.text.muted },
  detailValue: { ...mobileText.body, color: mobileTheme.color.text.primary },
  refreshing: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
  },
  loading: {
    alignItems: "center",
    gap: mobileTheme.spacing[3],
    justifyContent: "center",
    minHeight: 180,
  },
});
