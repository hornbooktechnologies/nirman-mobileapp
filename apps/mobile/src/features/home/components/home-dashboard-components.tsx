import type { ReactNode } from 'react';
import type { RoleDashboardProfile } from '@nirman-app/shared';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { AppIcon, AppText, Card, IconContainer, type AppIconName } from '../../../components/ui';
import { mobileShadows, mobileText, mobileTheme } from '../../../theme';

const WORKFORCE_ART = require('../../../../assets/brand/ChatGPT Image Sep 2, 2026, 04_25_58 PM (4).png');
const MATERIALS_ART = require('../../../../assets/brand/ChatGPT Image Sep 2, 2026, 04_26_01 PM (9).png');
const FINANCE_ART = require('../../../../assets/brand/ChatGPT Image Sep 2, 2026, 04_26_02 PM (10).png');
const PROGRESS_ART = require('../../../../assets/brand/ChatGPT Image Sep 2, 2026, 04_26_01 PM (8).png');

type HomeSectionHeaderProps = {
  eyebrow: string;
  title: string;
  trailing?: ReactNode;
};

export function HomeSectionHeader({ eyebrow, title, trailing }: HomeSectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeadingCopy}>
        <AppText style={styles.sectionEyebrow} weight={700}>{eyebrow}</AppText>
        <AppText style={styles.sectionTitle} weight={700}>{title}</AppText>
      </View>
      {trailing}
    </View>
  );
}

export function RoleDashboardHero({ profile, title, subtitle, badge, metrics }: { profile: RoleDashboardProfile; title: string; subtitle: string; badge: string; metrics: Array<{ label: string; value: string }> }) {
  const icon = profile === 'SALES' ? 'account-tie-outline' : profile === 'SUPERVISOR' ? 'hard-hat' : profile === 'CONTRACTOR' ? 'tools' : 'view-dashboard-outline';
  return (
    <LinearGradient colors={mobileTheme.gradient.darkBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roleHero}>
      <View accessible={false} style={styles.roleHeroGlow} />
      <View style={styles.roleHeroTop}>
        <View style={styles.roleHeroIcon}><AppIcon color={mobileTheme.color.text.inverse} name={icon} size={mobileTheme.icon.md} /></View>
        <AppText style={styles.roleHeroBadge} weight={700}>{badge}</AppText>
      </View>
      <AppText style={styles.roleHeroTitle} weight={700}>{title}</AppText>
      <AppText style={styles.roleHeroSubtitle} weight={500}>{subtitle}</AppText>
      <View style={styles.roleHeroMetrics}>
        {metrics.slice(0, 3).map((metric, index) => (
          <View key={metric.label} style={[styles.roleHeroMetric, index > 0 && styles.roleHeroMetricBorder]}>
            <AppText style={styles.roleHeroMetricValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} weight={700}>{metric.value}</AppText>
            <AppText style={styles.roleHeroMetricLabel} numberOfLines={2} weight={500}>{metric.label}</AppText>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

type ProjectSummaryItem = {
  accessibilityLabel: string;
  icon: AppIconName;
  label: string;
  tone: 'brand' | 'warm';
  value: string | number;
};

export function ProjectSummaryStrip({ items }: { items: ProjectSummaryItem[] }) {
  return (
    <View style={styles.summaryStrip}>
      {items.map((item) => {
        const isBrand = item.tone === 'brand';
        return (
        <View key={item.label} accessible accessibilityLabel={item.accessibilityLabel} style={[styles.summaryItem, isBrand ? styles.summaryItemBrand : styles.summaryItemWarm]}>
          <View style={[styles.summaryIcon, isBrand && styles.summaryIconBrand]}>
            <AppIcon color={isBrand ? mobileTheme.color.text.inverse : mobileTheme.color.brand.primary} name={item.icon} size={mobileTheme.icon.lg} />
          </View>
          <View style={styles.summaryCopy}>
            <AppText style={[styles.summaryValue, isBrand && styles.summaryTextBrand]} numberOfLines={2} weight={700}>{item.value}</AppText>
            <AppText style={[styles.summaryLabel, isBrand && styles.summaryLabelBrand]} weight={500}>{item.label}</AppText>
          </View>
        </View>
      )})}
    </View>
  );
}

type SiteStat = {
  accessibilityLabel: string;
  icon: AppIconName;
  label: string;
  value: string | number;
};

export function TodayAtSiteCard({ artwork = true, loadingLabel, stats, title }: { artwork?: boolean; loadingLabel?: string; stats: SiteStat[]; title: string }) {
  const statRows = [stats.slice(0, 2), stats.slice(2, 4)].filter((row) => row.length > 0);

  return (
    <Card style={styles.storyCard}>
      {artwork ? <Image accessible={false} resizeMode="contain" source={WORKFORCE_ART} style={styles.workforceArtwork} /> : null}
      <View style={styles.cardHeading}>
        <AppIcon color={mobileTheme.color.action.primary} name="calendar-today" size={mobileTheme.icon.md} />
        <AppText style={styles.cardHeadingText} weight={700}>{title}</AppText>
      </View>
      {loadingLabel ? <AppText style={styles.loadingText} weight={500}>{loadingLabel}</AppText> : (
        <View style={styles.statGrid}>
          {statRows.map((row, rowIndex) => (
            <View key={`stat-row-${rowIndex}`} style={styles.statRow}>
              {row.map((stat) => (
                <View key={stat.label} accessible accessibilityLabel={stat.accessibilityLabel} style={styles.statItem}>
                  <AppIcon color={mobileTheme.color.brand.primary} name={stat.icon} size={mobileTheme.icon.md} />
                  <AppText style={styles.statValue} weight={700}>{stat.value}</AppText>
                  <AppText style={styles.statLabel} weight={500}>{stat.label}</AppText>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

export type AttentionItemProps = {
  accessibilityLabel: string;
  icon: AppIconName;
  label: string;
  meta: string;
  onPress: () => void;
  tone?: 'warning' | 'danger';
};

export function NeedsAttentionCard({ emptyLabel, items, loadingLabel, title }: { emptyLabel: string; items: AttentionItemProps[]; loadingLabel?: string; title: string }) {
  return (
    <Card style={styles.attentionCard}>
      <Image accessible={false} resizeMode="contain" source={MATERIALS_ART} style={styles.materialsArtwork} />
      <View style={styles.cardHeading}>
        <AppIcon color={mobileTheme.color.status.warning.foreground} name="alert-outline" size={mobileTheme.icon.md} />
        <AppText style={styles.cardHeadingText} numberOfLines={2} weight={700}>{title}</AppText>
      </View>
      {loadingLabel ? <AppText style={styles.loadingText} weight={500}>{loadingLabel}</AppText> : items.length ? (
        <View>
          {items.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityLabel={item.accessibilityLabel}
              accessibilityRole="button"
              onPress={item.onPress}
              style={({ pressed }) => [styles.attentionItem, index > 0 && styles.attentionItemBorder, pressed && styles.surfacePressed]}
            >
              <View style={[styles.attentionIcon, item.tone === 'danger' ? styles.attentionIconDanger : styles.attentionIconWarning]}>
                <AppIcon color={item.tone === 'danger' ? mobileTheme.color.status.danger.foreground : mobileTheme.color.status.warning.foreground} name={item.icon} size={mobileTheme.icon.md} />
              </View>
              <View style={styles.attentionCopy}>
                <AppText style={styles.attentionLabel} weight={700}>{item.label}</AppText>
                <AppText style={styles.attentionMeta} weight={500}>{item.meta}</AppText>
              </View>
              <AppIcon color={mobileTheme.color.text.secondary} name="chevron-right" size={mobileTheme.icon.md} />
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.clearState}>
          <AppIcon color={mobileTheme.color.status.success.foreground} name="check-circle-outline" size={mobileTheme.icon.lg} />
          <AppText style={styles.clearStateText} weight={600}>{emptyLabel}</AppText>
        </View>
      )}
    </Card>
  );
}

type FinancialMetric = {
  accessibilityLabel: string;
  label: string;
  value: string;
};

export function FinancialSnapshotCard({ loadingLabel, metrics, title }: { loadingLabel?: string; metrics: FinancialMetric[]; title: string }) {
  return (
    <Card style={styles.financeCard}>
      <Image accessible={false} resizeMode="contain" source={FINANCE_ART} style={styles.financeArtwork} />
      <View style={styles.cardHeading}>
        <AppIcon color={mobileTheme.color.brand.primary} name="cash-multiple" size={mobileTheme.icon.md} />
        <AppText style={styles.cardHeadingText} numberOfLines={2} weight={700}>{title}</AppText>
      </View>
      {loadingLabel ? <AppText style={styles.loadingText} weight={500}>{loadingLabel}</AppText> : (
        <View style={styles.financeMetrics}>
          {metrics.map((metric, index) => (
            <View key={metric.label} accessible accessibilityLabel={metric.accessibilityLabel} style={[styles.financeMetric, index > 0 && styles.financeMetricBorder]}>
              <AppText style={styles.financeValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} weight={700}>{metric.value}</AppText>
              <AppText style={styles.financeLabel} weight={500}>{metric.label}</AppText>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

type QuickAction = {
  accessibilityHint?: string;
  icon: AppIconName;
  key: string;
  label: string;
  onPress: () => void;
};

export function DashboardQuickActions({ items, title }: { items: QuickAction[]; title: string }) {
  return (
    <Card style={styles.quickActionsCard}>
      <View style={styles.cardHeading}>
        <AppIcon color={mobileTheme.color.brand.primary} name="lightning-bolt-outline" size={mobileTheme.icon.md} />
        <AppText style={styles.cardHeadingText} numberOfLines={2} weight={700}>{title}</AppText>
      </View>
      <View style={styles.quickActions}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityHint={item.accessibilityHint}
            accessibilityLabel={item.label}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => [styles.quickAction, pressed && styles.surfacePressed]}
          >
            <IconContainer icon={item.icon} size="sm" variant="glass" />
            <AppText style={styles.quickActionLabel} numberOfLines={2} weight={600}>{item.label}</AppText>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

type ProgressStage = { label: string; percentage: number };

export function ProjectProgressCard({ accessibilityLabel, emptyLabel, loadingLabel, onPress, percentage, stages, title }: { accessibilityLabel: string; emptyLabel: string; loadingLabel?: string; onPress: () => void; percentage?: number; stages: ProgressStage[]; title: string }) {
  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.progressPressable, pressed && styles.surfacePressed]}>
      <Card style={styles.progressCard}>
      <Image accessible={false} resizeMode="contain" source={PROGRESS_ART} style={styles.progressArtwork} />
      <View style={styles.cardHeading}>
        <AppIcon color={mobileTheme.color.brand.primary} name="chart-timeline-variant" size={mobileTheme.icon.md} />
        <AppText style={styles.cardHeadingText} numberOfLines={2} weight={700}>{title}</AppText>
      </View>
      {loadingLabel ? <AppText style={styles.progressHelper} weight={500}>{loadingLabel}</AppText> : typeof percentage === 'number' ? (
        <>
          <View style={styles.progressValueRow}>
            <AppText style={styles.progressStatus} weight={700}>{percentage}%</AppText>
            <AppIcon color={mobileTheme.color.text.secondary} name="chevron-right" size={mobileTheme.icon.sm} />
          </View>
          <View style={styles.progressStages}>
            {stages.map((stage) => (
              <View key={stage.label} style={styles.progressStage}>
                <View style={styles.progressStageCopy}>
                  <AppText style={styles.progressStageLabel} numberOfLines={1} weight={500}>{stage.label}</AppText>
                  <AppText style={styles.progressStageValue} weight={600}>{stage.percentage}%</AppText>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, stage.percentage))}%` }]} />
                </View>
              </View>
            ))}
          </View>
        </>
      ) : <AppText style={styles.progressHelper} weight={500}>{emptyLabel}</AppText>}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roleHero: { borderRadius: mobileTheme.radius.xxl, gap: mobileTheme.spacing[2], minHeight: 230, overflow: 'hidden', padding: mobileTheme.spacing[5], ...mobileShadows.floating },
  roleHeroGlow: { backgroundColor: mobileTheme.color.brand.secondary, borderRadius: mobileTheme.radius.full, height: 190, opacity: 0.16, position: 'absolute', right: -70, top: -80, width: 190 },
  roleHeroTop: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  roleHeroIcon: { alignItems: 'center', backgroundColor: mobileTheme.color.border.inverse, borderRadius: mobileTheme.radius.full, height: 44, justifyContent: 'center', width: 44 },
  roleHeroBadge: { ...mobileText.caption, color: mobileTheme.color.text.inverse, flex: 1, letterSpacing: 0.4, opacity: 0.82, textTransform: 'uppercase' },
  roleHeroTitle: { ...mobileText.title, color: mobileTheme.color.text.inverse, fontSize: 26, lineHeight: 32, marginTop: mobileTheme.spacing[2], maxWidth: '86%' },
  roleHeroSubtitle: { ...mobileText.body, color: mobileTheme.color.text.inverse, fontSize: 14, lineHeight: 20, maxWidth: '90%', opacity: 0.76 },
  roleHeroMetrics: { backgroundColor: mobileTheme.color.border.inverse, borderColor: mobileTheme.color.border.inverse, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', marginTop: mobileTheme.spacing[3], overflow: 'hidden' },
  roleHeroMetric: { flex: 1, gap: mobileTheme.spacing[1], minHeight: 70, paddingHorizontal: mobileTheme.spacing[2], paddingVertical: mobileTheme.spacing[3] },
  roleHeroMetricBorder: { borderColor: mobileTheme.color.border.inverse, borderLeftWidth: 1 },
  roleHeroMetricValue: { ...mobileText.sectionTitle, color: mobileTheme.color.text.inverse, fontSize: 19, lineHeight: 24 },
  roleHeroMetricLabel: { ...mobileText.caption, color: mobileTheme.color.text.inverse, fontSize: 10, lineHeight: 14, opacity: 0.72 },
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
  },
  sectionTitle: {
    ...mobileText.sectionTitle,
    fontSize: 21,
    lineHeight: 27,
  },
  summaryStrip: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  summaryItem: { alignItems: 'center', borderRadius: mobileTheme.component.card.radius, flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 92, overflow: 'hidden', padding: mobileTheme.spacing[4], ...mobileShadows.soft },
  summaryItemBrand: { backgroundColor: mobileTheme.color.brand.primary },
  summaryItemWarm: { backgroundColor: mobileTheme.color.background.warm, borderColor: mobileTheme.color.border.subtle, borderWidth: 1 },
  summaryIcon: { alignItems: 'center', backgroundColor: mobileTheme.color.glass.strong, borderRadius: mobileTheme.component.iconContainer.radius, height: 44, justifyContent: 'center', width: 44 },
  summaryIconBrand: { backgroundColor: mobileTheme.color.border.inverse },
  summaryCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  summaryValue: { ...mobileText.sectionTitle, fontSize: 18, lineHeight: 23 },
  summaryLabel: { ...mobileText.caption, color: mobileTheme.color.text.secondary, fontSize: 13, lineHeight: 18 },
  summaryTextBrand: { color: mobileTheme.color.text.inverse },
  summaryLabelBrand: { color: mobileTheme.color.text.inverse, opacity: 0.8 },
  cardHeading: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2], minHeight: 28, zIndex: 1 },
  cardHeadingText: { ...mobileText.sectionTitle, color: mobileTheme.color.text.primary, flex: 1, fontSize: 16, lineHeight: 21 },
  storyCard: { gap: mobileTheme.spacing[3], minHeight: 258, overflow: 'hidden', padding: mobileTheme.spacing[4] },
  workforceArtwork: { height: 132, opacity: 0.28, position: 'absolute', right: -24, top: 36, width: 158 },
  statGrid: { gap: mobileTheme.spacing[2] },
  statRow: { flexDirection: 'row', gap: mobileTheme.spacing[2] },
  statItem: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.component.card.radius,
    borderWidth: 1,
    flex: 1,
    gap: mobileTheme.spacing[1],
    minHeight: 94,
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[2],
  },
  statValue: { ...mobileText.title, fontSize: 25, lineHeight: 30 },
  statLabel: { ...mobileText.caption, color: mobileTheme.color.text.secondary, fontSize: 12, lineHeight: 16 },
  loadingText: { ...mobileText.body, color: mobileTheme.color.text.secondary, minHeight: 72, paddingVertical: mobileTheme.spacing[4] },
  attentionCard: { flex: 1, gap: mobileTheme.spacing[2], minHeight: 250, overflow: 'hidden', padding: mobileTheme.spacing[3] },
  materialsArtwork: { bottom: -30, height: 116, opacity: 0.18, position: 'absolute', right: -32, width: 136 },
  attentionItem: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2], minHeight: 60, paddingVertical: mobileTheme.spacing[2] },
  attentionItemBorder: { borderColor: mobileTheme.color.border.subtle, borderTopWidth: 1 },
  attentionIcon: { alignItems: 'center', borderRadius: mobileTheme.component.iconContainer.radius, height: 36, justifyContent: 'center', width: 36 },
  attentionIconWarning: { backgroundColor: mobileTheme.color.status.warning.background },
  attentionIconDanger: { backgroundColor: mobileTheme.color.status.danger.background },
  attentionCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  attentionLabel: { ...mobileText.caption, color: mobileTheme.color.text.primary, fontSize: 13, lineHeight: 18 },
  attentionMeta: { ...mobileText.caption, color: mobileTheme.color.text.secondary, fontSize: 12, lineHeight: 16 },
  clearState: { alignItems: 'flex-start', gap: mobileTheme.spacing[3], minHeight: 132, paddingTop: mobileTheme.spacing[4] },
  clearStateText: { ...mobileText.body, color: mobileTheme.color.status.success.foreground, fontSize: 14, lineHeight: 20 },
  financeCard: { flex: 1, gap: mobileTheme.spacing[2], minHeight: 230, overflow: 'hidden', padding: mobileTheme.spacing[3] },
  financeArtwork: { bottom: -28, height: 116, opacity: 0.2, position: 'absolute', right: -32, width: 132 },
  financeMetrics: { zIndex: 1 },
  financeMetric: { gap: mobileTheme.spacing[1], minHeight: 68, paddingVertical: mobileTheme.spacing[2] },
  financeMetricBorder: { borderColor: mobileTheme.color.border.subtle, borderTopWidth: 1 },
  financeValue: { ...mobileText.title, color: mobileTheme.color.text.primary, fontSize: 21, lineHeight: 27 },
  financeLabel: { ...mobileText.caption, color: mobileTheme.color.text.secondary, fontSize: 12, lineHeight: 16 },
  quickActionsCard: { flex: 1, gap: mobileTheme.spacing[3], minHeight: 230, padding: mobileTheme.spacing[3] },
  quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  quickAction: { alignItems: 'center', flexBasis: '45%', flexGrow: 1, gap: mobileTheme.spacing[1], justifyContent: 'center', minHeight: 76, paddingVertical: mobileTheme.spacing[1] },
  quickActionLabel: { ...mobileText.caption, color: mobileTheme.color.text.primary, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  progressPressable: { flex: 1 },
  progressCard: { gap: mobileTheme.spacing[2], minHeight: 250, overflow: 'hidden', padding: mobileTheme.spacing[3] },
  progressArtwork: { height: 112, opacity: 0.24, position: 'absolute', right: -28, top: 30, width: 132 },
  progressValueRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', maxWidth: '76%', zIndex: 1 },
  progressStatus: { ...mobileText.title, color: mobileTheme.color.brand.primary, fontSize: 30, lineHeight: 35 },
  progressStages: { gap: mobileTheme.spacing[2], marginTop: 'auto', zIndex: 1 },
  progressStage: { gap: mobileTheme.spacing[1] },
  progressStageCopy: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2], justifyContent: 'space-between' },
  progressStageLabel: { ...mobileText.caption, color: mobileTheme.color.text.primary, flex: 1, fontSize: 10, lineHeight: 14 },
  progressStageValue: { ...mobileText.caption, color: mobileTheme.color.text.secondary, fontSize: 10, lineHeight: 14 },
  progressTrack: { backgroundColor: mobileTheme.color.status.neutral.background, borderRadius: mobileTheme.radius.full, height: 5, overflow: 'hidden' },
  progressFill: { backgroundColor: mobileTheme.color.brand.primary, borderRadius: mobileTheme.radius.full, height: '100%' },
  progressHelper: { ...mobileText.caption, color: mobileTheme.color.text.secondary, fontSize: 12, lineHeight: 17, marginTop: mobileTheme.spacing[3], maxWidth: '76%', zIndex: 1 },
  surfacePressed: {
    opacity: 0.78,
  },
});
