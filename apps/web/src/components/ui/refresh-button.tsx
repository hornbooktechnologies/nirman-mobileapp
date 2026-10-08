"use client";
import { Button, type ButtonProps } from "./button";
import { useRefresh } from "@/lib/use-refresh";

type Props = Omit<ButtonProps, "onClick"> & { onRefresh: () => unknown; busy?: boolean };
export function RefreshButton({ onRefresh, busy = false, disabled, ...props }: Props) {
  const refresh = useRefresh();
  const loading = busy || refresh.busy;
  return <Button {...props} disabled={disabled || loading} aria-busy={loading}
    onClick={() => { if (!disabled && !loading) void refresh.run(onRefresh).catch(() => undefined); }} />;
}
