import type { MaterialExpenseCard } from "@nirman-app/shared";
import { StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppText, Button, Card, StatusBadge } from "../../components/ui";
import { formatInr } from "../../i18n";
import { useLocalization } from "../../providers";
import { mobileTheme } from "../../theme";
import { MaterialDetailRows, materialTone } from "../materials/materials-ui";

export function MaterialExpenseCardView({
  item: i,
  canOpen,
  onOpen,
}: {
  item: MaterialExpenseCard;
  canOpen: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation("totalExpenses");
  const { t: materials } = useTranslation("materials");
  const { language } = useLocalization();
  const unit =
    i.unitOfMeasure === "OTHER"
      ? (i.customUnitLabel ?? materials("unit.OTHER"))
      : materials(`unit.${i.unitOfMeasure}`);
  const quantity = (value: string) =>
    `${new Intl.NumberFormat(language, { maximumFractionDigits: 3 }).format(Number(value))} ${unit}`;
  const money = (value: string | null) =>
    value === null ? t("notRecorded") : formatInr(Number(value), language);
  return (
    <Card style={styles.stack}>
      <View style={styles.header}>
        <AppText weight={700} style={styles.name}>
          {i.materialName}
        </AppText>
        <StatusBadge
          label={materials(`status.${i.status}`)}
          tone={materialTone(i.status)}
        />
      </View>
      <MaterialDetailRows
        rows={[
          {
            label: t("requestedQuantity"),
            value: quantity(i.requestedQuantity),
          },
          { label: t("orderedQuantity"), value: quantity(i.orderedQuantity) },
          {
            label: t("deliveredQuantity"),
            value: quantity(i.deliveredQuantity),
          },
          {
            label: t("awaitingDelivery"),
            value: quantity(i.awaitingDeliveryQuantity),
          },
          {
            label: t("unorderedQuantity"),
            value: quantity(i.unorderedQuantity),
          },
        ]}
      />
      <View style={styles.costs}>
        <MaterialDetailRows
          rows={[
            { label: t("requestEstimate"), value: money(i.estimatedCost) },
            { label: t("orderCost"), value: money(i.orderCost) },
            { label: t("lifetime"), value: money(i.lifetimePaidAmount) },
            { label: t("balanceDue"), value: money(i.remainingAmount) },
          ]}
        />
      </View>
      {i.unpricedPurchaseCount > 0 ? (
        <AppText>{t("unpricedOrders")}</AppText>
      ) : null}
      {canOpen ? (
        <Button
          label={t("viewOrdersPayments")}
          variant="secondary"
          onPress={onOpen}
        />
      ) : (
        <AppText>{t("detailUnavailable")}</AppText>
      )}
    </Card>
  );
}
const styles = StyleSheet.create({
  stack: { gap: mobileTheme.spacing[3] },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: mobileTheme.spacing[2],
  },
  name: { flexShrink: 1 },
  costs: {
    borderTopWidth: 1,
    borderTopColor: mobileTheme.color.border.subtle,
    paddingTop: mobileTheme.spacing[3],
  },
});
