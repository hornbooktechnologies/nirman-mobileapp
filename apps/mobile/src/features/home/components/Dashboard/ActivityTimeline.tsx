import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { AppIcon } from "../../../../components/ui/app-icon";
import { mobileTheme } from "../../../../theme";
import {
  Artwork,
  DashboardSurface,
  SectionTitle,
  dashboardStyles,
} from "./primitives";
import { dashboardAssets } from "./assets";
export type DashboardActivity = {
  id: string;
  title: string;
  date: string;
  status: string;
  statusTone: "success" | "warning" | "danger";
  thumbnail?: ReactNode;
  onPress: () => void;
};
export function ActivityTimeline({
  items,
  title,
  emptyLabel,
  viewAllLabel,
  onViewAll,
  loadingLabel,
}: {
  items: DashboardActivity[];
  title: string;
  emptyLabel: string;
  viewAllLabel: string;
  onViewAll: () => void;
  loadingLabel?: string;
}) {
  return (
    <DashboardSurface>
      <SectionTitle title={title} icon="clipboard-text-outline" />
      {loadingLabel ? (
        <AppText style={dashboardStyles.body}>{loadingLabel}</AppText>
      ) : items.length ? (
        <View>
          {items.map((item, index) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.date}. ${item.status}`}
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.row,
                index > 0 && dashboardStyles.divider,
                pressed && dashboardStyles.pressed,
              ]}
            >
              <View style={styles.thumbnail}>
                {item.thumbnail ?? (
                  <Artwork source={dashboardAssets.activity} size={58} />
                )}
              </View>
              <View style={styles.copy}>
                <AppText style={dashboardStyles.label} weight={700}>
                  {item.title}
                </AppText>
                <AppText style={dashboardStyles.meta}>{item.date}</AppText>
                <View style={styles.status}>
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          mobileTheme.color.status[item.statusTone].foreground,
                      },
                    ]}
                  />
                  <AppText style={dashboardStyles.meta}>{item.status}</AppText>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <AppText style={dashboardStyles.body}>{emptyLabel}</AppText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={viewAllLabel}
        onPress={onViewAll}
        style={({ pressed }) => [
          styles.viewAll,
          pressed && dashboardStyles.pressed,
        ]}
      >
        <AppText style={[dashboardStyles.label, styles.link]} weight={700}>
          {viewAllLabel}
        </AppText>
        <AppIcon
          name="arrow-right"
          size={18}
          color={mobileTheme.color.text.link}
        />
      </Pressable>
    </DashboardSurface>
  );
}
const styles = StyleSheet.create({
  link: { color: mobileTheme.color.text.link },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    minHeight: 90,
    paddingVertical: 12,
  },
  thumbnail: {
    width: 60,
    height: 60,
    overflow: "hidden",
    borderRadius: mobileTheme.radius.md,
    backgroundColor: mobileTheme.color.background.warm,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  status: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 6 },
  viewAll: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    ...dashboardStyles.divider,
  },
});
