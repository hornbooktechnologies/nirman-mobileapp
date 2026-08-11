import { ActivityIndicator, StyleSheet, Text, View, type ViewProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { Button } from './button';
import { Card } from './card';

type EmptyStateProps = ViewProps & {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction, style, ...props }: EmptyStateProps) {
  return (
    <Card style={[styles.state, style]} {...props}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? <Button label={actionLabel} fullWidth={false} onPress={onAction} /> : null}
    </Card>
  );
}

export function LoadingState({ label = 'Loading', style, ...props }: ViewProps & { label?: string }) {
  return (
    <View style={[styles.loading, style]} {...props}>
      <ActivityIndicator color={mobileTheme.color.action.primary} />
      <Text style={styles.description}>{label}</Text>
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
