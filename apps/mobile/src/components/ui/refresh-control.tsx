import { FlatList, RefreshControl, type FlatListProps, type RefreshControlProps } from 'react-native';
import { useRefresh } from '../../lib/use-refresh';

type Action = { onRefresh: () => unknown; busy?: boolean };
export function GuardedRefreshControl({ onRefresh, refreshing, busy = false, enabled = true, ...props }: Omit<RefreshControlProps, 'onRefresh'> & Action) {
  const refresh = useRefresh();
  const pending = refreshing || refresh.busy;
  const blocked = busy || pending;
  return <RefreshControl {...props} refreshing={pending} enabled={enabled && !blocked}
    onRefresh={() => { if (enabled && !blocked) void refresh.run(onRefresh).catch(() => undefined); }} />;
}
export function RefreshFlatList<T>({ onRefresh, refreshing, busy = false, ...props }: Omit<FlatListProps<T>, 'onRefresh'> & Action) {
  const refresh = useRefresh();
  const pending = Boolean(refreshing || refresh.busy);
  const blocked = busy || pending;
  return <FlatList<T> {...props} refreshing={pending}
    onRefresh={() => { if (!blocked) void refresh.run(onRefresh).catch(() => undefined); }} />;
}
