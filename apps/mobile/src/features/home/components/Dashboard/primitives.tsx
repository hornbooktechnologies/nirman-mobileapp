import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Animated,
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { Card } from "../../../../components/ui/card";
import { AppIcon, type AppIconName } from "../../../../components/ui/app-icon";
import { mobileShadows, mobileText, mobileTheme } from "../../../../theme";

export type DashboardAction = {
  key: string;
  label: string;
  accessibilityHint?: string;
  icon?: AppIconName;
  onPress: () => void;
};
export type DashboardMetric = {
  key?: string;
  label: string;
  value: string | number;
  accessibilityLabel: string;
  icon?: AppIconName;
  artwork?: ImageSourcePropType;
};
export type DashboardAttention = {
  key?: string;
  label: string;
  meta: string;
  accessibilityLabel: string;
  icon?: AppIconName;
  tone?: "warning" | "danger";
  onPress: () => void;
};

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  return reduced;
}

export function Entrance({
  children,
  transitionKey,
}: {
  children: ReactNode;
  transitionKey?: string;
}) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    opacity.stopAnimation();
    if (reduced) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reduced, transitionKey]);
  return (
    <Animated.View
      style={{
        opacity,
        transform: [
          {
            translateY: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [6, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function DashboardSurface({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Entrance>
      <Card padding="none" style={[dashboardStyles.surface, style]}>
        {children}
      </Card>
    </Entrance>
  );
}

export function SectionTitle({
  title,
  icon,
  meta,
}: {
  title: string;
  icon: AppIconName;
  meta?: string;
}) {
  return (
    <View style={dashboardStyles.headingBlock}>
      <View style={dashboardStyles.heading}>
        <AppIcon
          name={icon}
          color={mobileTheme.color.text.link}
          size={20}
        />
        <AppText
          accessibilityRole="header"
          style={dashboardStyles.title}
          weight={700}
        >
          {title}
        </AppText>
      </View>
      {meta ? <AppText style={dashboardStyles.meta}>{meta}</AppText> : null}
    </View>
  );
}

export function Artwork({
  source,
  size = 48,
}: {
  source: ImageSourcePropType;
  size?: number;
}) {
  return (
    <Image
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      resizeMode="contain"
      source={source}
      style={{ width: size, height: size }}
    />
  );
}

export function DashboardBackdrop({ children }: { children: ReactNode }) {
  return <View style={dashboardStyles.content}>{children}</View>;
}

export const dashboardStyles = StyleSheet.create({
  content: { gap: mobileTheme.spacing[4] },
  surface: {
    backgroundColor: mobileTheme.color.background.elevated,
    borderColor: mobileTheme.color.border.subtle,
    borderWidth: 1,
    borderRadius: mobileTheme.radius.xl,
    padding: mobileTheme.spacing[4],
    gap: mobileTheme.spacing[3],
    ...mobileShadows.soft,
  },
  headingBlock: { gap: mobileTheme.spacing[1] },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    gap: mobileTheme.spacing[2],
  },
  title: { ...mobileText.sectionTitle, fontSize: 17, lineHeight: 24, flex: 1 },
  meta: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    fontSize: 12,
    lineHeight: 18,
  },
  body: { ...mobileText.body, fontSize: 14, lineHeight: 21 },
  label: { ...mobileText.label, fontSize: 14, lineHeight: 20 },
  value: { ...mobileText.title, fontSize: 24, lineHeight: 32 },
  divider: {
    borderTopColor: mobileTheme.color.border.subtle,
    borderTopWidth: 1,
  },
  pressed: { opacity: 0.72 },
});
