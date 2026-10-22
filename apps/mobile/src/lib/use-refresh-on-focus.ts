import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

type RefreshOnFocusOptions = {
  /** Stable data scope. Content resets only when this value changes. */
  scopeKey: string;
  refresh: () => void | Promise<unknown>;
  reset?: () => void;
  cancel?: () => void;
};

/**
 * Refreshes server-authoritative screen data whenever a route becomes active.
 * Existing content remains visible when returning to the same scope, avoiding
 * blank/loading flashes. Scope changes reset stale content before the fetch.
 */
export function useRefreshOnFocus({
  scopeKey,
  refresh,
  reset,
  cancel,
}: RefreshOnFocusOptions) {
  const previousScope = useRef<string | undefined>(undefined);
  const resetRef = useRef(reset);
  const cancelRef = useRef(cancel);
  resetRef.current = reset;
  cancelRef.current = cancel;

  useFocusEffect(
    useCallback(() => {
      let active = true;

      if (previousScope.current !== scopeKey) {
        previousScope.current = scopeKey;
        resetRef.current?.();
      }

      void Promise.resolve()
        .then(() => (active ? refresh() : undefined))
        .catch(() => undefined);

      return () => {
        active = false;
        cancelRef.current?.();
      };
    }, [refresh, scopeKey]),
  );
}
