import { siteExpenseTimeline, type PermissionKey } from "@nirman-app/shared";
import { SourcePaymentsPanel } from "../total-expenses/source-payments-panel";
import type {
  ExpenseAvailableAction,
  SiteExpenseDetail,
} from "@nirman-app/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  ActionListItem,
  AppIcon,
  AppText,
  BottomSheet,
  Button,
  Card,
  CompactScreenHeader,
  EmptyState,
  FilterOption,
  FormError,
  FormField,
  IconButton,
  Input,
  LoadingState,
  NirmanScreenBackground,
  StatusBadge,
} from "../../components/ui";
import { formatDate, formatInr, getLocalizedErrorMessage } from "../../i18n";
import { useExpenseCommand } from "./use-expense-command";
import type { ExpenseCommandInput, ExpenseAdjustmentInput } from "./types";
import { getRouteProject } from "../../lib/auth";
import { useLocalization, useSession } from "../../providers";
import { mobileText, mobileTheme } from "../../theme";
import { CustomerTabBar } from "../home/components";
import { ProjectContextCard } from "../projects";
import { ExpenseFormSheet } from "./expense-form-sheet";
import { ExpenseDetailRows, expenseTone, mutationKey } from "./expenses-ui";
import {
  adjustExpense,
  fetchExpenseDetail,
  runExpenseCommand,
} from "./services";

const dateValue = (value: string) => new Date(`${value}T12:00:00`);
const dateTime = (value: string) => new Date(value);
const actions: ExpenseAvailableAction[] = [
  "EDIT",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "CANCEL",
  "ADJUST",
];

export function ExpenseDetailScreen() {
  const { expenseId, projectId: requestedProjectId } = useLocalSearchParams<{
    expenseId?: string;
    projectId?: string;
  }>();
  const { t } = useTranslation("expenses");
  const { t: tCommon } = useTranslation("common");
  const { language } = useLocalization();
  const { session } = useSession();
  const project = getRouteProject(session, requestedProjectId);
  const organizationId = session?.activeOrganization?.id;
  const projectId = project?.id;
  const token = session?.accessToken;
  const [detail, setDetail] = useState<SiteExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [action, setAction] = useState<ExpenseAvailableAction | null>(null);
  const loadSequence = useRef(0);
  const load = useCallback(async () => {
    if (!expenseId || !organizationId || !projectId || !token) {
      setLoading(false);
      return;
    }
    const request = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const next = await fetchExpenseDetail(
        organizationId,
        projectId,
        expenseId,
        token,
      );
      if (request === loadSequence.current) setDetail(next);
    } catch (loadError) {
      if (request === loadSequence.current)
        setError(getLocalizedErrorMessage(loadError, t("errors.detailFailed")));
      throw loadError;
    } finally {
      if (request === loadSequence.current) setLoading(false);
    }
  }, [expenseId, organizationId, projectId, t, token]);
  useEffect(() => {
    void load().catch(() => undefined);
    return () => {
      loadSequence.current += 1;
    };
  }, [load]);
  useEffect(() => {
    setDetail(null);
    setEditOpen(false);
    setAction(null);
  }, [organizationId, projectId, expenseId]);
  function success(
    next: SiteExpenseDetail,
    completedAction: Exclude<ExpenseAvailableAction, "EDIT">,
  ) {
    setDetail(next);
    setAction(null);
    Alert.alert(t("success.title"), t(`success.${completedAction}`));
  }

  const actionPermissions: Record<ExpenseAvailableAction, PermissionKey> = {
    EDIT: "expenses:update",
    SUBMIT: "expenses:update",
    CANCEL: "expenses:update",
    APPROVE: "expenses:approve",
    REJECT: "expenses:reject",
    ADJUST: "expenses:adjust",
  };
  const allowedActions =
    detail?.availableActions.filter(
      (value) =>
        !loading &&
        !error &&
        project?.status === "ACTIVE" &&
        project.permissions.includes(actionPermissions[value]),
    ) ?? [];
  const timeline = detail ? siteExpenseTimeline(detail) : [];
  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="expenses" />}>
      <CompactScreenHeader
        leading={
          <IconButton
            accessibilityLabel={tCommon("actions.back")}
            icon="arrow-left"
            variant="glass"
            onPress={() => router.back()}
          />
        }
        title={t("detail.title")}
        subtitle={detail ? t(`category.${detail.category}`) : project?.name}
        action={
          allowedActions.includes("EDIT") ? (
            <Button
              label={t("action.EDIT")}
              fullWidth={false}
              size="sm"
              variant="secondary"
              leadingIcon="pencil-outline"
              onPress={() => setEditOpen(true)}
            />
          ) : undefined
        }
      />
      {requestedProjectId ? (
        <Card>
          <AppText weight={700}>{project?.name}</AppText>
        </Card>
      ) : (
        <ProjectContextCard compact />
      )}
      {loading && !detail ? (
        <LoadingState label={t("loading.detail")} />
      ) : error && !detail ? (
        <EmptyState
          title={t("errors.title")}
          description={error}
          actionLabel={tCommon("actions.retry")}
          onAction={() => void load().catch(() => undefined)}
        />
      ) : !detail ? (
        <EmptyState
          title={t("detail.notFound")}
          description={t("detail.notFoundDescription")}
        />
      ) : (
        <>
          <FormError message={error} />
          <Card style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <AppText style={styles.eyebrow} weight={700}>
                  {t(`category.${detail.category}`)}
                </AppText>
                <AppText style={styles.description} weight={700}>
                  {detail.description}
                </AppText>
              </View>
              <StatusBadge
                label={t(`status.${detail.status}`)}
                tone={expenseTone(detail.status)}
              />
            </View>
            <View style={styles.amountHero}>
              <View style={styles.amountCopy}>
                <AppText
                  adjustsFontSizeToFit
                  minimumFontScale={0.72}
                  numberOfLines={1}
                  style={styles.amount}
                  weight={700}
                >
                  {formatInr(Number(detail.recognizedAmount), language)}
                </AppText>
                <AppText style={styles.caption}>
                  {t("detail.recognizedAmount")}
                </AppText>
              </View>
              <View style={styles.amountIcon}>
                <AppIcon
                  name="receipt-text-check-outline"
                  size={30}
                  color={mobileTheme.color.action.primary}
                />
              </View>
            </View>
            {Number(detail.adjustmentTotal) !== 0 ? (
              <View style={styles.adjustmentCallout}>
                <AppIcon
                  name={
                    Number(detail.adjustmentTotal) > 0
                      ? "trending-up"
                      : "trending-down"
                  }
                  size={18}
                  color={mobileTheme.color.text.secondary}
                />
                <AppText style={styles.caption}>
                  {t("detail.adjustedFrom", {
                    original: formatInr(Number(detail.amount), language),
                    adjustment: formatInr(
                      Number(detail.adjustmentTotal),
                      language,
                    ),
                  })}
                </AppText>
              </View>
            ) : null}
          </Card>
          <Card style={styles.sectionCard}>
            <SectionTitle title={t("detail.record")} />
            <ExpenseDetailRows
              rows={[
                {
                  label: t("fields.date"),
                  value: formatDate(dateValue(detail.expenseDate), language),
                },
                { label: t("fields.recordedBy"), value: detail.recordedBy },
                {
                  label: t("fields.paymentMethod"),
                  value: detail.paymentMethod
                    ? t(`payment.${detail.paymentMethod}`)
                    : t("payment.NONE"),
                },
                {
                  label: t("fields.vendorPayee"),
                  value: detail.vendorPayee || t("common.notProvided"),
                },
                {
                  label: t("fields.workflow"),
                  value: t(`workflow.${detail.workflowMode}.label`),
                },
                {
                  label: t("fields.originalAmount"),
                  value: formatInr(Number(detail.amount), language),
                },
              ]}
            />
            {detail.rejectionReason ? (
              <View style={styles.reason}>
                <AppText style={styles.reasonLabel} weight={700}>
                  {t("fields.rejectionReason")}
                </AppText>
                <AppText style={styles.body}>{detail.rejectionReason}</AppText>
              </View>
            ) : null}
          </Card>
          {detail.status !== "APPROVED" && allowedActions.length ? (
            <View style={styles.section}>
              <SectionTitle title={t("detail.availableActions")} />
              {actions
                .filter(
                  (value) => value !== "EDIT" && allowedActions.includes(value),
                )
                .map((value) => (
                  <ActionListItem
                    key={value}
                    accessibilityLabel={t("actionA11y", {
                      action: t(`action.${value}`),
                      description: detail.description,
                    })}
                    icon={actionIcon(value)}
                    label={t(`action.${value}`)}
                    tone={
                      value === "REJECT" || value === "CANCEL"
                        ? "danger"
                        : value === "APPROVE" || value === "ADJUST"
                          ? "brand"
                          : "primary"
                    }
                    onPress={() => setAction(value)}
                  />
                ))}
            </View>
          ) : null}
          <Card style={styles.sectionCard}>
            <SourcePaymentsPanel
              compact
              key={`${organizationId}:${projectId}:${detail.id}`}
              org={organizationId!}
              project={projectId!}
              token={token!}
              source="expenses"
              id={detail.id}
              ledger={detail}
              version={detail.version}
              permissions={project?.permissions ?? []}
              active={
                project?.status === "ACTIVE" && detail.status === "APPROVED"
              }
              timezone={
                session?.activeOrganization?.workingTimezone ??
                session?.activeOrganization?.timezone ??
                "Asia/Kolkata"
              }
              onSaved={load}
              adjustmentAction={
                project?.status === "ACTIVE" &&
                project.permissions.includes("expenses:adjust") &&
                detail.availableActions.includes("ADJUST") ? (
                  <Button
                    label={t("action.ADJUST")}
                    variant="secondary"
                    onPress={() => setAction("ADJUST")}
                  />
                ) : null
              }
            />
          </Card>
          <View style={styles.section}>
            <SectionTitle
              title={t("detail.timeline")}
              count={timeline.length}
            />
            {timeline.map((event, index) => (
              <View key={event.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {index < timeline.length - 1 ? (
                    <View style={styles.timelineLine} />
                  ) : null}
                </View>
                <Card style={styles.eventCard}>
                  <View style={styles.timelineHeader}>
                    <AppText style={styles.timelineTitle} weight={700}>
                      {t(`event.${event.eventType}`)}
                    </AppText>
                    <AppText style={styles.caption}>
                      {formatDate(dateTime(event.createdAt), language, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone:
                          session?.activeOrganization?.workingTimezone ??
                          session?.activeOrganization?.timezone ??
                          "Asia/Kolkata",
                      })}
                    </AppText>
                  </View>
                  {event.amount !== null ? (
                    <AppText
                      style={[
                        styles.adjustmentAmount,
                        Number(event.amount) < 0 && styles.negative,
                      ]}
                      weight={700}
                    >
                      {formatInr(Number(event.amount), language)}
                    </AppText>
                  ) : null}
                  <AppText style={styles.caption}>{event.actorName}</AppText>
                  {event.comment ? (
                    <AppText style={styles.body}>{event.comment}</AppText>
                  ) : null}
                </Card>
              </View>
            ))}
          </View>
        </>
      )}
      {editOpen && detail && organizationId && projectId && token ? (
        <ExpenseFormSheet
          key={`${organizationId}:${projectId}:${detail.id}`}
          visible
          organizationId={organizationId}
          projectId={projectId}
          accessToken={token}
          detail={detail}
          onClose={() => setEditOpen(false)}
          onSaved={load}
          onConflict={load}
          allowed={allowedActions.includes("EDIT")}
        />
      ) : null}
      {action && detail && organizationId && projectId && token ? (
        action === "ADJUST" ? (
          <AdjustmentSheet
            key={`${organizationId}:${projectId}:${detail.id}:adjust`}
            detail={detail}
            organizationId={organizationId}
            projectId={projectId}
            accessToken={token}
            onClose={() => setAction(null)}
            onSaved={(next) => success(next, action)}
            onConflict={load}
            allowed={allowedActions.includes(action)}
          />
        ) : action === "EDIT" ? null : (
          <CommandSheet
            key={`${organizationId}:${projectId}:${detail.id}:${action}`}
            action={action}
            detail={detail}
            organizationId={organizationId}
            projectId={projectId}
            accessToken={token}
            onClose={() => setAction(null)}
            onSaved={(next) => success(next, action)}
            onConflict={load}
            allowed={allowedActions.includes(action)}
          />
        )
      ) : null}
    </NirmanScreenBackground>
  );
}

type SheetBase = {
  detail: SiteExpenseDetail;
  organizationId: string;
  projectId: string;
  accessToken: string;
  onClose: () => void;
  onSaved: (detail: SiteExpenseDetail) => void;
  onConflict: () => Promise<void>;
  allowed: boolean;
};
function CommandSheet({
  action,
  detail,
  organizationId,
  projectId,
  accessToken,
  onClose,
  onSaved,
  onConflict,
  allowed,
}: SheetBase & { action: Exclude<ExpenseAvailableAction, "EDIT" | "ADJUST"> }) {
  const { t } = useTranslation("expenses");
  const { t: tCommon } = useTranslation("common");
  const [reason, setReason] = useState("");
  const command = useExpenseCommand<ExpenseCommandInput>(
    t("errors.actionFailed"),
  );
  const { working, error, setError } = command;
  const close = () => command.requestClose(onClose, Boolean(reason.trim()));
  const required = action === "REJECT" || action === "CANCEL";
  async function submit() {
    if (!allowed || !command.canSubmit) return;
    if (!command.retryLabel && required && reason.trim().length < 2) {
      setError(t("validation.reasonRequired"));
      return;
    }
    let next: SiteExpenseDetail | undefined;
    await command.run(
      {
        expectedVersion: detail.version,
        reason: reason.trim() || null,
        idempotencyKey: mutationKey(`${detail.id}-${action}`),
      },
      async (original) => {
        next = await runExpenseCommand(
          organizationId,
          projectId,
          detail.id,
          action.toLowerCase() as "submit" | "approve" | "reject" | "cancel",
          accessToken,
          original,
        );
      },
      () => {
        if (next) onSaved(next);
      },
    );
  }
  return (
    <BottomSheet
      visible
      title={t(`confirm.${action}.title`)}
      description={t(`confirm.${action}.description`)}
      scroll
      showCloseButton={false}
      onClose={close}
      footer={
        <SheetFooter
          cancel={tCommon("actions.cancel")}
          save={
            working
              ? t("loading.working")
              : (command.retryLabel ?? t(`action.${action}`))
          }
          working={working}
          cancelDisabled={!command.canClose}
          saveDisabled={!command.canSubmit || !allowed}
          danger={action === "REJECT" || action === "CANCEL"}
          onCancel={close}
          onSave={() => void submit()}
        />
      }
    >
      <FormError message={error} />
      {command.recovery(onConflict)}
      <FormField
        label={t("fields.reason")}
        required={required}
        error={
          required && reason.length > 0 && reason.trim().length < 2
            ? t("validation.reasonRequired")
            : undefined
        }
      >
        <Input
          editable={!command.locked && allowed}
          multiline
          numberOfLines={4}
          maxLength={2000}
          style={styles.multiline}
          value={reason}
          onChangeText={setReason}
        />
      </FormField>
    </BottomSheet>
  );
}
function AdjustmentSheet({
  detail,
  organizationId,
  projectId,
  accessToken,
  onClose,
  onSaved,
  onConflict,
  allowed,
}: SheetBase) {
  const { t } = useTranslation("expenses");
  const { t: tCommon } = useTranslation("common");
  const { language } = useLocalization();
  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">(
    "INCREASE",
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const command = useExpenseCommand<ExpenseAdjustmentInput>(
    t("errors.adjustmentFailed"),
  );
  const { working, error, setError } = command;
  const close = () =>
    command.requestClose(
      onClose,
      Boolean(reason.trim() || amount || direction !== "INCREASE"),
    );
  async function save() {
    if (!allowed || !command.canSubmit) return;
    const numeric = Number(amount);
    if (
      !command.retryLabel &&
      (!Number.isFinite(numeric) ||
        numeric <= 0 ||
        !/^\d+(\.\d{1,2})?$/.test(amount))
    ) {
      setError(t("validation.adjustmentAmount"));
      return;
    }
    if (
      !command.retryLabel &&
      direction === "DECREASE" &&
      numeric > Number(detail.recognizedAmount)
    ) {
      setError(
        t("validation.adjustmentMaximum", {
          amount: formatInr(Number(detail.recognizedAmount), language),
        }),
      );
      return;
    }
    if (!command.retryLabel && reason.trim().length < 2) {
      setError(t("validation.reasonRequired"));
      return;
    }
    let next: SiteExpenseDetail | undefined;
    await command.run(
      {
        expectedVersion: detail.version,
        amount: direction === "DECREASE" ? -numeric : numeric,
        reason: reason.trim(),
        idempotencyKey: mutationKey(`${detail.id}-adjustment`),
      },
      async (original) => {
        next = await adjustExpense(
          organizationId,
          projectId,
          detail.id,
          accessToken,
          original,
        );
      },
      () => {
        if (next) onSaved(next);
      },
    );
  }
  return (
    <BottomSheet
      visible
      title={t("adjustment.title")}
      description={t("adjustment.description", {
        amount: formatInr(Number(detail.recognizedAmount), language),
      })}
      scroll
      showCloseButton={false}
      onClose={close}
      footer={
        <SheetFooter
          cancel={tCommon("actions.cancel")}
          save={
            working
              ? t("loading.working")
              : (command.retryLabel ?? t("adjustment.save"))
          }
          working={working}
          cancelDisabled={!command.canClose}
          saveDisabled={!command.canSubmit || !allowed}
          onCancel={close}
          onSave={() => void save()}
        />
      }
    >
      <FormError message={error} />
      {command.recovery(onConflict)}
      <View accessibilityRole="radiogroup" style={styles.directionRow}>
        <View style={styles.directionOption}>
          <FilterOption
            label={t("adjustment.increase")}
            selected={direction === "INCREASE"}
            onPress={() => {
              if (!command.locked && allowed) setDirection("INCREASE");
            }}
          />
        </View>
        <View style={styles.directionOption}>
          <FilterOption
            label={t("adjustment.decrease")}
            selected={direction === "DECREASE"}
            onPress={() => {
              if (!command.locked && allowed) setDirection("DECREASE");
            }}
          />
        </View>
      </View>
      <FormField
        label={t("fields.adjustmentAmount")}
        required
        helperText={
          direction === "DECREASE"
            ? t("adjustment.maximum", {
                amount: formatInr(Number(detail.recognizedAmount), language),
              })
            : undefined
        }
      >
        <Input
          editable={!command.locked && allowed}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(value) => setAmount(value.replace(/[^0-9.]/g, ""))}
        />
      </FormField>
      <FormField label={t("fields.reason")} required>
        <Input
          editable={!command.locked && allowed}
          multiline
          numberOfLines={4}
          maxLength={2000}
          style={styles.multiline}
          value={reason}
          onChangeText={setReason}
        />
      </FormField>
    </BottomSheet>
  );
}
function SheetFooter({
  cancel,
  save,
  working,
  danger = false,
  cancelDisabled = false,
  saveDisabled = false,
  onCancel,
  onSave,
}: {
  cancel: string;
  save: string;
  working: boolean;
  danger?: boolean;
  cancelDisabled?: boolean;
  saveDisabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.sheetFooter}>
      <Button
        style={styles.footerButton}
        label={cancel}
        variant="secondary"
        disabled={working || cancelDisabled}
        onPress={onCancel}
      />
      <Button
        style={styles.footerButton}
        label={save}
        variant={danger ? "danger" : "primary"}
        disabled={working || saveDisabled}
        onPress={onSave}
      />
    </View>
  );
}
function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <View style={styles.sectionTitleRow}>
      <AppText style={styles.sectionTitle} weight={700}>
        {title}
      </AppText>
      {count !== undefined ? (
        <View style={styles.count}>
          <AppText style={styles.countText} weight={700}>
            {count}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
function actionIcon(action: ExpenseAvailableAction) {
  const icons = {
    EDIT: "pencil-outline",
    SUBMIT: "send-outline",
    APPROVE: "check-decagram-outline",
    REJECT: "close-octagon-outline",
    CANCEL: "cancel",
    ADJUST: "plus-minus-variant",
  } as const;
  return icons[action];
}

const styles = StyleSheet.create({
  hero: { gap: mobileTheme.spacing[4] },
  heroTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
    justifyContent: "space-between",
  },
  heroCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  eyebrow: {
    ...mobileText.caption,
    color: mobileTheme.color.action.primary,
    textTransform: "uppercase",
    fontSize: 16,
  },
  description: {
    ...mobileText.sectionTitle,
    fontSize: 14,
    fontWeight: "normal",
  },
  amountHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
    justifyContent: "space-between",
  },
  amountCopy: { flex: 1, minWidth: 0 },
  amount: { ...mobileText.title, fontVariant: ["tabular-nums"] },
  caption: { ...mobileText.caption },
  amountIcon: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.status.success.background,
    borderRadius: mobileTheme.radius.full,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  adjustmentCallout: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.surface.sunken,
    borderRadius: mobileTheme.radius.md,
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    padding: mobileTheme.spacing[3],
  },
  section: { gap: mobileTheme.spacing[3] },
  sectionCard: { gap: mobileTheme.spacing[4] },
  sectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    justifyContent: "space-between",
  },
  sectionTitle: { ...mobileText.sectionTitle },
  count: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.surface.sunken,
    borderRadius: mobileTheme.radius.full,
    justifyContent: "center",
    minHeight: 26,
    minWidth: 26,
    paddingHorizontal: mobileTheme.spacing[2],
  },
  countText: { ...mobileText.caption, fontVariant: ["tabular-nums"] },
  reason: {
    backgroundColor: mobileTheme.color.status.danger.background,
    borderRadius: mobileTheme.radius.md,
    gap: mobileTheme.spacing[1],
    padding: mobileTheme.spacing[3],
  },
  reasonLabel: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
  },
  body: { ...mobileText.body },
  historyCard: { gap: mobileTheme.spacing[3] },
  historyTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
    justifyContent: "space-between",
  },
  adjustmentTitle: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: mobileTheme.spacing[2],
  },
  adjustmentAmount: {
    ...mobileText.body,
    color: mobileTheme.color.status.success.foreground,
    fontVariant: ["tabular-nums"],
  },
  negative: { color: mobileTheme.color.status.danger.foreground },
  emptyText: { ...mobileText.body },
  timelineRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
  },
  timelineRail: { alignItems: "center", width: 18 },
  timelineDot: {
    backgroundColor: mobileTheme.color.action.primary,
    borderRadius: mobileTheme.radius.full,
    height: 10,
    marginTop: mobileTheme.spacing[4],
    width: 10,
  },
  timelineLine: {
    backgroundColor: mobileTheme.color.border.accent,
    flex: 1,
    marginVertical: mobileTheme.spacing[1],
    width: 2,
  },
  eventCard: { flex: 1, minWidth: 0, gap: mobileTheme.spacing[2] },
  timelineHeader: { gap: mobileTheme.spacing[1] },
  timelineTitle: { ...mobileText.body, flexShrink: 1 },
  multiline: {
    minHeight: 112,
    paddingTop: mobileTheme.spacing[3],
    textAlignVertical: "top",
  },
  sheetFooter: { flex: 1, flexDirection: "row", gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  directionRow: { flexDirection: "row", gap: mobileTheme.spacing[2] },
  directionOption: { flex: 1 },
});
