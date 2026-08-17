import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal as NativeModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ModalProps,
} from 'react-native';

import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import { Button } from './button';

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
  const content = <View style={styles.content}>{children}</View>;

  return (
    <NativeModal transparent={transparent} animationType={animationType} onRequestClose={onClose} {...props}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <Pressable accessibilityRole="button" accessibilityLabel="Close dialog" style={styles.scrim} onPress={onClose}>
          <Pressable accessibilityRole="none" style={styles.sheet} onPress={() => undefined}>
            <View style={styles.handle} />
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              {description ? <Text style={styles.description}>{description}</Text> : null}
            </View>
            {scroll ? (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {content}
              </ScrollView>
            ) : content}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
            {showCloseButton && !footer ? <Button label="Close" variant="secondary" onPress={onClose} /> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </NativeModal>
  );
}

export const AppModal = BottomSheet;

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrim: {
    backgroundColor: mobileTheme.color.surface.scrim,
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: mobileTheme.color.surface.card,
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
  footer: {
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
});
