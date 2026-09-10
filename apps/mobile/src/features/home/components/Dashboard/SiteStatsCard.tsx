import { StyleSheet, View, useWindowDimensions } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { AppIcon, type AppIconName } from "../../../../components/ui/app-icon";
import { mobileTheme } from "../../../../theme";
import {
  Artwork,
  DashboardSurface,
  SectionTitle,
  dashboardStyles,
  type DashboardMetric,
} from "./primitives";
import { dashboardAssets } from "./assets";

export function SiteStatsCard({
  stats,
  title,
  dateLabel,
  loadingLabel,
  icon = "calendar-today",
}: {
  stats: DashboardMetric[];
  title: string;
  dateLabel?: string;
  loadingLabel?: string;
  icon?: "calendar-today" | "chart-line-variant";
}) {
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > 1.3 ? 1 : 2;
  const rows = Array.from(
    { length: Math.ceil(stats.length / columns) },
    (_, i) => stats.slice(i * columns, (i + 1) * columns),
  );
  return (
    <DashboardSurface style={styles.surface}>
      <SectionTitle title={title} icon={icon} meta={dateLabel} />
      {loadingLabel ? (
        <AppText style={dashboardStyles.body}>{loadingLabel}</AppText>
      ) : (
        <View>
          {rows.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[styles.row, rowIndex > 0 && dashboardStyles.divider]}
            >
              {row.map((stat, index) => {
                const icon = stat.icon ?? metricIcon(stat.key);
                return (
                  <View
                    key={stat.key ?? stat.label}
                    accessible
                    accessibilityLabel={stat.accessibilityLabel}
                    style={[styles.metric, index > 0 && styles.verticalDivider]}
                  >
                    {icon ? (
                      <View style={styles.iconContainer}>
                        <AppIcon
                          name={icon}
                          size={17}
                          color={mobileTheme.color.text.brand}
                        />
                      </View>
                    ) : (
                      <Artwork
                        source={stat.artwork ?? dashboardAssets.inventory}
                        size={32}
                      />
                    )}
                    <View style={styles.copy}>
                      <AppText
                        adjustsFontSizeToFit
                        minimumFontScale={0.82}
                        numberOfLines={1}
                        style={styles.value}
                        weight={700}
                      >
                        {stat.value}
                      </AppText>
                      <AppText style={styles.label} weight={500}>
                        {stat.label}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </DashboardSurface>
  );
}

function metricIcon(key?: string): AppIconName | undefined {
  if (key === "workers") return "account-hard-hat-outline";
  if (key === "present") return "account-check-outline";
  if (key === "absent") return "account-off-outline";
  if (key === "spend") return "cash";
  if (key === "pipeline") return "chart-line-variant";
  if (key === "overdueFollowUps") return "calendar-alert";
  if (key === "expiringBlocks") return "timer-alert-outline";
  if (key === "bookedUnits") return "home-outline";
  return undefined;
}

const styles = StyleSheet.create({
  surface: { gap: 8, padding: 14 },
  row: { flexDirection: "row" },
  metric: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
    gap: 6,
    minHeight: 72,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  verticalDivider: {
    borderLeftColor: mobileTheme.color.border.subtle,
    borderLeftWidth: 1,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.brand.primarySoft,
    borderRadius: mobileTheme.radius.md,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  copy: { flex: 1, gap: 1, minWidth: 0 },
  value: {
    ...dashboardStyles.value,
    fontSize: 19,
    lineHeight: 25,
    flexShrink: 1,
  },
  label: {
    ...dashboardStyles.meta,
    color: mobileTheme.color.text.secondary,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});
