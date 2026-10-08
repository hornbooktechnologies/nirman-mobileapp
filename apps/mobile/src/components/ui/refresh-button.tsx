import { Button, type ButtonProps } from './button';
import { IconButton, type IconButtonProps } from './icon-button';
import { useRefresh } from '../../lib/use-refresh';

type Action = { onRefresh: () => unknown; busy?: boolean };
export function RefreshButton({ onRefresh, busy = false, disabled, loading, ...props }: Omit<ButtonProps, 'onPress'> & Action) {
  const refresh = useRefresh();
  const pending = busy || refresh.busy || loading;
  return <Button {...props} loading={pending} disabled={disabled || pending}
    onPress={() => { if (!disabled && !pending) void refresh.run(onRefresh).catch(() => undefined); }} />;
}
export function RefreshIconButton({ onRefresh, busy = false, disabled, accessibilityState, style, ...props }: Omit<IconButtonProps, 'onPress'> & Action) {
  const refresh = useRefresh();
  const pending = busy || refresh.busy;
  return <IconButton {...props} disabled={disabled || pending}
    accessibilityState={{ ...accessibilityState, disabled: Boolean(disabled || pending), busy: pending }}
    style={state => [{ opacity: disabled || pending ? 0.45 : 1 }, typeof style === 'function' ? style(state) : style]}
    onPress={() => { if (!disabled && !pending) void refresh.run(onRefresh).catch(() => undefined); }} />;
}
