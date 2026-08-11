"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  MoreHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button, IconButton } from "@/design-system/primitives/controls";
import styles from "./overlays.module.css";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  checked?: boolean;
  selectionRole?: "checkbox" | "radio";
}

interface ActionMenuProps {
  label: string;
  items: ActionMenuItem[];
  align?: "start" | "end";
  triggerIcon?: LucideIcon;
  compact?: boolean;
  placement?: "top" | "bottom";
}

export function ActionMenu({
  label,
  items,
  align = "end",
  triggerIcon = MoreHorizontal,
  compact = true,
  placement = "bottom",
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuId = useId();
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const itemCount = items.length;
  const separatorCount = items.filter((item) => item.separatorBefore).length;

  const setMenuRootRef = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
    setPortalRoot(
      node?.closest<HTMLElement>("dialog") ??
        node?.closest<HTMLElement>("[data-design-preview-root]") ??
        null,
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLButtonElement>(
      'button[role="menuitem"]:not(:disabled), button[role="menuitemcheckbox"]:not(:disabled), button[role="menuitemradio"]:not(:disabled)',
    );
    first?.focus();

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !rootRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const width = Math.min(232, window.innerWidth - 16);
    const measuredHeight = menuRef.current?.getBoundingClientRect().height;
    const itemHeight = window.innerWidth <= 768 ? 44 : 36;
    const menuHeight =
      measuredHeight && measuredHeight > 0
        ? measuredHeight
        : itemCount * itemHeight + separatorCount * 9 + 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - 8;
    const spaceAbove = triggerRect.top - 8;
    const openAbove =
      placement === "top"
        ? spaceAbove >= menuHeight || spaceAbove > spaceBelow
        : spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const top = openAbove
      ? Math.max(8, triggerRect.top - menuHeight - 6)
      : Math.min(window.innerHeight - menuHeight - 8, triggerRect.bottom + 6);
    const preferredLeft =
      align === "start" ? triggerRect.left : triggerRect.right - width;
    const left = Math.min(
      Math.max(8, preferredLeft),
      window.innerWidth - width - 8,
    );

    setMenuStyle({ top, left, width });
  }, [align, itemCount, placement, separatorCount]);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled), button[role="menuitemcheckbox"]:not(:disabled), button[role="menuitemradio"]:not(:disabled)',
      ) ?? [],
    );
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      buttons[(current + delta + buttons.length) % buttons.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      buttons[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      buttons.at(-1)?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.querySelector("button")?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={setMenuRootRef} className={styles.menuRoot}>
      <span ref={triggerRef}>
        <IconButton
          icon={triggerIcon}
          label={label}
          size={compact ? "compact" : "default"}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          onClick={() => setOpen((current) => !current)}
        />
      </span>
      {open && portalRoot
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              className={styles.menu}
              style={menuStyle}
              onKeyDown={onMenuKeyDown}
            >
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className={
                      item.separatorBefore ? styles.menuSeparator : undefined
                    }
                  >
                    <button
                      type="button"
                      role={
                        item.checked === undefined
                          ? "menuitem"
                          : item.selectionRole === "radio"
                            ? "menuitemradio"
                            : "menuitemcheckbox"
                      }
                      aria-checked={
                        item.checked === undefined ? undefined : item.checked
                      }
                      disabled={item.disabled}
                      className={cx(
                        styles.menuItem,
                        item.danger && styles.menuItemDanger,
                      )}
                      onClick={() => {
                        item.onSelect();
                        setOpen(false);
                        triggerRef.current?.querySelector("button")?.focus();
                      }}
                    >
                      {Icon ? <Icon aria-hidden="true" size={16} /> : <span />}
                      <span>{item.label}</span>
                      {item.checked ? (
                        <Check
                          aria-hidden="true"
                          size={15}
                          className={styles.menuCheck}
                        />
                      ) : null}
                    </button>
                  </div>
                );
              })}
            </div>,
            portalRoot,
          )
        : null}
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.dialogPanel}>
        <div className={styles.dialogHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
          </div>
          <IconButton icon={X} label="Close dialog" onClick={onClose} />
        </div>
        <div className={styles.dialogActions}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}

interface DrawerProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}

export function Drawer({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.drawer}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.drawerPanel}>
        <div className={styles.drawerHeader}>
          <div>
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <IconButton icon={X} label="Close filters" onClick={onClose} />
        </div>
        <div className={styles.drawerBody}>{children}</div>
        <div className={styles.drawerFooter}>{footer}</div>
      </div>
    </dialog>
  );
}

export function Toast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timeout);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div role="status" aria-live="polite" className={styles.toast}>
      <span className={styles.toastMark} aria-hidden="true">
        <Check size={14} strokeWidth={3} />
      </span>
      <span>{message}</span>
      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <X aria-hidden="true" size={15} />
      </button>
    </div>
  );
}
