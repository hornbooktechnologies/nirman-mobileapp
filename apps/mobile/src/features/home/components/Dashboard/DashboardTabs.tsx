import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { AppText } from "../../../../components/ui/app-text";
import { mobileTheme } from "../../../../theme";
import {
  DashboardSurface,
  Entrance,
  dashboardStyles,
  type DashboardAction,
  type DashboardAttention,
  type DashboardMetric,
} from "./primitives";
import { FinancialCard } from "./FinancialCard";
import { AttentionCard } from "./AttentionCard";
import { ActionList } from "./QuickActions";

export type DashboardTabsProps = {
  actions: DashboardAction[];
  actionsLabel: string;
  attentionEmptyLabel: string;
  attentionItems: DashboardAttention[];
  attentionLabel: string;
  financeLabel: string;
  financeMetrics: DashboardMetric[];
  loadingLabel?: string;
  showAttention?: boolean;
};
export function DashboardTabs(props: DashboardTabsProps) {
  const tabs = [
    ...(props.financeMetrics.length
      ? [{ key: "finance", label: props.financeLabel }]
      : []),
    ...(props.actions.length
      ? [{ key: "actions", label: props.actionsLabel }]
      : []),
    ...(props.showAttention
      ? [{ key: "attention", label: props.attentionLabel }]
      : []),
  ];
  const [active, setActive] = useState("finance");
  const { fontScale } = useWindowDimensions();
  const selected = tabs.some((tab) => tab.key === active)
    ? active
    : tabs[0]?.key;
  if (!selected) return null;
  return (
    <DashboardSurface>
      <View
        accessibilityRole="tablist"
        style={[styles.tabs, fontScale > 1.3 && styles.stack]}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: selected === tab.key }}
            aria-selected={selected === tab.key}
            onPress={() => setActive(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              selected === tab.key && styles.selected,
              pressed && dashboardStyles.pressed,
            ]}
          >
            <AppText
              style={[styles.label, selected === tab.key && styles.selectedLabel]}
              weight={600}
            >
              {tab.label}
            </AppText>
          </Pressable>
        ))}
      </View>
      <Entrance transitionKey={selected}>
        {props.loadingLabel ? (
          <AppText style={dashboardStyles.body}>{props.loadingLabel}</AppText>
        ) : selected === "finance" ? (
          <FinancialCard metrics={props.financeMetrics} />
        ) : selected === "attention" ? (
          <AttentionCard
            items={props.attentionItems}
            emptyLabel={props.attentionEmptyLabel}
          />
        ) : (
          <ActionList items={props.actions} />
        )}
      </Entrance>
    </DashboardSurface>
  );
}
const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    padding: 4,
    gap: 4,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.color.status.neutral.background,
  },
  stack: { flexDirection: "column" },
  tab: {
    flex: 1,
    minWidth: 0,
    minHeight: 50,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selected: {
    backgroundColor: mobileTheme.color.brand.secondarySoft,
    borderColor: mobileTheme.color.border.accent,
  },
  label: {
    ...dashboardStyles.label,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: mobileTheme.color.text.secondary,
  },
  selectedLabel: { color: mobileTheme.color.text.link },
});
