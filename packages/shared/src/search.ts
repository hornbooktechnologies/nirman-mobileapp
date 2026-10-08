export const SEARCH_DEBOUNCE_MS = 300;

/** Trailing search only: clearing and explicit submission apply immediately. */
export function createSearchDebouncer(commit: (value: string) => void, delay = SEARCH_DEBOUNCE_MS) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: string | undefined;
  function cancel() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pending = undefined;
  }
  function flush() {
    const value = pending;
    cancel();
    if (value !== undefined) commit(value);
  }
  return {
    cancel,
    flush,
    schedule(value: string) {
      cancel();
      pending = value.trim();
      if (!pending || delay <= 0) flush();
      else timer = setTimeout(flush, delay);
    },
  };
}
