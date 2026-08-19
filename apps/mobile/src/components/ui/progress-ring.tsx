import Svg, { Circle } from 'react-native-svg';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileText, mobileTheme } from '../../theme';
import { AppText } from './app-text';

type ProgressRingProps = ViewProps & {
  value: number;
  size?: number;
};

export function ProgressRing({ value, size = 168, style, ...props }: ProgressRingProps) {
  const { t } = useTranslation('common');
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <View style={[styles.wrap, { height: size, width: size }, style]} {...props}>
      <Svg height={size} width={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={mobileTheme.color.brand.primarySoft}
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="transparent"
          r={radius}
          stroke={mobileTheme.color.action.primary}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth={stroke}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <AppText style={styles.value} weight={700}>{value}%</AppText>
        <AppText style={styles.label}>{t('progress.done')}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    gap: mobileTheme.spacing[1],
    position: 'absolute',
  },
  value: {
    ...mobileText.numericHero,
    fontSize: 42,
    lineHeight: 46,
  },
  label: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
});
