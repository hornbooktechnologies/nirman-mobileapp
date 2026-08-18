import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { StatusBadge, type BadgeTone } from './badge';
import { Card } from './card';

type EntityCardProps = ViewProps & {
  title: string;
  subtitle?: string;
  meta?: string;
  status?: string;
  tone?: BadgeTone;
};

function EntityCard({ title, subtitle, meta, status, tone = 'neutral', style, ...props }: EntityCardProps) {
  return (
    <Card style={[styles.card, style]} {...props}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {status ? <StatusBadge label={status} tone={tone} /> : null}
      </View>
      {meta ? <Text style={styles.meta}>{meta}</Text> : null}
    </Card>
  );
}

export function WorkerCard(props: EntityCardProps) {
  return <EntityCard {...props} />;
}

export function ProjectCard(props: EntityCardProps) {
  return <EntityCard tone="info" {...props} />;
}

export function ApprovalCard(props: EntityCardProps) {
  return <EntityCard tone="warning" {...props} />;
}

const styles = StyleSheet.create({
  card: {
    gap: mobileTheme.spacing[4],
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    justifyContent: 'space-between',
  },
  titleWrap: {
    flex: 1,
    gap: mobileTheme.spacing[1],
  },
  title: {
    ...mobileText.sectionTitle,
  },
  subtitle: {
    ...mobileText.body,
  },
  meta: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    fontWeight: '700',
  },
});
