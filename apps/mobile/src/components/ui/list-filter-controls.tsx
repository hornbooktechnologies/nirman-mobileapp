import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type ViewProps } from "react-native";

import { mobileText, mobileTheme } from "../../theme";
import { AppIcon } from "./app-icon";
import { AppText } from "./app-text";
import { BottomSheet } from "./modal";
import { Button } from "./button";

type ListFilterBarProps = {
  search: ReactNode;
  filterLabel: string;
  filterAccessibilityLabel: string;
  activeFilterCount?: number;
  expanded?: boolean;
  onOpenFilters: () => void;
};

type AppliedFilterChipProps = {
  label: string;
  removeAccessibilityLabel: string;
  onRemove: () => void;
};

type ListFilterSheetProps = {
  visible: boolean;
  title: string;
  description?: string;
  clearLabel: string;
  applyLabel: string;
  onClear: () => void;
  onApply: () => void;
  onClose: () => void;
  children: ReactNode;
};

type FilterGroupProps = {
  label: string;
  children: ReactNode;
};

type FilterOptionProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function ListControls({ style, ...props }: ViewProps) {
  return <View style={[styles.controls, style]} {...props} />;
}

export function ListFilterBar({
  search,
  filterLabel,
  filterAccessibilityLabel,
  activeFilterCount = 0,
  expanded = false,
  onOpenFilters,
}: ListFilterBarProps) {
  return (
    <View style={styles.toolbar}>
      <View style={styles.search}>{search}</View>
      <Pressable
        accessibilityLabel={filterAccessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [
          styles.filterButton,
          activeFilterCount > 0 && styles.filterButtonActive,
          pressed && styles.pressed,
        ]}
        onPress={onOpenFilters}
      >
        <AppIcon
          color={
            activeFilterCount > 0
              ? mobileTheme.color.action.primary
              : mobileTheme.color.text.secondary
          }
          name="filter-variant"
          size={mobileTheme.icon.sm}
        />
        <AppText
          style={[
            styles.filterButtonLabel,
            activeFilterCount > 0 && styles.filterButtonLabelActive,
          ]}
          weight={700}
        >
          {filterLabel}
        </AppText>
        {activeFilterCount > 0 ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.countBadge}
          >
            <AppText style={styles.countText} weight={700}>
              {activeFilterCount}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

export function AppliedFilters({ children }: { children: ReactNode }) {
  return <View style={styles.appliedFilters}>{children}</View>;
}

export function AppliedFilterChip({
  label,
  removeAccessibilityLabel,
  onRemove,
}: AppliedFilterChipProps) {
  return (
    <Pressable
      accessibilityLabel={removeAccessibilityLabel}
      accessibilityRole="button"
      style={({ pressed }) => [styles.appliedChip, pressed && styles.pressed]}
      onPress={onRemove}
    >
      <AppText style={styles.appliedChipLabel} weight={600}>
        {label}
      </AppText>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AppIcon
          color={mobileTheme.color.action.primary}
          name="close"
          size={mobileTheme.icon.sm}
        />
      </View>
    </Pressable>
  );
}

export function ListFilterSheet({
  visible,
  title,
  description,
  clearLabel,
  applyLabel,
  onClear,
  onApply,
  onClose,
  children,
}: ListFilterSheetProps) {
  return (
    <BottomSheet
      visible={visible}
      title={title}
      description={description}
      scroll
      showCloseButton={false}
      onClose={onClose}
      footer={
        <>
          <Button
            label={clearLabel}
            variant="secondary"
            style={styles.footerButton}
            onPress={onClear}
          />
          <Button
            label={applyLabel}
            style={styles.footerButton}
            onPress={onApply}
          />
        </>
      }
    >
      {children}
    </BottomSheet>
  );
}

export function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      <AppText style={styles.groupLabel} weight={700}>
        {label}
      </AppText>
      <View style={styles.options}>{children}</View>
    </View>
  );
}

export function FilterOption({ label, selected, onPress }: FilterOptionProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      <AppText
        style={[styles.optionLabel, selected && styles.optionLabelSelected]}
        weight={600}
      >
        {label}
      </AppText>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <AppIcon
          color={
            selected
              ? mobileTheme.color.action.primary
              : mobileTheme.color.text.muted
          }
          name={selected ? "radiobox-marked" : "radiobox-blank"}
          size={mobileTheme.icon.md}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: mobileTheme.spacing[3],
  },
  toolbar: {
    alignItems: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing[2],
  },
  search: {
    flexBasis: 220,
    flexGrow: 1,
    minWidth: 0,
  },
  filterButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.component.field.radius,
    borderWidth: 1,
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: mobileTheme.spacing[3],
  },
  filterButtonActive: {
    backgroundColor: mobileTheme.color.status.info.background,
    borderColor: mobileTheme.color.border.selected,
  },
  filterButtonLabel: {
    ...mobileText.label,
    color: mobileTheme.color.text.secondary,
  },
  filterButtonLabelActive: {
    color: mobileTheme.color.action.primary,
  },
  countBadge: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.action.primary,
    borderRadius: mobileTheme.radius.full,
    justifyContent: "center",
    minHeight: 22,
    minWidth: 22,
    paddingHorizontal: mobileTheme.spacing[1],
  },
  countText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.inverse,
    fontVariant: ["tabular-nums"],
  },
  appliedFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: mobileTheme.spacing[2],
  },
  appliedChip: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.status.info.background,
    borderColor: mobileTheme.color.status.info.border,
    borderRadius: mobileTheme.component.chip.radius,
    borderWidth: 1,
    flexDirection: "row",
    gap: mobileTheme.spacing[2],
    minHeight: 48,
    paddingHorizontal: mobileTheme.spacing[3],
  },
  appliedChipLabel: {
    ...mobileText.label,
    color: mobileTheme.color.action.primary,
    flexShrink: 1,
  },
  group: {
    gap: mobileTheme.spacing[2],
  },
  groupLabel: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
  },
  options: {
    gap: mobileTheme.spacing[2],
  },
  option: {
    alignItems: "center",
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: mobileTheme.spacing[3],
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: mobileTheme.spacing[4],
    paddingVertical: mobileTheme.spacing[2],
  },
  optionSelected: {
    backgroundColor: mobileTheme.color.status.info.background,
    borderColor: mobileTheme.color.border.selected,
  },
  optionLabel: {
    ...mobileText.body,
    color: mobileTheme.color.text.primary,
    flex: 1,
  },
  optionLabelSelected: {
    color: mobileTheme.color.action.primary,
  },
  footerButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
