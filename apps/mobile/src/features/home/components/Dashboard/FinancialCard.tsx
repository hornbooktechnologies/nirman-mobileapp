import { StyleSheet, View } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { Artwork, dashboardStyles, type DashboardMetric } from "./primitives";
import { dashboardAssets } from "./assets";
export function FinancialCard({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <View>
      {metrics.map((metric, index) => (
        <View
          key={metric.key ?? metric.label}
          accessible
          accessibilityLabel={metric.accessibilityLabel}
          style={[styles.row, index > 0 && dashboardStyles.divider]}
        >
          <Artwork
            source={
              metric.artwork ??
              (metric.key === "kharchi"
                ? dashboardAssets.kharchi
                : metric.key === "wages"
                  ? dashboardAssets.wages
                  : dashboardAssets.money)
            }
            size={46}
          />
          <View style={styles.copy}>
            <AppText style={dashboardStyles.meta} weight={500}>
              {metric.label}
            </AppText>
            <AppText style={dashboardStyles.value} weight={700}>
              {metric.value}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 84,
    paddingVertical: 12,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
});
