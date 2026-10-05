import { useCallback, useEffect, useRef, useState } from "react";
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
  type Href,
} from "expo-router";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  calendarToday,
  isCalendarDate,
  spendingRange,
  type SpendingPeriod,
  type SpendingSource,
  type SpendingCard,
  type TotalExpensesList,
  type TotalExpensesSummary,
  type TotalExpensesQuery,
} from "@nirman-app/shared";
import {
  AppText,
  BottomSheet,
  Button,
  Card,
  CompactScreenHeader,
  DateInput,
  FormError,
  FormField,
  Input,
  LoadingState,
  NirmanScreenBackground,
  StatusBadge,
} from "../../components/ui";
import { useSession, useLocalization } from "../../providers";
import { getRouteProject } from "../../lib/auth";
import { formatInr, getLocalizedErrorMessage } from "../../i18n";
import { mobileTheme } from "../../theme";
import { CustomerTabBar } from "../home/components";
import { ProjectContextCard } from "../projects";
import { PeriodSummaryRequest } from "./period-summary-request";
import { fetchSpending } from "./services";
type Filters = {
  period: SpendingPeriod;
  year: number;
  range: TotalExpensesQuery;
  source: SpendingSource;
  page: number;
};
const preferences = new Map<string, Filters>();
const sources: SpendingSource[] = [
  "ALL",
  "WAGES",
  "MATERIALS",
  "SITE_EXPENSES",
];
export function TotalExpensesScreen() {
  const { session } = useSession();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = getRouteProject(session, projectId);
  const scope = `${session?.user.id}:${session?.activeOrganization?.id}:${project?.id}`;
  return <Report key={scope} scope={scope} project={project} />;
}
function Report({
  scope,
  project,
}: {
  scope: string;
  project: ReturnType<typeof getRouteProject>;
}) {
  const { t } = useTranslation("totalExpenses");
  const { t: expenseCopy } = useTranslation("expenses");
  const { language } = useLocalization();
  const { session } = useSession();

  const permissions = project?.permissions ?? [];
  const org = session?.activeOrganization?.id;
  const token = session?.accessToken;
  const timezone =
    session?.activeOrganization?.workingTimezone ??
    session?.activeOrganization?.timezone;
  const thisYear = Number(
    calendarToday(timezone ?? "Asia/Kolkata").slice(0, 4),
  );
  const [filters, setFilters] = useState<Filters>(
    () =>
      preferences.get(scope) ?? {
        period: "THIS_MONTH",
        year: thisYear,
        range: spendingRange("THIS_MONTH", timezone ?? "Asia/Kolkata"),
        source: "ALL",
        page: 1,
      },
  );
  const [draft, setDraft] = useState(filters);
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(filters.range.startDate ?? "");
  const [end, setEnd] = useState(filters.range.endDate ?? "");
  const [dateError, setDateError] = useState("");
  const [summary, setSummary] = useState<TotalExpensesSummary | null>(null);
  const [list, setList] = useState<TotalExpensesList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const seq = useRef(0);
  const listController = useRef<AbortController | null>(null);
  const lastListKey = useRef("");
  const summaryRequest = useRef(
    new PeriodSummaryRequest<TotalExpensesSummary>(),
  );

  useEffect(() => {
    if (preferences.size > 40) preferences.clear();
    preferences.set(scope, filters);
  }, [scope, filters]);
  const canRead = permissions.includes("total-expenses:read");
  const load = useCallback(
    async (refreshSummary = false) => {
      if (!org || !project?.id || !token || !canRead || !timezone) {
        setLoading(false);
        return;
      }
      const n = ++seq.current;
      const periodKey = `${scope}:${JSON.stringify(filters.range)}`;
      const listKey = `${periodKey}:${filters.source}:${filters.page}`;
      listController.current?.abort();
      const controller = new AbortController();
      listController.current = controller;
      if (lastListKey.current !== listKey) setList(null);
      lastListKey.current = listKey;
      setLoading(true);
      setError("");
      try {
        if (summaryRequest.current.key !== periodKey) setSummary(null);
        const summaryPromise = summaryRequest.current.get(
          periodKey,
          (signal) =>
            fetchSpending<TotalExpensesSummary>(
              org,
              project.id,
              token,
              filters.range,
              true,
              signal,
            ),
          refreshSummary,
        );
        const [s, l] = await Promise.all([
          summaryPromise,
          fetchSpending<TotalExpensesList>(
            org,
            project.id,
            token,
            {
              ...filters.range,
              source: filters.source,
              page: filters.page,
              pageSize: 20,
            },
            false,
            controller.signal,
          ),
        ]);
        if (n === seq.current) {
          setSummary(s);
          setList(l);
        }
      } catch (e) {
        if (n === seq.current && !controller.signal.aborted) {
          summaryRequest.current.cancel();
          setError(getLocalizedErrorMessage(e, t("failed")));
        }
      } finally {
        if (n === seq.current) setLoading(false);
      }
    },
    [org, project?.id, token, timezone, filters, t, canRead, scope],
  );
  const latestLoad = useRef(load);
  useEffect(() => {
    latestLoad.current = load;
  }, [load]);
  const initialFilterEffect = useRef(true);
  useEffect(() => {
    if (initialFilterEffect.current) {
      initialFilterEffect.current = false;
      return;
    }
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void latestLoad.current(true);
      return () => {
        seq.current++;
        listController.current?.abort();
        summaryRequest.current.cancel();
      };
    }, [org, project?.id, token, timezone, canRead]),
  );
  const money = (v: string) => formatInr(Number(v), language);
  function apply() {
    let range: TotalExpensesQuery;
    if (draft.period === "CUSTOM") {
      if (!isCalendarDate(start) || !isCalendarDate(end) || start > end) {
        setDateError(t("datesInvalid"));
        return;
      }
      range = { startDate: start, endDate: end };
    } else {
      if (
        draft.period === "YEAR" &&
        (!Number.isInteger(draft.year) ||
          draft.year < 1900 ||
          draft.year > thisYear)
      ) {
        setDateError(t("datesInvalid"));
        return;
      }
      range = spendingRange(draft.period, timezone!, draft.year);
    }
    setFilters({ ...draft, range, page: 1 });
    setDateError("");
    setOpen(false);
  }
  function openDetail(i: SpendingCard) {
    router.push(
      (i.source === "WAGES"
        ? {
            pathname: "/(app)/wage-batch",
            params: { batchId: i.detailId, projectId: project!.id },
          }
        : i.source === "MATERIALS"
          ? {
              pathname: "/(app)/material-detail",
              params: {
                materialRequestId: i.detailId,
                purchaseId: i.id,
                projectId: project!.id,
              },
            }
          : {
              pathname: "/(app)/expense-detail",
              params: { expenseId: i.detailId, projectId: project!.id },
            }) as Href,
    );
  }
  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="menu" />}>
      <CompactScreenHeader title={t("title")} subtitle={t("subtitle")} />
      {project ? (
        <Card>
          <AppText weight={700}>{project.name}</AppText>
        </Card>
      ) : (
        <ProjectContextCard />
      )}
      {!project ? (
        <Card>
          <AppText>{t("noProject")}</AppText>
        </Card>
      ) : !canRead ? (
        <Card>
          <AppText>{t("denied")}</AppText>
        </Card>
      ) : !timezone ? (
        <Card>
          <AppText>{t("failed")}</AppText>
        </Card>
      ) : (
        <View style={styles.stack}>
          <View style={styles.row}>
            <Button
              fullWidth={false}
              label={t("filters")}
              variant="secondary"
              onPress={() => {
                setDraft(filters);
                setStart(filters.range.startDate ?? "");
                setEnd(filters.range.endDate ?? "");
                setDateError("");
                setOpen(true);
              }}
            />
            <Button
              fullWidth={false}
              label={t("refresh")}
              variant="secondary"
              disabled={loading}
              onPress={() => void load(true)}
            />
          </View>
          <AppText>
            {filters.range.startDate
              ? `${filters.range.startDate} – ${filters.range.endDate}`
              : t("ALL_TIME")}
          </AppText>
          <AppText>{t("notice")}</AppText>
          {error ? (
            <Card>
              <FormError message={error} />
              <Button label={t("retry")} onPress={() => void load(true)} />
            </Card>
          ) : loading && !summary ? (
            <LoadingState />
          ) : summary ? (
            <>
              <View style={styles.stats}>
                {(
                  [
                    ["total", summary.totalPaid],
                    ["WAGES", summary.wagesPaid],
                    ["MATERIALS", summary.materialsPaid],
                    ["SITE_EXPENSES", summary.siteExpensesPaid],
                  ] as const
                ).map(([key, value]) => (
                  <Card key={key} style={styles.stat}>
                    <AppText>{t(key)}</AppText>
                    <AppText weight={700} style={styles.amount}>
                      {money(value)}
                    </AppText>
                  </Card>
                ))}
              </View>
              <Card>
                <AppText weight={700}>{t("monthly")}</AppText>
                {!summary.months.length ? (
                  <AppText>{t("empty")}</AppText>
                ) : (
                  summary.months.map((m) => (
                    <View key={m.month} style={styles.barRow}>
                      <View style={styles.row}>
                        <AppText>{m.month}</AppText>
                        <AppText>{money(m.totalPaid)}</AppText>
                      </View>
                      <View style={styles.track}>
                        <View
                          style={[
                            styles.bar,
                            {
                              width: `${(Number(m.totalPaid) / Math.max(...summary.months.map((x) => Number(x.totalPaid)), 1)) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))
                )}
              </Card>
            </>
          ) : null}
          <View style={styles.row}>
            {sources.map((s) => (
              <Button
                key={s}
                fullWidth={false}
                label={t(s)}
                variant={filters.source === s ? "primary" : "secondary"}
                accessibilityState={{ selected: filters.source === s }}
                onPress={() =>
                  setFilters((f) => ({ ...f, source: s, page: 1 }))
                }
              />
            ))}
          </View>
          {loading && list ? <AppText>{t("refresh")}…</AppText> : null}
          {list && (
            <>
              {!list.items.length ? (
                <Card>
                  <AppText>{t("empty")}</AppText>
                </Card>
              ) : (
                list.items.map((i) => {
                  const module =
                    i.source === "WAGES"
                      ? "wages"
                      : i.source === "MATERIALS"
                        ? "materials"
                        : "expenses";
                  return (
                    <Card key={`${i.source}:${i.id}`} style={styles.stack}>
                      <View style={styles.row}>
                        <AppText weight={700}>{t(i.source)}</AppText>
                        <StatusBadge
                          label={t(i.paymentStatus)}
                          tone={
                            i.paymentStatus === "PAID" ? "success" : "warning"
                          }
                        />
                      </View>
                      <AppText weight={700}>
                        {i.source === "WAGES"
                          ? `${i.periodStart} – ${i.periodEnd}`
                          : i.title}
                      </AppText>
                      {i.subtitle ? <AppText>{i.subtitle}</AppText> : null}
                      <AppText style={styles.amount} weight={700}>
                        {money(i.periodPaidAmount)}
                      </AppText>
                      <AppText>{t("paidPeriod")}</AppText>
                      <AppText>
                        {t("lifetime")}: {money(i.lifetimePaidAmount)} ·{" "}
                        {t("remaining")}: {money(i.remainingAmount)}
                      </AppText>
                      <AppText>
                        {t("latest")}: {i.latestPaymentDate}
                      </AppText>
                      {i.source === "MATERIALS" ? (
                        <AppText>
                          {t("purchased")}: {i.purchasedOn}
                        </AppText>
                      ) : null}
                      {i.source === "SITE_EXPENSES" ? (
                        <AppText>
                          {expenseCopy(`category.${i.category}`)} ·{" "}
                          {t("expenseDate")}: {i.expenseDate}
                        </AppText>
                      ) : null}
                      {i.source === "SITE_EXPENSES" &&
                      i.classificationReview ? (
                        <AppText>{t("legacy")}</AppText>
                      ) : null}
                      {permissions.includes(`${module}:read`) ? (
                        <Button
                          label={t("view")}
                          variant="secondary"
                          onPress={() => openDetail(i)}
                        />
                      ) : (
                        <AppText>{t("detailUnavailable")}</AppText>
                      )}
                    </Card>
                  );
                })
              )}
              <View style={styles.row}>
                <Button
                  fullWidth={false}
                  label={t("previous")}
                  variant="secondary"
                  disabled={filters.page <= 1}
                  onPress={() =>
                    setFilters((f) => ({ ...f, page: f.page - 1 }))
                  }
                />
                <AppText>
                  {t("page", {
                    page: filters.page,
                    total: list.pagination.totalPages || 1,
                  })}
                </AppText>
                <Button
                  fullWidth={false}
                  label={t("next")}
                  variant="secondary"
                  disabled={filters.page >= list.pagination.totalPages}
                  onPress={() =>
                    setFilters((f) => ({ ...f, page: f.page + 1 }))
                  }
                />
              </View>
            </>
          )}
        </View>
      )}
      <BottomSheet
        visible={open}
        title={t("filters")}
        scroll
        onClose={() => setOpen(false)}
        footer={<Button label={t("apply")} onPress={apply} />}
      >
        <View style={styles.stack}>
          {(
            [
              "THIS_MONTH",
              "PREVIOUS_MONTH",
              "YEAR",
              "CUSTOM",
              "ALL_TIME",
            ] as SpendingPeriod[]
          ).map((p) => (
            <Button
              key={p}
              label={t(p)}
              variant={draft.period === p ? "primary" : "secondary"}
              onPress={() => setDraft((f) => ({ ...f, period: p }))}
            />
          ))}
          {draft.period === "YEAR" ? (
            <FormField label={t("year")}>
              <Input
                keyboardType="number-pad"
                value={String(draft.year)}
                onChangeText={(v) =>
                  setDraft((f) => ({ ...f, year: Number(v) }))
                }
              />
            </FormField>
          ) : null}
          {draft.period === "CUSTOM" ? (
            <>
              <FormField label={t("from")}>
                <DateInput
                  value={start}
                  onChangeText={setStart}
                  accessibilityLabel={t("from")}
                />
              </FormField>
              <FormField label={t("to")}>
                <DateInput
                  value={end}
                  onChangeText={setEnd}
                  accessibilityLabel={t("to")}
                />
              </FormField>
            </>
          ) : null}
          <FormError message={dateError} />
        </View>
      </BottomSheet>
    </NirmanScreenBackground>
  );
}
const styles = StyleSheet.create({
  stack: { gap: 12 },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stat: { flexGrow: 1, flexBasis: "45%", gap: 8 },
  amount: { fontSize: 22, lineHeight: 30, fontVariant: ["tabular-nums"] },
  barRow: { marginTop: 12, gap: 4 },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: mobileTheme.color.border.subtle,
    overflow: "hidden",
  },
  bar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: mobileTheme.color.action.primary,
  },
});
