import type { ReactElement } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { mobileText, mobileTheme } from '../../theme';
import { Badge } from './badge';
import { EmptyState } from './states';
import { IconButton } from './icon-button';
import { SearchField } from './search-field';

type CollectionPickerModalProps<TItem> = {
  visible: boolean;
  title: string;
  subtitle?: string;
  searchValue: string;
  searchPlaceholder: string;
  accessibilityLabel: string;
  data: readonly TItem[];
  keyExtractor: (item: TItem) => string;
  renderItem: (info: ListRenderItemInfo<TItem>) => ReactElement | null;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  emptyTitle: string;
  emptyDescription: string;
};

export function CollectionPickerModal<TItem>({
  visible,
  title,
  subtitle,
  searchValue,
  searchPlaceholder,
  accessibilityLabel,
  data,
  keyExtractor,
  renderItem,
  onSearchChange,
  onClose,
  emptyTitle,
  emptyDescription,
}: CollectionPickerModalProps<TItem>) {
  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <IconButton accessibilityLabel="Back" icon="arrow-left" variant="glass" onPress={onClose} />
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text numberOfLines={1} style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <Badge label={`${data.length}`} tone="info" />
        </View>
        <SearchField
          accessibilityLabel={accessibilityLabel}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChangeText={onSearchChange}
        />
        <FlatList
          contentContainerStyle={[styles.list, !data.length && styles.emptyList]}
          data={data as TItem[]}
          initialNumToRender={12}
          keyboardShouldPersistTaps="handled"
          keyExtractor={keyExtractor}
          ListEmptyComponent={<EmptyState title={emptyTitle} description={emptyDescription} />}
          maxToRenderPerBatch={12}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: mobileTheme.color.background.app,
    flex: 1,
    gap: mobileTheme.spacing[4],
    paddingHorizontal: mobileTheme.spacing[5],
    paddingTop: mobileTheme.spacing[3],
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
  },
  headerCopy: {
    flex: 1,
    gap: mobileTheme.spacing[1],
    minWidth: 0,
  },
  title: {
    ...mobileText.sectionTitle,
    fontSize: 22,
    lineHeight: 28,
  },
  subtitle: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  list: {
    gap: mobileTheme.spacing[3],
    paddingBottom: mobileTheme.spacing[8],
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
