"use client";

import { Check, ChevronDown } from "lucide-react";
import { createSearchDebouncer, SEARCH_DEBOUNCE_MS } from "@nirman-app/shared";
import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui";

type SearchableOption = { value: string; label: string };

export function SalesSearchableSelect({
  id,
  name,
  value,
  options,
  searchValue,
  onSearchChange,
  onValueChange,
  disabled = false,
  invalid = false,
  loading = false,
  placeholder = "Search by customer name or mobile",
}: {
  id: string;
  name: string;
  value: string;
  options: SearchableOption[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  loading?: boolean;
  placeholder?: string;
}) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const debouncer = useRef<ReturnType<typeof createSearchDebouncer> | null>(null);
  const selected = options.find((option) => option.value === value);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(selected?.label ?? "");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const instance = createSearchDebouncer(onSearchChange, SEARCH_DEBOUNCE_MS);
    debouncer.current = instance;
    return () => {
      instance.cancel();
      debouncer.current = null;
    };
  }, [onSearchChange]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  function choose(option: SearchableOption) {
    debouncer.current?.cancel();
    setText(option.label);
    onValueChange(option.value);
    setOpen(false);
    input.current?.focus();
  }

  function openList() {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    if (searchValue) onSearchChange("");
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
          aria-activedescendant={open && options[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          className="pr-9"
          disabled={disabled}
          invalid={invalid}
          placeholder={placeholder}
          value={text}
          onClick={(event) => {
            openList();
            event.currentTarget.select();
          }}
          onFocus={openList}
          onChange={(event) => {
            const next = event.target.value;
            setText(next);
            setOpen(true);
            setActiveIndex(0);
            if (value) onValueChange("");
            debouncer.current?.schedule(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              if (!open) openList();
              else setActiveIndex((current) => Math.min(current + 1, Math.max(0, options.length - 1)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(0, current - 1));
            } else if (event.key === "Enter" && open && options[activeIndex]) {
              event.preventDefault();
              choose(options[activeIndex]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setOpen(false);
            }
          }}
        />
        <ChevronDown aria-hidden="true" size={15} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sub transition-transform ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-inner border border-hairline bg-surface shadow-floating">
          <div id={listboxId} role="listbox" aria-label="Customer leads" className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <p className="px-3 py-3 text-sm text-sub" role="status">Searching leads…</p>
            ) : options.length ? (
              options.map((option, index) => (
                <button
                  key={option.value}
                  id={`${listboxId}-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left text-sm transition-colors ${index === activeIndex ? "bg-sunken" : "hover:bg-sunken/70"}`}
                  onPointerMove={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.value === value && <Check aria-hidden="true" size={16} className="shrink-0 text-lime" />}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-sm text-sub">No matching customer leads.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
