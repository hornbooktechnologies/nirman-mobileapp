import { useEffect, useRef, useState } from 'react';
import { createSearchDebouncer, SEARCH_DEBOUNCE_MS } from '@nirman-app/shared';

// Immediate input text is independent of the applied API/filter value.
export function useSearchDraft(value: string, onChange: (value: string) => void, delay = SEARCH_DEBOUNCE_MS, disabled = false) {
  const [state, setState] = useState({ external: value, draft: value, applied: value });
  const callback = useRef(onChange);
  const applied = useRef(value);
  const composing = useRef(false);
  const debouncer = useRef<ReturnType<typeof createSearchDebouncer> | null>(null);
  if (state.external !== value) setState({ external: value, draft: value === state.applied ? state.draft : value, applied: value });
  useEffect(() => { callback.current = onChange; });
  useEffect(() => {
    const instance = createSearchDebouncer(next => {
      if (applied.current !== next) {
        applied.current = next;
        setState(current => ({ ...current, applied: next }));
        callback.current(next);
      }
    }, delay);
    debouncer.current = instance;
    return () => { instance.cancel(); debouncer.current = null; };
  }, [delay]);
  useEffect(() => {
    if (disabled) composing.current = false;
    if (disabled || applied.current !== value) debouncer.current?.cancel();
    applied.current = value;
  }, [value, disabled]);
  return {
    text: state.external === value ? state.draft : value,
    edit(next: string) {
      setState(current => ({ ...current, external: value, draft: next }));
      if (!disabled && !composing.current) debouncer.current?.schedule(next);
    },
    flush() { debouncer.current?.flush(); },
    compositionStart() { composing.current = true; debouncer.current?.cancel(); },
    compositionEnd(next: string) { composing.current = false; if (!disabled) debouncer.current?.schedule(next); },
  };
}
