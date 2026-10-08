import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileText, mobileTheme } from '../../theme';
import { Button } from './button';
import { RefreshButton } from './refresh-button';
import { Card } from './card';
import { AppText } from './app-text';
import { LottieLoader } from './lottie-loader';

type EmptyStateProps = ViewProps & {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  onRefresh?: () => unknown;
};

export function EmptyState({ title, description, actionLabel, onAction, onRefresh, style, ...props }: EmptyStateProps) {
  return (
    <Card style={[styles.state, style]} {...props}>
      <AppText style={styles.title} weight={700}>{title}</AppText>
      {description ? <AppText style={styles.description} weight={500}>{description}</AppText> : null}
      {actionLabel && onRefresh ? <RefreshButton label={actionLabel} fullWidth={false} onRefresh={onRefresh} /> : actionLabel && onAction ? <Button label={actionLabel} fullWidth={false} onPress={onAction} /> : null}
    </Card>
  );
}

export function LoadingState({ label, loaderSize, style, ...props }: ViewProps & { label?: string; loaderSize?: number }) {
  const { t } = useTranslation('common');

  return (
    <View accessibilityLiveRegion="polite" accessibilityState={{ busy: true }} style={[styles.loading, style]} {...props}>
      <LottieLoader size={loaderSize} />
      <AppText style={styles.description} weight={500}>{label ?? t('loading.default')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    gap: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[8],
  },
  title: {
    ...mobileText.sectionTitle,
    textAlign: 'center',
  },
  description: {
    ...mobileText.body,
    textAlign: 'center',
  },
  loading: {
    alignItems: 'center',
    gap: mobileTheme.spacing[3],
    justifyContent: 'center',
    minHeight: 140,
  },
});
