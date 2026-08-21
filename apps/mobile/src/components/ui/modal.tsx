import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ModalProps,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import { Button } from './button';
import { AppText } from './app-text';

type BottomSheetProps = ModalProps & {
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  scroll?: boolean;
  showCloseButton?: boolean;
};

export function BottomSheet({
  title,
  description,
  children,
  footer,
  onClose,
  scroll = false,
  showCloseButton = true,
  transparent = true,
  animationType = 'slide',
  ...props
}: BottomSheetProps) {
  const { t } = useTranslation('common');
  const content = <View style={styles.content}>{children}</View>;

  return (
    <NativeModal transparent={transparent} animationType={animationType} onRequestClose={onClose} {...props}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={t('actions.close')} style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.heading}>
            <AppText style={styles.title} weight={700}>{title}</AppText>
            {description ? <AppText style={styles.description}>{description}</AppText> : null}
          </View>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
            >
              {content}
            </ScrollView>
          ) : content}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
          {showCloseButton && !footer ? <Button label={t('actions.close')} variant="secondary" onPress={onClose} /> : null}
        </View>
      </KeyboardAvoidingView>
    </NativeModal>
  );
}

export const AppModal = BottomSheet;

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    backgroundColor: mobileTheme.color.surface.scrim,
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: mobileTheme.color.surface.app,
    borderTopLeftRadius: mobileTheme.radius.xxl,
    borderTopRightRadius: mobileTheme.radius.xxl,
    gap: mobileTheme.spacing[3],
    maxHeight: '92%',
    padding: mobileTheme.spacing[5],
    ...mobileShadows.floating,
  },
  handle: {
    alignSelf: 'center',
    backgroundColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.full,
    height: 4,
    width: 44,
  },
  title: {
    ...mobileText.sectionTitle,
  },
  heading: {
    gap: mobileTheme.spacing[1],
  },
  description: {
    ...mobileText.body,
  },
  content: {
    gap: mobileTheme.spacing[3],
  },
  scrollContent: {
    paddingBottom: mobileTheme.spacing[2],
  },
  scrollView: {
    flexShrink: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
});
