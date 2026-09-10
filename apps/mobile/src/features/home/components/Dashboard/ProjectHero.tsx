import { Animated, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { AppIcon } from "../../../../components/ui/app-icon";
import { mobileShadows, mobileText, mobileTheme } from "../../../../theme";
import { dashboardAssets } from "./assets";
import { useReducedMotion } from "./primitives";

export type ProjectHeroProps = {
  projectName: string;
  selectedLabel: string;
  location?: string;
  accessLabel: string;
  accessValue: string;
  switchLabel: string;
  switchAccessibilityLabel: string;
  openLabel: string;
  openAccessibilityLabel: string;
  onSwitch?: () => void;
  onOpen?: () => void;
  scrollY?: Animated.Value;
};

export function ProjectHero(props: ProjectHeroProps) {
  const reduced = useReducedMotion();
  const translateY =
    props.scrollY && !reduced
      ? props.scrollY.interpolate({
          inputRange: [0, 360],
          outputRange: [0, 16],
          extrapolate: "clamp",
        })
      : 0;
  return (
    <View style={styles.card}>
      <Animated.Image
        accessible={false}
        source={dashboardAssets.dashboardCard}
        resizeMode="cover"
        style={[styles.background, { transform: [{ translateY }] }]}
      />
      <View style={styles.top}>
        <View style={styles.eyebrow}>
          <View style={styles.dot} />
          <AppText style={styles.eyebrowText} weight={600}>
            {props.selectedLabel}
          </AppText>
        </View>
        {props.onSwitch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.switchAccessibilityLabel}
            onPress={props.onSwitch}
            style={({ pressed }) => [
              styles.switchButton,
              pressed && styles.pressed,
            ]}
          >
            <AppIcon
              name="swap-horizontal"
              size={20}
              color={mobileTheme.color.text.inverse}
            />
            <AppText style={styles.switchText} weight={600}>
              {props.switchLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText accessibilityRole="header" style={styles.project} weight={700}>
        {props.projectName}
      </AppText>
      {props.location ? (
        <View style={styles.location}>
          <AppIcon
            name="map-marker-outline"
            size={16}
            color={mobileTheme.color.text.primary}
          />
          <AppText style={styles.locationText}>{props.location}</AppText>
        </View>
      ) : null}
      <View style={styles.divider} />
      <View style={styles.footer}>
        {props.onOpen ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.openAccessibilityLabel}
            onPress={props.onOpen}
            style={({ pressed }) => [
              styles.openButton,
              pressed && styles.pressed,
            ]}
          >
            <AppText style={styles.openText} weight={700}>
              {props.openLabel}
            </AppText>
            <AppIcon
              name="arrow-right"
              size={20}
              color={mobileTheme.color.text.link}
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: mobileTheme.color.background.elevated,
    borderRadius: mobileTheme.radius.xxl,
    overflow: "hidden",
    padding: mobileTheme.spacing[4],
    minHeight: 320,
    ...mobileShadows.soft,
  },
  background: {
    position: "absolute",
    height: 480,
    left: -610,
    top: -60,
    width: 1440,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    zIndex: 1,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 7,
    backgroundColor: mobileTheme.color.action.primary,
  },
  eyebrowText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
  },
  switchButton: {
    minHeight: 50,
    paddingHorizontal: 12,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.color.brand.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  switchText: {
    ...mobileText.label,
    color: mobileTheme.color.text.inverse,
    fontSize: 13,
    lineHeight: 19,
  },
  project: {
    ...mobileText.title,
    color: mobileTheme.color.text.primary,
    fontSize: 28,
    lineHeight: 33,
    marginTop: 14,
    maxWidth: "76%",
    zIndex: 1,
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    maxWidth: "76%",
    zIndex: 2,
  },
  locationText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  divider: {
    backgroundColor: mobileTheme.color.border.default,
    height: StyleSheet.hairlineWidth,
    marginTop: 12,
    width: "52%",
    zIndex: 2,
  },
  footer: {
    alignItems: "flex-end",
    bottom: mobileTheme.spacing[4],
    flexDirection: "row",
    justifyContent: "flex-end",
    left: mobileTheme.spacing[4],
    position: "absolute",
    right: mobileTheme.spacing[4],
    zIndex: 3,
  },
  openButton: {
    minHeight: 52,
    minWidth: 142,
    borderRadius: mobileTheme.radius.xl,
    backgroundColor: mobileTheme.color.surface.raised,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    ...mobileShadows.card,
  },
  openText: {
    ...mobileText.label,
    color: mobileTheme.color.text.link,
    fontSize: 14,
    lineHeight: 21,
  },
  pressed: { opacity: 0.75 },
});
