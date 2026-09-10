import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { AppIcon, type AppIconName } from "../../../../components/ui/app-icon";
import { mobileTheme } from "../../../../theme";
import {
  DashboardSurface,
  SectionTitle,
  dashboardStyles,
  type DashboardAction,
} from "./primitives";

export function ActionList({ items }: { items: DashboardAction[] }) {
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > 1.3 ? 1 : 2;
  const rows = Array.from(
    { length: Math.ceil(items.length / columns) },
    (_, i) => items.slice(i * columns, (i + 1) * columns),
  );
  return (
    <View style={styles.rows}>
      {rows.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityHint={item.accessibilityHint}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.action,
                pressed && dashboardStyles.pressed,
              ]}
            >
              <View style={styles.iconContainer}>
                <AppIcon
                  name={item.icon ?? fallbackActionIcon(item.key)}
                  size={18}
                  color={mobileTheme.color.text.link}
                />
              </View>
              <AppText style={styles.label} weight={600}>
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

function fallbackActionIcon(key: string): AppIconName {
  if (key === "create-project") return "plus";
  if (key === "MARK_ATTENDANCE" || key === "attendance")
    return "clipboard-check-outline";
  if (key === "UPDATE_PROGRESS" || key === "progress")
    return "chart-timeline-variant";
  if (key === "workers") return "account-hard-hat-outline";
  if (key === "more") return "dots-horizontal";
  return "arrow-right";
}
export function QuickActions({
  items,
  title,
}: {
  items: DashboardAction[];
  title: string;
}) {
  return items.length ? (
    <DashboardSurface>
      <SectionTitle title={title} icon="lightning-bolt-outline" />
      <ActionList items={items} />
    </DashboardSurface>
  ) : null;
}
const styles = StyleSheet.create({
  rows: { gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  action: {
    flex: 1,
    minWidth: 0,
    minHeight: 58,
    alignItems: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 7,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderWidth: 1,
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.brand.secondarySoft,
    borderRadius: mobileTheme.radius.md,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  label: {
    ...dashboardStyles.label,
    color: mobileTheme.color.text.primary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});
