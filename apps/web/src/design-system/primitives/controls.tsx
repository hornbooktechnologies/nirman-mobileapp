"use client";

import {
  type CSSProperties,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import styles from "./controls.module.css";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "destructive";

export type ButtonSize = "default" | "compact";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  loadingLabel?: string;
}

export function Button({
  children,
  className,
  variant = "secondary",
  size = "default",
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  loading = false,
  loadingLabel = "Loading…",
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        styles.button,
        styles[`button_${variant}`],
        styles[`button_${size}`],
        className,
      )}
    >
      <span
        className={cx(
          styles.buttonContent,
          loading && styles.buttonContentLoading,
        )}
      >
        {LeadingIcon ? <LeadingIcon aria-hidden="true" size={16} /> : null}
        <span>{children}</span>
        {TrailingIcon ? <TrailingIcon aria-hidden="true" size={16} /> : null}
      </span>
      {loading ? (
        <span className={styles.buttonLoadingContent}>
          <LoaderCircle aria-hidden="true" size={16} className={styles.buttonSpinner} />
          <span>{loadingLabel}</span>
        </span>
      ) : null}
    </button>
  );
}

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  label: string;
  size?: ButtonSize;
  tone?: "default" | "danger";
}

export function IconButton({
  icon: Icon,
  label,
  className,
  size = "default",
  tone = "default",
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <span className={styles.tooltipAnchor}>
      <button
        {...props}
        type={type}
        className={cx(
          styles.iconButton,
          styles[`iconButton_${size}`],
          tone === "danger" && styles.iconButton_danger,
          className,
        )}
        aria-label={label}
      >
        <Icon aria-hidden="true" size={17} />
      </button>
      <span role="tooltip" className={styles.tooltip}>
        {label}
      </span>
    </span>
  );
}

interface SearchFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange"
  > {
  value: string;
  onChange: (value: string) => void;
  label: string;
  compact?: boolean;
}

export function SearchField({
  value,
  onChange,
  label,
  className,
  compact = false,
  id,
  ...props
}: SearchFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const labelId = `${inputId}-label`;

  return (
    <div className={cx(styles.searchField, compact && styles.controlCompact, className)}>
      <label id={labelId} htmlFor={inputId} className={styles.visuallyHidden}>
        {label}
      </label>
      <Search aria-hidden="true" size={17} className={styles.searchIcon} />
      <input
        {...props}
        id={inputId}
        type="search"
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        aria-labelledby={labelId}
        className={styles.searchInput}
      />
      {value ? (
        <button
          type="button"
          className={styles.searchClear}
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X aria-hidden="true" size={15} />
        </button>
      ) : null}
    </div>
  );
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectFieldProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  label?: string;
  ariaLabel?: string;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
  triggerIcon?: LucideIcon;
}

export function SelectField({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  compact = false,
  disabled = false,
  className,
  triggerIcon: TriggerIcon,
}: SelectFieldProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  const setSelectRootRef = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    setPortalRoot(
      node?.closest<HTMLElement>("dialog") ??
        node?.closest<HTMLElement>("[data-design-preview-root]") ??
        null,
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const updatePopoverPosition = useCallback(() => {
    const trigger = buttonRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const measuredHeight = popoverRef.current?.getBoundingClientRect().height;
    const estimatedOptionHeight = window.innerWidth <= 768 ? 44 : 36;
    const popoverHeight =
      measuredHeight && measuredHeight > 0
        ? measuredHeight
        : Math.min(options.length * estimatedOptionHeight + 10, 258);
    const width = Math.min(
      Math.max(triggerRect.width, 180),
      window.innerWidth - 16,
    );
    const spaceBelow = window.innerHeight - triggerRect.bottom - 8;
    const spaceAbove = triggerRect.top - 8;
    const openAbove = spaceBelow < popoverHeight && spaceAbove > spaceBelow;
    const top = openAbove
      ? Math.max(8, triggerRect.top - popoverHeight - 6)
      : Math.min(
          window.innerHeight - popoverHeight - 8,
          triggerRect.bottom + 6,
        );
    const left = Math.min(
      Math.max(8, triggerRect.left),
      window.innerWidth - width - 8,
    );

    setPopoverStyle({ top, left, width });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);
    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const enabledIndexes = useMemo(
    () =>
      options
        .map((option, index) => (option.disabled ? -1 : index))
        .filter((index) => index >= 0),
    [options],
  );

  function openList(preferredIndex = selectedIndex) {
    if (disabled) return;
    const nextIndex = options[preferredIndex]?.disabled
      ? (enabledIndexes[0] ?? 0)
      : preferredIndex;
    setActiveIndex(nextIndex);
    setOpen(true);
  }

  function moveActive(delta: number) {
    if (!enabledIndexes.length) return;
    const current = enabledIndexes.indexOf(activeIndex);
    const next = (current + delta + enabledIndexes.length) % enabledIndexes.length;
    setActiveIndex(enabledIndexes[next]);
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openList(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openList(enabledIndexes.at(-1) ?? selectedIndex);
    }
  }

  function onListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActive(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActive(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(enabledIndexes[0] ?? 0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(enabledIndexes.at(-1) ?? 0);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(activeIndex);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key.length === 1) {
      const match = options.findIndex(
        (option) =>
          !option.disabled &&
          option.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()),
      );
      if (match >= 0) setActiveIndex(match);
    }
  }

  const labelId = label ? `${id}-label` : undefined;
  const listboxId = `${id}-listbox`;
  return (
    <div
      ref={setSelectRootRef}
      className={cx(styles.selectRoot, compact && styles.controlCompact, className)}
    >
      {label ? (
        <span id={labelId} className={styles.fieldLabel}>
          {label}
        </span>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        className={styles.selectTrigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-labelledby={label ? `${labelId} ${id}-value` : undefined}
        aria-label={label ? undefined : ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
      >
        {TriggerIcon ? (
          <TriggerIcon aria-hidden="true" size={16} className={styles.triggerIcon} />
        ) : null}
        <span id={`${id}-value`} className={styles.selectValue}>
          {selectedOption?.label}
        </span>
        <ChevronDown
          aria-hidden="true"
          size={16}
          className={cx(styles.chevron, open && styles.chevronOpen)}
        />
      </button>
      {open && portalRoot
        ? createPortal(
            <div
              ref={popoverRef}
              className={styles.selectPopover}
              style={popoverStyle}
            >
              <div
                ref={listRef}
                id={listboxId}
                role="listbox"
                tabIndex={-1}
                className={styles.listbox}
                aria-label={ariaLabel ?? label}
                aria-activedescendant={`${id}-option-${activeIndex}`}
                onKeyDown={onListKeyDown}
              >
                {options.map((option, index) => (
                  <div
                    key={option.value}
                    id={`${id}-option-${index}`}
                    role="option"
                    aria-selected={option.value === value}
                    aria-disabled={option.disabled || undefined}
                    className={cx(
                      styles.option,
                      index === activeIndex && styles.optionActive,
                      option.value === value && styles.optionSelected,
                      option.disabled && styles.optionDisabled,
                    )}
                    onPointerMove={() =>
                      !option.disabled && setActiveIndex(index)
                    }
                    onClick={() => choose(index)}
                  >
                    <span>{option.label}</span>
                    {option.value === value ? (
                      <Check aria-hidden="true" size={15} />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>,
            portalRoot,
          )
        : null}
    </div>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  indeterminate?: boolean;
  disabled?: boolean;
  showLabel?: boolean;
}

export function Checkbox({
  checked,
  onChange,
  label,
  indeterminate = false,
  disabled = false,
  showLabel = false,
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label
      className={cx(
        styles.checkboxLabel,
        showLabel && styles.checkboxLabelVisible,
      )}
    >
      <input
        ref={inputRef}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
        className={styles.checkboxInput}
      />
      <span className={styles.checkboxBox} aria-hidden="true">
        {indeterminate ? (
          <span className={styles.indeterminateMark} />
        ) : checked ? (
          <Check size={13} strokeWidth={3} />
        ) : null}
      </span>
      <span className={showLabel ? styles.checkboxText : styles.visuallyHidden}>
        {label}
      </span>
    </label>
  );
}

interface TextFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "children"
  > {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText?: string;
  error?: string;
}

export function TextField({
  label,
  value,
  onChange,
  helpText,
  error,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  ...props
}: TextFieldProps) {
  const inputId = useId();
  const helpId = helpText ? `${inputId}-help` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const descriptionIds = [ariaDescribedBy, helpId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <label className={cx(styles.textFieldRoot, className)} htmlFor={inputId}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.textInputWrap} data-error={Boolean(error) || undefined}>
        <input
          {...props}
          id={inputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-describedby={descriptionIds}
          aria-invalid={error ? true : ariaInvalid}
          className={styles.textInput}
        />
        {error ? (
          <CircleAlert aria-hidden="true" size={16} className={styles.errorIcon} />
        ) : null}
      </span>
      {helpText ? (
        <span id={helpId} className={styles.helpText}>
          {helpText}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className={styles.errorText} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: StatusTone;
}) {
  return (
    <span className={cx(styles.statusBadge, styles[`status_${tone}`])}>
      <span className={styles.statusDot} aria-hidden="true" />
      {children}
    </span>
  );
}

export function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <span className={styles.filterChip}>
      <span className={styles.filterChipLabel}>{label}:</span>
      <span>{value}</span>
      <button type="button" onClick={onRemove} aria-label={`Remove ${label} filter`}>
        <X aria-hidden="true" size={13} />
      </button>
    </span>
  );
}

export function Skeleton({ width = "100%" }: { width?: string }) {
  return <span className={styles.skeleton} style={{ width }} aria-hidden="true" />;
}
