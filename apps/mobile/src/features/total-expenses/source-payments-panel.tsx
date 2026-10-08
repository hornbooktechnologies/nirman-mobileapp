
import { RefreshButton } from "../../components/ui/refresh-button";
import { type ReactNode, useRef, useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  calendarToday,
  isPaymentLedgerAvailable,
  isCalendarDate,
  moneyPaise,
  sourcePaymentFailure,
  type PaymentLedger,
  type RecordSourcePayment,
  type VoidSourcePayment,
  type SourcePaymentMethod,
} from "@nirman-app/shared";
import {
  AppText,
  BottomSheet,
  Button,
  DateInput,
  FormError,
  FormField,
  Input,
} from "../../components/ui";
import { formatInr, formatDate, getLocalizedErrorMessage } from "../../i18n";
import { ApiRequestError } from "../../lib/api";
import { useLocalization } from "../../providers";
import { mutationKey } from "../expenses/expenses-ui";
import { sendSourcePayment, sourcePaymentPath } from "./services";
export function SourcePaymentsPanel({
  org,
  project,
  token,
  source,
  id,
  parent,
  ledger,
  classificationReview,
  version,
  permissions,
  active,
  timezone,
  onSaved,
  compact = false,
  adjustmentAction,
}: {
  org: string;
  project: string;
  token: string;
  source: "materials" | "expenses";
  id: string;
  parent?: string;
  ledger: PaymentLedger;
  classificationReview?: boolean;
  version: number;
  permissions: readonly string[];
  active: boolean;
  timezone: string;
  onSaved: () => void | Promise<unknown>;
  compact?: boolean;
  adjustmentAction?: ReactNode;
}) {
  const { t } = useTranslation("totalExpenses");
  const { language } = useLocalization();
  const money = (v: string) => formatInr(Number(v), language);
  const [form, setForm] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => calendarToday(timezone));
  const [method, setMethod] = useState<SourcePaymentMethod>("CASH");
  const [reference, setReference] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [failure, setFailure] = useState("");
  const locked =
    busy || uncertain || failure === "stale" || failure === "denied";
  const busyRef = useRef(false);
  const pending = useRef<{
    path: string;
    body: RecordSourcePayment | VoidSourcePayment;
  } | null>(null);
  async function submit() {
    if (busyRef.current || !form || failure === "stale" || failure === "denied")
      return;
    setError("");
    try {
      if (!pending.current) {
        const base = sourcePaymentPath(org, project, source, id, parent);
        if (form === "record") {
          if (
            !isCalendarDate(date) ||
            date > calendarToday(timezone) ||
            !/^\d{1,12}(?:\.\d{1,2})?$/.test(amount.trim()) ||
            moneyPaise(amount.trim()) <= BigInt(0) ||
            ledger.remainingAmount === null ||
            moneyPaise(amount.trim()) > moneyPaise(ledger.remainingAmount)
          ) {
            setError(t("paymentInvalid"));
            return;
          }
          pending.current = {
            path: base,
            body: {
              amount: amount.trim(),
              paymentDate: date,
              paymentMethod: method,
              reference: reference.trim(),
              expectedVersion: version,
              idempotencyKey: mutationKey("payment"),
            },
          };
        } else {
          if (reason.trim().length < 2) {
            setError(t("reasonRequired"));
            return;
          }
          pending.current = {
            path: `${base}/${form}/void`,
            body: {
              reason: reason.trim(),
              expectedVersion: version,
              idempotencyKey: mutationKey("void-payment"),
            },
          };
        }
      }
      busyRef.current = true;
      setBusy(true);
      await sendSourcePayment(
        pending.current.path,
        token,
        pending.current.body,
      );
      pending.current = null;
      setUncertain(false);
      setForm(null);
      setAmount("");
      setReason("");
      try {
        await onSaved();
      } catch (refreshError) {
        setError(getLocalizedErrorMessage(refreshError, t("paymentFailed")));
      }
    } catch (e) {
      setError(getLocalizedErrorMessage(e, t("paymentFailed")));
      const kind = sourcePaymentFailure(
        e instanceof ApiRequestError ? e.status : undefined,
        e instanceof ApiRequestError ? e.code : undefined,
      );
      if (pending.current && kind === "uncertain") setUncertain(true);
      else {
        pending.current = null;
        setUncertain(false);
        setFailure(kind === "uncertain" ? "" : kind);
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  if (!ledger) return null;
  if (!isPaymentLedgerAvailable(ledger))
    return (
      <View style={{ gap: 10 }}>
        {adjustmentAction}
        {compact ? (
          <Button label={t("record")} variant="secondary" disabled />
        ) : null}
        <AppText>{t("trackingUnavailable")}</AppText>
        <RefreshButton
          label={t("refresh")}
          variant="secondary"
          onRefresh={async () => {
            await Promise.resolve(onSaved()).catch(() => setError(t("failed")));
          }}
        />
        <FormError message={error} />
      </View>
    );
  return (
    <View style={{ gap: 10 }}>
      {!compact && (
        <>
          <AppText weight={700}>{t("payments")}</AppText>
          {classificationReview ? <AppText>{t("legacy")}</AppText> : null}
          <AppText>
            {t("lifetime")}: {money(ledger.paidAmount)} · {t("remaining")}:{" "}
            {ledger.remainingAmount === null
              ? t("costMissing")
              : money(ledger.remainingAmount)}{" "}
            · {t(ledger.paymentStatus)}
          </AppText>
          <AppText>{t("paymentNotice")}</AppText>
        </>
      )}
      {adjustmentAction}
      {compact ||
      (active &&
        permissions.includes(`${source}:mark-paid`) &&
        ledger.remainingAmount !== null &&
        Number(ledger.remainingAmount) > 0) ? (
        <Button
          label={t("record")}
          variant="secondary"
          disabled={
            busy ||
            uncertain ||
            !active ||
            !permissions.includes(`${source}:mark-paid`) ||
            ledger.remainingAmount === null ||
            Number(ledger.remainingAmount) <= 0
          }
          onPress={() => {
            setAmount("");
            setDate(calendarToday(timezone));
            setMethod("CASH");
            setReference("");
            setFailure("");
            setForm("record");
            setError("");
          }}
        />
      ) : null}
      {compact &&
      (!active ||
        !permissions.includes(`${source}:mark-paid`) ||
        ledger.remainingAmount === null ||
        Number(ledger.remainingAmount) <= 0) ? (
        <AppText>
          {t(
            !active
              ? "paymentInactive"
              : !permissions.includes(`${source}:mark-paid`)
                ? "paymentDenied"
                : ledger.remainingAmount === null
                  ? "costMissing"
                  : "paymentSettled",
          )}
        </AppText>
      ) : null}
      {!compact &&
        ledger.payments.map((p) => (
          <View key={p.id} style={{ gap: 6 }}>
            <AppText weight={700}>
              {money(p.amount)} · {p.paymentDate} · {t(p.paymentMethod)}
            </AppText>
            <AppText>
              {p.recordedBy} ·{" "}
              {formatDate(new Date(p.recordedAt), language, {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: timezone,
              })}
              {p.reference ? ` · ${p.reference}` : ""}
            </AppText>
            {p.voidedAt ? (
              <AppText>
                {t("voided", { name: p.voidedBy, reason: p.voidReason })}
              </AppText>
            ) : active && permissions.includes(`${source}:void-payment`) ? (
              <Button
                label={t("void")}
                variant="secondary"
                disabled={locked}
                onPress={() => {
                  setFailure("");
                  setReason("");
                  setForm(p.id);
                  setError("");
                }}
              />
            ) : null}
          </View>
        ))}
      <BottomSheet
        visible={form !== null}
        title={form === "record" ? t("record") : t("void")}
        scroll
        showCloseButton={!busy && !uncertain}
        onClose={() => {
          if (!busy && !uncertain) {
            setForm(null);
            pending.current = null;
          }
        }}
        footer={
          <View style={{ flex: 1, gap: 8 }}>
            <Button
              label={
                busy ? t("saving") : uncertain ? t("retrySame") : t("confirm")
              }
              disabled={busy || failure === "stale" || failure === "denied"}
              onPress={() => void submit()}
            />
            <Button
              label={t("cancel")}
              variant="secondary"
              disabled={busy || uncertain}
              onPress={() => {
                setForm(null);
                pending.current = null;
              }}
            />
          </View>
        }
      >
        <View style={{ gap: 12 }}>
          <FormError message={error} />
          {failure === "stale" ? (
            <>
              <AppText>{t("paymentStale")}</AppText>
              <RefreshButton
                label={t("refresh")}
                disabled={busy}
                variant="secondary"
                onRefresh={async () => {
                  await Promise.resolve()
                    .then(onSaved)
                    .then(() => {
                      setFailure("");
                      setForm(null);
                    })
                    .catch(() => setError(t("failed")));
                }}
              />
            </>
          ) : null}
          {failure === "denied" ? (
            <AppText>{t("paymentDenied")}</AppText>
          ) : null}
          {uncertain ? <AppText>{t("uncertain")}</AppText> : null}
          {form === "record" ? (
            <View pointerEvents={locked ? "none" : "auto"} style={{ gap: 12 }}>
              <FormField label={t("amount")} required>
                <Input
                  keyboardType="decimal-pad"
                  editable={!locked}
                  value={amount}
                  onChangeText={setAmount}
                />
              </FormField>
              <FormField label={t("paymentDate")} required>
                <DateInput
                  accessibilityLabel={t("paymentDate")}
                  allowClear={false}
                  showPickerIndicator
                  maximumDate={new Date(`${calendarToday(timezone)}T23:59:59`)}
                  value={date}
                  onChangeText={(v) => {
                    if (!locked) setDate(v);
                  }}
                />
              </FormField>
              <FormField label={t("method")}>
                <View style={{ gap: 6 }}>
                  {(
                    [
                      "CASH",
                      "UPI",
                      "BANK_TRANSFER",
                      "CARD",
                      "CHEQUE",
                      "OTHER",
                    ] as SourcePaymentMethod[]
                  ).map((m) => (
                    <Button
                      key={m}
                      label={t(m)}
                      variant={method === m ? "primary" : "secondary"}
                      disabled={locked}
                      onPress={() => setMethod(m)}
                    />
                  ))}
                </View>
              </FormField>
              <FormField label={t("reference")}>
                <Input
                  maxLength={160}
                  editable={!locked}
                  value={reference}
                  onChangeText={setReference}
                />
              </FormField>
            </View>
          ) : (
            <FormField label={t("reason")} required>
              <Input
                multiline
                maxLength={2000}
                editable={!locked}
                value={reason}
                onChangeText={setReason}
              />
            </FormField>
          )}
        </View>
      </BottomSheet>
    </View>
  );
}
