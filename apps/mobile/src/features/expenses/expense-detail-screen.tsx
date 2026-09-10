import type {
  ExpenseAvailableAction,
  SiteExpenseDetail,
} from "@nirman-app/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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
import { ApiRequestError } from "../../lib/api";
import { getActiveProject } from "../../lib/auth";
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
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();
  const { t } = useTranslation("expenses");
  const { t: tCommon } = useTranslation("common");
  const { language } = useLocalization();
  const { session } = useSession();
  const project = getActiveProject(session);
  const organizationId = session?.activeOrganization?.id;
  const projectId = project?.id;
  const token = session?.accessToken;
  const [detail, setDetail] = useState<SiteExpenseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [action, setAction] = useState<ExpenseAvailableAction | null>(null);
  const load = useCallback(async () => {
    if (!expenseId || !organizationId || !projectId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setDetail(
        await fetchExpenseDetail(organizationId, projectId, expenseId, token),
      );
    } catch (loadError) {
      setError(getLocalizedErrorMessage(loadError, t("errors.detailFailed")));
    } finally {
      setLoading(false);
    }
  }, [expenseId, organizationId, projectId, t, token]);
  useEffect(() => {
    void load();
  }, [load]);
  function success(
    next: SiteExpenseDetail,
    completedAction: Exclude<ExpenseAvailableAction, "EDIT">,
  ) {
    setDetail(next);
    setAction(null);
    Alert.alert(t("success.title"), t(`success.${completedAction}`));
  }

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
          detail?.availableActions.includes("EDIT") ? (
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
      <ProjectContextCard compact />
      {loading ? (
        <LoadingState label={t("loading.detail")} />
      ) : error ? (
        <EmptyState
          title={t("errors.title")}
          description={error}
          actionLabel={tCommon("actions.retry")}
          onAction={() => void load()}
        />
      ) : !detail ? (
        <EmptyState
          title={t("detail.notFound")}
          description={t("detail.notFoundDescription")}
        />
      ) : (
        <>
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
          {detail.availableActions.length ? (
            <View style={styles.section}>
              <SectionTitle title={t("detail.availableActions")} />
              {actions
                .filter(
                  (value) =>
                    value !== "EDIT" && detail.availableActions.includes(value),
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
          <View style={styles.section}>
            <SectionTitle
              title={t("detail.adjustments")}
              count={detail.adjustments.length}
            />
            {detail.adjustments.length ? (
              detail.adjustments.map((adjustment) => (
                <Card key={adjustment.id} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <View style={styles.adjustmentTitle}>
                      <AppIcon
                        name={
                          Number(adjustment.amount) >= 0
                            ? "plus-circle-outline"
                            : "minus-circle-outline"
                        }
                        size={20}
                        color={
                          Number(adjustment.amount) >= 0
                            ? mobileTheme.color.status.success.foreground
                            : mobileTheme.color.status.danger.foreground
                        }
                      />
                      <AppText weight={700}>
                        {Number(adjustment.amount) >= 0
                          ? t("adjustment.increase")
                          : t("adjustment.decrease")}
                      </AppText>
                    </View>
                    <AppText
                      style={[
                        styles.adjustmentAmount,
                        Number(adjustment.amount) < 0 && styles.negative,
                      ]}
                      weight={700}
                    >
                      {formatInr(Number(adjustment.amount), language)}
                    </AppText>
                  </View>
                  <AppText style={styles.body}>{adjustment.reason}</AppText>
                  <AppText style={styles.caption}>
                    {adjustment.recordedBy} ·{" "}
                    {formatDate(dateTime(adjustment.createdAt), language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Kolkata",
                    })}
                  </AppText>
                </Card>
              ))
            ) : (
              <AppText style={styles.emptyText}>
                {t("detail.noAdjustments")}
              </AppText>
            )}
          </View>
          <View style={styles.section}>
            <SectionTitle
              title={t("detail.timeline")}
              count={detail.events.length}
            />
            {detail.events.map((event, index) => (
              <View key={event.id} style={styles.timelineRow}>
                <View style={styles.timelineRail}>
                  <View style={styles.timelineDot} />
                  {index < detail.events.length - 1 ? (
                    <View style={styles.timelineLine} />
                  ) : null}
                </View>
                <Card style={styles.eventCard}>
                  <View style={styles.historyTop}>
                    <AppText weight={700}>
                      {t(`event.${event.eventType}`)}
                    </AppText>
                    <AppText style={styles.caption}>
                      {formatDate(dateTime(event.createdAt), language, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      })}
                    </AppText>
                  </View>
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
          visible
          organizationId={organizationId}
          projectId={projectId}
          accessToken={token}
          detail={detail}
          onClose={() => setEditOpen(false)}
          onSaved={load}
          onConflict={load}
        />
      ) : null}
      {action && detail && organizationId && projectId && token ? (
        action === "ADJUST" ? (
          <AdjustmentSheet
            detail={detail}
            organizationId={organizationId}
            projectId={projectId}
            accessToken={token}
            onClose={() => setAction(null)}
            onSaved={(next) => success(next, action)}
            onConflict={load}
          />
        ) : action === "EDIT" ? null : (
          <CommandSheet
            action={action}
            detail={detail}
            organizationId={organizationId}
            projectId={projectId}
            accessToken={token}
            onClose={() => setAction(null)}
            onSaved={(next) => success(next, action)}
            onConflict={load}
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
}: SheetBase & { action: Exclude<ExpenseAvailableAction, "EDIT" | "ADJUST"> }) {
  const { t } = useTranslation("expenses");
  const { t: tCommon } = useTranslation("common");
  const [reason, setReason] = useState("");
  const [key] = useState(mutationKey(`${detail.id}-${action}`));
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const required = action === "REJECT" || action === "CANCEL";
  async function submit() {
    if (required && reason.trim().length < 2) {
      setError(t("validation.reasonRequired"));
      return;
    }
    setWorking(true);
    setError("");
    try {
      onSaved(
        await runExpenseCommand(
          organizationId,
          projectId,
          detail.id,
          action.toLowerCase() as "submit" | "approve" | "reject" | "cancel",
          accessToken,
          {
            expectedVersion: detail.version,
            reason: reason.trim() || null,
            idempotencyKey: key,
          },
        ),
      );
    } catch (commandError) {
      setError(
        getLocalizedErrorMessage(commandError, t("errors.actionFailed")),
      );
      if (
        commandError instanceof ApiRequestError &&
        commandError.code === "EXPENSE_VERSION_CONFLICT"
      )
        await onConflict();
    } finally {
      setWorking(false);
    }
  }
  return (
    <BottomSheet
      visible
      title={t(`confirm.${action}.title`)}
      description={t(`confirm.${action}.description`)}
      scroll
      showCloseButton={false}
      onClose={onClose}
      footer={
        <SheetFooter
          cancel={tCommon("actions.cancel")}
          save={working ? t("loading.working") : t(`action.${action}`)}
          working={working}
          danger={action === "REJECT" || action === "CANCEL"}
          onCancel={onClose}
          onSave={() => void submit()}
        />
      }
    >
      <FormError message={error} />
      <FormField
        label={t("fields.reason")}
        required={required}
        optional={!required}
        error={
          required && reason.length > 0 && reason.trim().length < 2
            ? t("validation.reasonRequired")
            : undefined
        }
      >
        <Input
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
}: SheetBase) {
  const { t } = useTranslation("expenses");
  const { t: tCommon } = useTranslation("common");
  const { language } = useLocalization();
  const [direction, setDirection] = useState<"INCREASE" | "DECREASE">(
    "INCREASE",
  );
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [key] = useState(mutationKey(`${detail.id}-adjustment`));
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  async function save() {
    const numeric = Number(amount);
    if (
      !Number.isFinite(numeric) ||
      numeric <= 0 ||
      !/^\d+(\.\d{1,2})?$/.test(amount)
    ) {
      setError(t("validation.adjustmentAmount"));
      return;
    }
    if (direction === "DECREASE" && numeric > Number(detail.recognizedAmount)) {
      setError(
        t("validation.adjustmentMaximum", {
          amount: formatInr(Number(detail.recognizedAmount), language),
        }),
      );
      return;
    }
    if (reason.trim().length < 2) {
      setError(t("validation.reasonRequired"));
      return;
    }
    setWorking(true);
    setError("");
    try {
      onSaved(
        await adjustExpense(organizationId, projectId, detail.id, accessToken, {
          expectedVersion: detail.version,
          amount: direction === "DECREASE" ? -numeric : numeric,
          reason: reason.trim(),
          idempotencyKey: key,
        }),
      );
    } catch (saveError) {
      setError(
        getLocalizedErrorMessage(saveError, t("errors.adjustmentFailed")),
      );
      if (
        saveError instanceof ApiRequestError &&
        saveError.code === "EXPENSE_VERSION_CONFLICT"
      )
        await onConflict();
    } finally {
      setWorking(false);
    }
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
      onClose={onClose}
      footer={
        <SheetFooter
          cancel={tCommon("actions.cancel")}
          save={working ? t("loading.working") : t("adjustment.save")}
          working={working}
          onCancel={onClose}
          onSave={() => void save()}
        />
      }
    >
      <FormError message={error} />
      <View accessibilityRole="radiogroup" style={styles.directionRow}>
        <View style={styles.directionOption}>
          <FilterOption
            label={t("adjustment.increase")}
            selected={direction === "INCREASE"}
            onPress={() => setDirection("INCREASE")}
          />
        </View>
        <View style={styles.directionOption}>
          <FilterOption
            label={t("adjustment.decrease")}
            selected={direction === "DECREASE"}
            onPress={() => setDirection("DECREASE")}
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
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(value) => setAmount(value.replace(/[^0-9.]/g, ""))}
        />
      </FormField>
      <FormField label={t("fields.reason")} required>
        <Input
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
  onCancel,
  onSave,
}: {
  cancel: string;
  save: string;
  working: boolean;
  danger?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <View style={styles.sheetFooter}>
      <Button
        style={styles.footerButton}
        label={cancel}
        variant="secondary"
        disabled={working}
        onPress={onCancel}
      />
      <Button
        style={styles.footerButton}
        label={save}
        variant={danger ? "danger" : "primary"}
        disabled={working}
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
  description: { ...mobileText.sectionTitle, fontSize: 14, fontWeight: "normal" },
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
  eventCard: { flex: 1, gap: mobileTheme.spacing[2] },
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
