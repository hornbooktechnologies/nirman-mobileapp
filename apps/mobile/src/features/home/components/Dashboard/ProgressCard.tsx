import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../../../components/ui/app-text";
import { mobileTheme } from "../../../../theme";
import {
  DashboardSurface,
  SectionTitle,
  dashboardStyles,
  useReducedMotion,
} from "./primitives";

export function ProgressCard({
  accessibilityLabel,
  emptyLabel,
  loadingLabel,
  onPress,
  percentage,
  statusLabel,
  summaryLabel,
  title,
}: {
  accessibilityLabel: string;
  emptyLabel: string;
  loadingLabel?: string;
  onPress: () => void;
  percentage?: number;
  statusLabel?: string;
  summaryLabel: string;
  title: string;
}) {
  const reduced = useReducedMotion();
  const value =
    typeof percentage === "number" && Number.isFinite(percentage)
      ? Math.max(0, Math.min(100, percentage))
      : undefined;
  const progress = useRef(new Animated.Value(value ?? 0)).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) {
      progress.setValue(value ?? 0);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: value ?? 0,
      duration: 450,
      useNativeDriver: false,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduced, value]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => pressed && dashboardStyles.pressed}
    >
      <DashboardSurface style={styles.card}>
        <LinearGradient
          accessible={false}
          pointerEvents="none"
          colors={mobileTheme.gradient.summarySurface}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, styles.wash]}
        />
        <View style={styles.content}>
          <SectionTitle title={title} icon="chart-timeline-variant" />
          {loadingLabel ? (
            <AppText style={dashboardStyles.body}>{loadingLabel}</AppText>
          ) : value === undefined ? (
            <AppText style={dashboardStyles.body}>{emptyLabel}</AppText>
          ) : (
            <>
              <View style={styles.summaryRow}>
                <AppText style={styles.summary} weight={600}>
                  {summaryLabel}
                </AppText>
                <AppText style={styles.percentage} weight={700}>
                  {value}%
                </AppText>
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: value }}
                style={styles.track}
              >
                <Animated.View
                  style={[
                    styles.fill,
                    {
                      width: progress.interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                >
                  <LinearGradient
                    accessible={false}
                    colors={mobileTheme.gradient.progressAccent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </Animated.View>
              </View>
              {statusLabel ? (
                <AppText style={dashboardStyles.meta}>{statusLabel}</AppText>
              ) : null}
            </>
          )}
        </View>
      </DashboardSurface>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    gap: 0,
    minHeight: 126,
    overflow: "hidden",
    padding: 14,
  },
  wash: { opacity: 0.55 },
  content: { gap: 8, zIndex: 1 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summary: { ...dashboardStyles.label, color: mobileTheme.color.text.primary },
  percentage: {
    ...dashboardStyles.value,
    fontSize: 20,
    lineHeight: 26,
    color: mobileTheme.color.text.primary,
  },
  track: {
    backgroundColor: mobileTheme.color.status.neutral.background,
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  fill: {
    backgroundColor: mobileTheme.color.brand.primary,
    borderRadius: 999,
    height: "100%",
    overflow: "hidden",
  },
});
