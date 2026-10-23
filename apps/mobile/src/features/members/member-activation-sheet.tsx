import { Linking, Share, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";

import {
  AppText,
  BottomSheet,
  Button,
  Card,
  StatusBadge,
} from "../../components/ui";
import { mobileTheme } from "../../theme";
import type { OrganizationMemberInvitationResponse } from "./types";

const deliveryStatusTranslationKeys = {
  EMAIL_SENT: "deliveryStatus.EMAIL_SENT",
  EMAIL_FAILED: "deliveryStatus.EMAIL_FAILED",
  MANUAL: "deliveryStatus.MANUAL",
} as const;

export function MemberActivationSheet({
  invitation,
  member,
  onClose,
}: {
  invitation: OrganizationMemberInvitationResponse["invitation"];
  member: { name: string; email: string; roleName: string };
  onClose: () => void;
}) {
  const { t } = useTranslation("members");
  const activationUrl =
    invitation.mobileActivationUrl || invitation.activationUrl;

  return (
    <BottomSheet
      visible
      scroll
      title={t("invitation.readyTitle")}
      description={t("invitation.readyDescription", { name: member.name })}
      onClose={onClose}
    >
      <Card variant="blueprint" style={styles.card}>
        <AppText style={styles.name} weight={700}>
          {member.name}
        </AppText>
        <AppText style={styles.detail}>
          {member.roleName} · {member.email}
        </AppText>
        <View style={styles.statusRow}>
          <StatusBadge
            label={t(deliveryStatusTranslationKeys[invitation.deliveryStatus])}
          />
          <AppText style={styles.detail}>
            {t("invitation.expires", {
              date: new Date(invitation.expiresAt).toLocaleString(),
            })}
          </AppText>
        </View>
      </Card>

      <View style={styles.linkCard}>
        <AppText style={styles.linkLabel} weight={600}>
          {t("invitation.linkLabel")}
        </AppText>
        <AppText selectable style={styles.link}>
          {invitation.activationUrl}
        </AppText>
      </View>

      <View style={styles.actions}>
        <Button
          label={t("invitation.open")}
          variant="info"
          style={styles.action}
          onPress={() => void Linking.openURL(invitation.activationUrl)}
        />
        <Button
          label={t("invitation.share")}
          style={styles.action}
          onPress={() =>
            void Share.share({
              title: t("invitation.shareTitle", { name: member.name }),
              message: activationUrl,
            })
          }
        />
      </View>

      <AppText style={styles.securityNote}>
        {t("invitation.securityNote")}
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  card: { gap: mobileTheme.spacing[2] },
  name: { color: mobileTheme.color.text.primary },
  detail: { color: mobileTheme.color.text.muted },
  statusRow: {
    gap: mobileTheme.spacing[3],
    marginTop: mobileTheme.spacing[2],
  },
  linkCard: {
    gap: mobileTheme.spacing[2],
    padding: mobileTheme.spacing[4],
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.color.surface.sunken,
  },
  linkLabel: { color: mobileTheme.color.text.primary },
  link: { color: mobileTheme.color.text.link },
  actions: { flexDirection: "row", gap: mobileTheme.spacing[3] },
  action: { flex: 1 },
  securityNote: { color: mobileTheme.color.text.muted },
});
