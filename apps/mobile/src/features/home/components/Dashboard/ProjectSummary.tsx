import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { AppIcon } from "../../../../components/ui/app-icon";
import { mobileTheme } from "../../../../theme";
import { Artwork, dashboardStyles, type DashboardMetric } from "./primitives";
import { dashboardAssets } from "./assets";

export function ProjectSummary({
  items,
}: {
  items: Array<
    DashboardMetric & {
      tone: "brand" | "warm";
      onPress?: () => void;
      description?: string;
    }
  >;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={[styles.grid, fontScale > 1.35 && styles.stack]}>
      {items.map((item, index) => (
        <Pressable
          key={item.key ?? item.label}
          accessible
          accessibilityLabel={item.accessibilityLabel}
          accessibilityRole={item.onPress ? "button" : undefined}
          disabled={!item.onPress}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.card,
            item.tone === "brand" ? styles.olive : styles.sand,
            pressed && dashboardStyles.pressed,
          ]}
        >
          <View style={styles.artwork}>
            <Artwork
              source={
                index === 0 ? dashboardAssets.helmet : dashboardAssets.folder
              }
              size={32}
            />
          </View>
          <View style={styles.copy}>
            <AppText
              style={[
                dashboardStyles.value,
                styles.value,
                item.tone === "brand" && styles.inverse,
              ]}
              weight={700}
            >
              {item.value}
            </AppText>
            <AppText
              style={[
                dashboardStyles.label,
                item.tone === "brand" && styles.inverse,
              ]}
              weight={600}
            >
              {item.label}
            </AppText>
            {item.description ? (
              <AppText
                style={[
                  dashboardStyles.meta,
                  item.tone === "brand" && styles.inverse,
                ]}
              >
                {item.description}
              </AppText>
            ) : null}
          </View>
          {item.onPress ? (
            <AppIcon
              name="chevron-right"
              size={18}
              color={
                item.tone === "brand"
                  ? mobileTheme.color.text.inverse
                  : mobileTheme.color.text.primary
              }
            />
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: 12 },
  stack: { flexDirection: "column" },
  card: {
    flex: 1,
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    borderRadius: mobileTheme.radius.lg,
    minHeight: 76,
  },
  olive: { backgroundColor: mobileTheme.color.brand.primary },
  sand: {
    backgroundColor: mobileTheme.color.background.warm,
    borderColor: mobileTheme.color.border.subtle,
    borderWidth: 1,
  },
  artwork: { position: "absolute", right: 10, top: 8 },
  copy: { gap: 2, minWidth: 0, paddingRight: 34, width: "100%" },
  value: { fontSize: 18, lineHeight: 24 },
  inverse: { color: mobileTheme.color.text.inverse },
});
