"use client";

import { Check, ChevronDown } from "lucide-react";
import { createSearchDebouncer, SEARCH_DEBOUNCE_MS } from "@nirman-app/shared";
import { useEffect, useId, useRef, useState } from "react";

import { Input } from "./input";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export function SearchableSelect({
  id,
  name,
  value,
  options,
  onValueChange,
  disabled = false,
  invalid = false,
  loading = false,
  placeholder = "Select an option",
  emptyMessage = "No matching options.",
  listLabel,
}: {
  id: string;
  name: string;
  value: string;
  options: SearchableSelectOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  loading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  listLabel: string;
}) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncer = useRef<ReturnType<typeof createSearchDebouncer> | null>(null);
  const selected = options.find((option) => option.value === value);
  const visibleOptions = query
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    : options;

  useEffect(() => {
    const instance = createSearchDebouncer(setQuery, SEARCH_DEBOUNCE_MS);
    debouncer.current = instance;
    return () => instance.cancel();
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function openList() {
    if (disabled) return;
    debouncer.current?.cancel();
    setQuery("");
    setText(selected?.label ?? "");
    setOpen(true);
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
  }

  function choose(option: SearchableSelectOption) {
    debouncer.current?.cancel();
    setText(option.label);
    setQuery("");
    onValueChange(option.value);
    setOpen(false);
    input.current?.focus();
  }

  return (
    <div ref={root} className="relative">
      <div className="relative">
        <Input
          ref={input}
          id={id}
          name={name}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && visibleOptions[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          className="pr-9"
          disabled={disabled}
          invalid={invalid}
          placeholder={placeholder}
          value={open ? text : selected?.label ?? ""}
          onClick={(event) => { openList(); event.currentTarget.select(); }}
          onFocus={openList}
          onBlur={(event) => {
            if (!root.current?.contains(event.relatedTarget)) setOpen(false);
          }}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            setOpen(true);
            setActiveIndex(0);
            debouncer.current?.schedule(next.trim());
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) openList();
              else setActiveIndex((current) => Math.min(current + 1, Math.max(0, visibleOptions.length - 1)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(0, current - 1));
            } else if (event.key === "Enter" && open && visibleOptions[activeIndex]) {
              event.preventDefault();
              choose(visibleOptions[activeIndex]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        />
        <ChevronDown aria-hidden="true" size={15} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sub transition-transform ${open ? "rotate-180" : ""}`} />
      </div>
      {open ? (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-inner border border-hairline bg-surface shadow-floating">
          <div id={listboxId} role="listbox" aria-label={listLabel} className="max-h-64 overflow-y-auto p-1">
            {loading ? <p className="px-3 py-3 text-sm text-sub" role="status">Loading…</p> : visibleOptions.length ? visibleOptions.map((option, index) => (
              <button key={option.value || "empty"} id={`${listboxId}-${index}`} type="button" role="option" aria-selected={option.value === value} className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? "bg-sunken" : "hover:bg-sunken/70"}`} onPointerMove={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)}>
                <span className="min-w-0 truncate">{option.label}</span>
                {option.value === value ? <Check aria-hidden="true" size={16} className="shrink-0 text-lime" /> : null}
              </button>
            )) : <p className="px-3 py-3 text-sm text-sub">{emptyMessage}</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
