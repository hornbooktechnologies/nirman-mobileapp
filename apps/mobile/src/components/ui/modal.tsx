import { Modal as NativeModal, Pressable, StyleSheet, Text, View, type ModalProps } from 'react-native';

import { mobileShadows, mobileText, mobileTheme } from '../../theme';
import { Button } from './button';

type BottomSheetProps = ModalProps & {
  title: string;
  description?: string;
  onClose: () => void;
};

export function BottomSheet({ title, description, children, onClose, transparent = true, animationType = 'slide', ...props }: BottomSheetProps) {
  return (
    <NativeModal transparent={transparent} animationType={animationType} {...props}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={styles.content}>{children}</View>
          <Button label="Close" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </NativeModal>
  );
}

export const AppModal = BottomSheet;

const styles = StyleSheet.create({
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
  description: {
    ...mobileText.body,
  },
  content: {
    gap: mobileTheme.spacing[3],
  },
});
