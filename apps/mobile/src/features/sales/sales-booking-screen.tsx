import { LEAD_STAGES, type LeadStage } from "@nirman-app/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  BottomSheet,
  Button,
  Card,
  CompactScreenHeader,
  EmptyState,
  FormError,
  FormField,
  IconButton,
  Input,
  LoadingState,
  NirmanScreenBackground,
  OperationalEntityCard,
} from "../../components/ui";
import { formatDate, formatInr } from "../../i18n/formatters";
import { getLocalizedErrorMessage } from "../../i18n";
import { getActiveProject, getActiveProjectPermissions } from "../../lib/auth";
import { useSession } from "../../providers";
import { mobileTheme } from "../../theme";
import { ProjectContextCard } from "../projects";
import { cancelBooking, fetchBooking } from "./services";
import { SalesChoice, SalesDetailRows, SalesSectionHeading } from "./sales-ui";
import type { SalesBooking } from "./types";

const RESTORABLE_LEAD_STAGES = LEAD_STAGES.filter(
  (stage) => stage !== "BOOKED",
);

export function SalesBookingScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId?: string }>();
  const { t, i18n } = useTranslation("sales");
  const { t: tCommon } = useTranslation("common");
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const language = (i18n.resolvedLanguage ?? "en") as "en" | "hi" | "gu";
  const [booking, setBooking] = useState<SalesBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancellation, setShowCancellation] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [restoredLeadStage, setRestoredLeadStage] =
    useState<LeadStage>("NEGOTIATION");
  const [restoredUnitStatus, setRestoredUnitStatus] = useState<
    "AVAILABLE" | "UNAVAILABLE"
  >("AVAILABLE");

  const load = useCallback(
    async (quiet = false) => {
      if (!bookingId || !session?.activeOrganization || !project) return;
      quiet ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        setBooking(
          await fetchBooking(
            session.activeOrganization.id,
            project.id,
            bookingId,
            session.accessToken,
          ),
        );
      } catch (cause) {
        setError(getLocalizedErrorMessage(cause, t("errors.load")));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bookingId, project, session, t],
  );

  useEffect(() => {
    void load();
  }, [load]);

  function openCancellation() {
    if (!booking) return;
    setCancellationReason("");
    setError(null);
    setRestoredLeadStage(
      booking.leadStageBeforeBooking &&
        booking.leadStageBeforeBooking !== "BOOKED"
        ? booking.leadStageBeforeBooking
        : "NEGOTIATION",
    );
    setRestoredUnitStatus(
      booking.unitStatusBeforeBooking === "UNAVAILABLE"
        ? "UNAVAILABLE"
        : "AVAILABLE",
    );
    setShowCancellation(true);
  }

  async function confirmCancellation() {
    if (
      !booking ||
      !session?.activeOrganization ||
      !project ||
      !cancellationReason.trim() ||
      restoredLeadStage === "BOOKED"
    )
      return;
    setWorking(true);
    setError(null);
    try {
      const next = await cancelBooking(
        session.activeOrganization.id,
        project.id,
        booking.id,
        session.accessToken,
        {
          cancellationReason: cancellationReason.trim(),
          restoredLeadStage,
          ...(booking.unitId ? { restoredUnitStatus } : {}),
        },
      );
      setBooking(next);
      setShowCancellation(false);
      Alert.alert(
        t("bookings.cancelledTitle"),
        t("bookings.cancelledDescription"),
      );
    } catch (cause) {
      setError(getLocalizedErrorMessage(cause, t("errors.save")));
    } finally {
      setWorking(false);
    }
  }

  if (!bookingId || !project || !session?.activeOrganization) {
    return (
      <NirmanScreenBackground>
        <CompactScreenHeader
          leading={
            <IconButton
              icon="arrow-left"
              accessibilityLabel={tCommon("actions.back")}
              variant="glass"
              onPress={() => router.back()}
            />
          }
          title={t("bookings.detailTitle")}
        />
        <EmptyState
          title={t("noProject.title")}
          description={t("noProject.description")}
        />
      </NirmanScreenBackground>
    );
  }

  const canCancel = Boolean(
    booking?.status === "CONFIRMED" &&
    permissions.includes("leads:convert") &&
    (!booking.unitId || permissions.includes("inventory:book")),
  );

  return (
    <NirmanScreenBackground>
      <CompactScreenHeader
        leading={
          <IconButton
            icon="arrow-left"
            accessibilityLabel={tCommon("actions.back")}
            variant="glass"
            onPress={() => router.back()}
          />
        }
        title={t("bookings.detailTitle")}
        subtitle={booking?.bookingReference ?? project.name}
        action={
          <IconButton
            icon="refresh"
            accessibilityLabel={t("bookings.refresh")}
            disabled={refreshing}
            variant="glass"
            onPress={() => void load(true)}
          />
        }
      />
      <ProjectContextCard compact showSwitchAction />
      <FormError message={error} />
      {loading ? (
        <LoadingState label={t("loading")} />
      ) : booking ? (
        <>
          <OperationalEntityCard
            contextLeading={t("bookings.booking")}
            contextTrailing={t(`bookingStatus.${booking.status}`)}
            title={booking.customerName}
            supporting={
              booking.unitNumber
                ? t("bookings.linkedUnit", { unit: booking.unitNumber })
                : t("bookings.withoutInventory")
            }
            value={
              booking.bookingAmount == null
                ? undefined
                : formatInr(booking.bookingAmount, language, {
                    maximumFractionDigits: 0,
                  })
            }
            valueLabel={
              booking.bookingAmount == null ? undefined : t("bookings.amount")
            }
            footerLeading={formatDate(booking.bookingDate, language)}
            tone={booking.status === "CONFIRMED" ? "success" : "danger"}
          />

          <Card variant="blueprint" padding="sm">
            <SalesSectionHeading
              title={t("bookings.linkageTitle")}
              description={t("bookings.linkageDescription")}
            />
            <SalesDetailRows
              rows={[
                {
                  label: t("fields.customerMobile"),
                  value: booking.customerMobile,
                },
                {
                  label: t("fields.leadSource"),
                  value: t(`source.${booking.leadSource}`),
                },
                {
                  label: t("fields.bookingReference"),
                  value: booking.bookingReference,
                },
                {
                  label: t("fields.bookedBy"),
                  value: booking.bookedByName ?? booking.convertedByName,
                },
                {
                  label: t("fields.convertedAt"),
                  value: booking.convertedAt
                    ? formatDate(booking.convertedAt, language, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : null,
                },
                {
                  label: t("fields.previousLeadStage"),
                  value: booking.leadStageBeforeBooking
                    ? t(`stage.${booking.leadStageBeforeBooking}`)
                    : null,
                },
                {
                  label: t("fields.currentLeadStage"),
                  value: t(`stage.${booking.leadCurrentStage}`),
                },
                {
                  label: t("fields.previousUnitStatus"),
                  value: booking.unitStatusBeforeBooking
                    ? t(`unitStatus.${booking.unitStatusBeforeBooking}`)
                    : null,
                },
                {
                  label: t("fields.currentUnitStatus"),
                  value: booking.unitCurrentStatus
                    ? t(`unitStatus.${booking.unitCurrentStatus}`)
                    : null,
                },
              ]}
            />
            <Button
              label={t("bookings.openLead")}
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/(app)/sales-lead",
                  params: { leadId: booking.leadId },
                })
              }
            />
          </Card>

          {booking.status === "CANCELLED" ? (
            <Card variant="default" padding="sm">
              <SalesSectionHeading
                title={t("bookings.cancellationTitle")}
                description={booking.cancellationReason ?? undefined}
              />
              <SalesDetailRows
                rows={[
                  {
                    label: t("fields.cancelledBy"),
                    value: booking.cancelledByName,
                  },
                  {
                    label: t("fields.cancelledAt"),
                    value: booking.cancelledAt
                      ? formatDate(booking.cancelledAt, language, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : null,
                  },
                  {
                    label: t("fields.restoredLeadStage"),
                    value: booking.restoredLeadStage
                      ? t(`stage.${booking.restoredLeadStage}`)
                      : null,
                  },
                  {
                    label: t("fields.restoredUnitStatus"),
                    value: booking.restoredUnitStatus
                      ? t(`unitStatus.${booking.restoredUnitStatus}`)
                      : null,
                  },
                ]}
              />
            </Card>
          ) : null}

          {canCancel ? (
            <Button
              label={t("bookings.cancel")}
              variant="danger"
              onPress={openCancellation}
            />
          ) : null}
        </>
      ) : (
        <EmptyState
          title={t("bookings.notFoundTitle")}
          description={t("bookings.notFoundDescription")}
        />
      )}

      {showCancellation && booking ? (
        <BottomSheet
          visible
          title={t("bookings.cancelTitle")}
          description={t("bookings.cancelDescription")}
          scroll
          showCloseButton={false}
          onClose={() => setShowCancellation(false)}
          footer={
            <View style={styles.footer}>
              <Button
                style={styles.footerButton}
                label={tCommon("actions.cancel")}
                variant="secondary"
                onPress={() => setShowCancellation(false)}
              />
              <Button
                style={styles.footerButton}
                disabled={working || !cancellationReason.trim()}
                label={
                  working ? t("saving") : t("bookings.confirmCancellation")
                }
                variant="danger"
                onPress={() => void confirmCancellation()}
              />
            </View>
          }
        >
          <FormError message={error} />
          <FormField label={t("fields.cancellationReason")} required>
            <Input
              accessibilityLabel={t("fields.cancellationReason")}
              multiline
              numberOfLines={3}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              style={styles.multiline}
            />
          </FormField>
          <FormField label={t("fields.restoredLeadStage")} required>
            {RESTORABLE_LEAD_STAGES.map((value) => (
              <SalesChoice
                key={value}
                label={t(`stage.${value}`)}
                selected={restoredLeadStage === value}
                onPress={() => setRestoredLeadStage(value)}
              />
            ))}
          </FormField>
          {booking.unitId ? (
            <FormField label={t("fields.restoredUnitStatus")} required>
              {(["AVAILABLE", "UNAVAILABLE"] as const).map((value) => (
                <SalesChoice
                  key={value}
                  label={t(`unitStatus.${value}`)}
                  selected={restoredUnitStatus === value}
                  onPress={() => setRestoredUnitStatus(value)}
                />
              ))}
            </FormField>
          ) : null}
        </BottomSheet>
      ) : null}
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  footer: { flex: 1, flexDirection: "row", gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  multiline: {
    minHeight: 96,
    paddingTop: mobileTheme.spacing[3],
    textAlignVertical: "top",
  },
});
