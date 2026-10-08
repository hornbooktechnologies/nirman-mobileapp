"use client";
import { forwardRef, type KeyboardEvent } from 'react';
import { useSearchDraft } from '@/lib/use-search-draft';
import { Input, type InputProps } from './input';

export interface SearchInputProps extends Omit<InputProps, 'value' | 'onChange' | 'type'> {
  value: string;
  onValueChange: (value: string) => void;
  debounceMs?: number;
}
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onValueChange, debounceMs, disabled, onKeyDown, onCompositionStart, onCompositionEnd, ...props }, ref) => {
    const search = useSearchDraft(value, onValueChange, debounceMs, disabled);
    return <Input maxLength={160} {...props} ref={ref} type="search" disabled={disabled} value={search.text}
      onChange={event => search.edit(event.target.value)}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) search.flush(); onKeyDown?.(event); }}
      onCompositionStart={event => { search.compositionStart(); onCompositionStart?.(event); }}
      onCompositionEnd={event => { search.compositionEnd(event.currentTarget.value); onCompositionEnd?.(event); }} />;
  },
);
SearchInput.displayName = 'SearchInput';
