import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon, IconContainer, StatusBadge, type AppIconName } from '../../../components/ui';
import { mobileShadows, mobileText, mobileTheme } from '../../../theme';

type HomeSectionHeaderProps = {
  eyebrow: string;
  title: string;
  trailing?: ReactNode;
};

export function HomeSectionHeader({ eyebrow, title, trailing }: HomeSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingCopy}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {trailing}
    </View>
  );
}

type HomeMetricCardProps = {
  icon: AppIconName;
  label: string;
  tone: 'primary' | 'secondary';
  value: string | number;
};

export function HomeMetricCard({ icon, label, tone, value }: HomeMetricCardProps) {
  const isPrimary = tone === 'primary';

  return (
    <View style={[styles.metricCard, isPrimary ? styles.metricCardPrimary : styles.metricCardSecondary]}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={isPrimary ? styles.metricIconPrimary : styles.metricIconSecondary}
      >
        <AppIcon
          name={icon}
          size={mobileTheme.icon.lg}
          color={isPrimary ? mobileTheme.color.text.inverse : mobileTheme.color.brand.primary}
        />
      </View>
      <Text style={isPrimary ? styles.metricValuePrimary : styles.metricValueSecondary}>{value}</Text>
      <Text style={isPrimary ? styles.metricLabelPrimary : styles.metricLabelSecondary}>{label}</Text>
    </View>
  );
}

type WorkspaceTileProps = {
  description: string;
  emphasis?: boolean;
  icon: AppIconName;
  onPress: () => void;
  title: string;
  wide?: boolean;
};

export function WorkspaceTile({ description, emphasis = false, icon, onPress, title, wide = false }: WorkspaceTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        styles.workspaceTile,
        wide && styles.workspaceTileWide,
        emphasis && styles.workspaceTileEmphasis,
        pressed && styles.surfacePressed,
      ]}
    >
      <View style={styles.workspaceTileTop}>
        <IconContainer icon={icon} size="sm" variant={emphasis ? 'accent' : 'glass'} />
        <View style={[styles.workspaceArrow, emphasis && styles.workspaceArrowEmphasis]}>
          <AppIcon
            color={emphasis ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary}
            name="arrow-top-right"
            size={mobileTheme.icon.sm}
          />
        </View>
      </View>
      <View style={styles.workspaceTileCopy}>
        <Text style={[styles.workspaceTileTitle, emphasis && styles.workspaceTileTitleInverse]}>{title}</Text>
        <Text style={[styles.workspaceTileDescription, emphasis && styles.workspaceTileDescriptionInverse]}>{description}</Text>
      </View>
    </Pressable>
  );
}

type ProjectPortfolioItemProps = {
  meta: string;
  name: string;
  onPress: () => void;
  selected?: boolean;
  status: string;
};

export function ProjectPortfolioItem({ meta, name, onPress, selected = false, status }: ProjectPortfolioItemProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${name}, ${status.replaceAll('_', ' ')}${selected ? ', current project' : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.portfolioCard,
        selected && styles.portfolioCardSelected,
        pressed && styles.surfacePressed,
      ]}
    >
      <View style={[styles.projectMarker, selected && styles.projectMarkerSelected]}>
        <AppIcon
          color={selected ? mobileTheme.color.text.inverse : mobileTheme.color.brand.primary}
          name="office-building-marker-outline"
          size={mobileTheme.icon.lg}
        />
      </View>
      <View style={styles.projectCopy}>
        <Text style={styles.portfolioTitle} numberOfLines={1}>{name}</Text>
        <Text style={styles.portfolioCaption} numberOfLines={1}>{meta}</Text>
      </View>
      <View style={styles.portfolioMeta}>
        <StatusBadge label={status} />
        {selected ? (
          <StatusBadge label="CURRENT" />
        ) : (
          <AppIcon color={mobileTheme.color.text.muted} name="arrow-top-right" size={mobileTheme.icon.md} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeadingCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  sectionEyebrow: {
    ...mobileText.caption,
    color: mobileTheme.color.text.brand,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: mobileTheme.typography.letterSpacing.caps,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    ...mobileText.sectionTitle,
    fontSize: 21,
    lineHeight: 27,
  },
  metricCard: {
    borderRadius: mobileTheme.radius.xl,
    flex: 1,
    minHeight: 138,
    padding: mobileTheme.spacing[4],
  },
  metricCardPrimary: {
    backgroundColor: mobileTheme.color.brand.primary,
    ...mobileShadows.card,
  },
  metricCardSecondary: {
    backgroundColor: mobileTheme.color.background.warm,
    borderColor: mobileTheme.color.border.inverse,
    borderWidth: 1,
  },
  metricIconPrimary: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: mobileTheme.color.border.inverse,
    borderRadius: mobileTheme.radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  metricIconSecondary: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: mobileTheme.color.glass.strong,
    borderRadius: mobileTheme.radius.full,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  metricValuePrimary: {
    ...mobileText.title,
    color: mobileTheme.color.text.inverse,
    marginTop: mobileTheme.spacing[3],
  },
  metricValueSecondary: {
    ...mobileText.sectionTitle,
    color: mobileTheme.color.text.primary,
    marginTop: mobileTheme.spacing[3],
    textTransform: 'capitalize',
  },
  metricLabelPrimary: {
    ...mobileText.caption,
    color: mobileTheme.color.text.inverse,
  },
  metricLabelSecondary: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  workspaceTile: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: mobileTheme.spacing[5],
    minHeight: 176,
    padding: mobileTheme.spacing[4],
    ...mobileShadows.soft,
  },
  workspaceTileWide: {
    flexBasis: '100%',
    minHeight: 150,
  },
  workspaceTileEmphasis: {
    backgroundColor: mobileTheme.color.navigation.floating,
    borderColor: mobileTheme.color.border.inverse,
  },
  workspaceTileTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workspaceArrow: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.background.mist,
    borderRadius: mobileTheme.radius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  workspaceArrowEmphasis: {
    backgroundColor: mobileTheme.color.border.inverse,
  },
  workspaceTileCopy: {
    gap: mobileTheme.spacing[1],
  },
  workspaceTileTitle: {
    ...mobileText.sectionTitle,
    fontSize: 18,
    lineHeight: 23,
  },
  workspaceTileTitleInverse: {
    color: mobileTheme.color.text.inverse,
  },
  workspaceTileDescription: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  workspaceTileDescriptionInverse: {
    color: mobileTheme.color.text.inverse,
    opacity: 0.68,
  },
  portfolioCard: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 86,
    padding: mobileTheme.spacing[3],
    ...mobileShadows.soft,
  },
  portfolioCardSelected: {
    backgroundColor: mobileTheme.color.surface.blueprint,
    borderColor: mobileTheme.color.brand.blueprint,
  },
  projectMarker: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.brand.primarySoft,
    borderRadius: mobileTheme.radius.lg,
    height: 58,
    justifyContent: 'center',
    width: 58,
  },
  projectMarkerSelected: {
    backgroundColor: mobileTheme.color.brand.blueprint,
  },
  projectCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  portfolioTitle: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    fontSize: 16,
    lineHeight: 22,
  },
  portfolioCaption: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  portfolioMeta: {
    alignItems: 'flex-end',
    gap: mobileTheme.spacing[2],
  },
  surfacePressed: {
    opacity: 0.78,
  },
});
