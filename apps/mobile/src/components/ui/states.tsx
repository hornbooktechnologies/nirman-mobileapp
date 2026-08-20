import { ActivityIndicator, StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileText, mobileTheme } from '../../theme';
import { Button } from './button';
import { Card } from './card';
import { AppText } from './app-text';

type EmptyStateProps = ViewProps & {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction, style, ...props }: EmptyStateProps) {
  return (
    <Card style={[styles.state, style]} {...props}>
      <AppText style={styles.title} weight={700}>{title}</AppText>
      {description ? <AppText style={styles.description} weight={500}>{description}</AppText> : null}
      {actionLabel && onAction ? <Button label={actionLabel} fullWidth={false} onPress={onAction} /> : null}
    </Card>
  );
}

export function LoadingState({ label, style, ...props }: ViewProps & { label?: string }) {
  const { t } = useTranslation('common');

  return (
    <View style={[styles.loading, style]} {...props}>
      <ActivityIndicator color={mobileTheme.color.action.primary} />
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
