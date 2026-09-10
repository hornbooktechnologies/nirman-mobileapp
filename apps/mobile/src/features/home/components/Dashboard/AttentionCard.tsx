import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { AppIcon } from "../../../../components/ui/app-icon";
import { mobileTheme } from "../../../../theme";
import {
  Artwork,
  dashboardStyles,
  type DashboardAttention,
} from "./primitives";
import { dashboardAssets } from "./assets";
export function AttentionCard({
  items,
  emptyLabel,
}: {
  items: DashboardAttention[];
  emptyLabel: string;
}) {
  return items.length ? (
    <View>
      {items.map((item, index) => (
        <Pressable
          key={item.key ?? item.label}
          accessibilityRole="button"
          accessibilityLabel={item.accessibilityLabel}
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.row,
            index > 0 && dashboardStyles.divider,
            pressed && dashboardStyles.pressed,
          ]}
        >
          <Artwork
            source={
              item.tone === "danger"
                ? dashboardAssets.warning
                : dashboardAssets.material
            }
            size={42}
          />
          <View style={styles.copy}>
            <AppText style={dashboardStyles.label} weight={700}>
              {item.label}
            </AppText>
            <AppText style={dashboardStyles.meta}>{item.meta}</AppText>
          </View>
          <AppIcon
            name="chevron-right"
            size={18}
            color={mobileTheme.color.text.secondary}
          />
        </Pressable>
      ))}
    </View>
  ) : (
    <View style={styles.row}>
      <AppIcon
        name="check-circle-outline"
        size={24}
        color={mobileTheme.color.status.success.foreground}
      />
      <AppText style={[dashboardStyles.body, styles.copy]}>
        {emptyLabel}
      </AppText>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 76,
    paddingVertical: 12,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
});
