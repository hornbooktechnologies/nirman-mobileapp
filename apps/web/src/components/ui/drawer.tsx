"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  id?: string;
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  onOpenChange: (open: boolean) => void;
  className?: string;
}

let scrollLocks = 0;
let previousOverflow = "";

export function Drawer({
  id,
  open,
  title,
  description,
  children,
  footer,
  side = "right",
  onOpenChange,
  className,
}: DrawerProps) {
  const labelId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const trigger =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // Native modal dialogs provide top-layer rendering, background inertness and
    // keyboard focus containment, including when a drawer is inside a clipped card.
    dialog.showModal();
    closeRef.current?.focus();
    if (scrollLocks++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      dialog.close();
      if (--scrollLocks === 0) document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      id={id}
      aria-modal="true"
      aria-labelledby={`${labelId}-title`}
      aria-describedby={description ? `${labelId}-description` : undefined}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            "button, a[href], input, select, textarea, [tabindex]",
          ),
        ).filter(
          (item) =>
            item.tabIndex >= 0 &&
            !item.matches(":disabled") &&
            item.getClientRects().length > 0,
        );
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none border-0 bg-transparent p-0 text-body backdrop:bg-ink/50 backdrop:backdrop-blur-xs"
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      {open ? (
        <div
          className={cn(
            "flex h-full w-full max-w-md flex-col border-hairline bg-surface p-5 text-body shadow-floating sm:p-6 motion-safe:animate-fade-in-up",
            side === "right"
              ? "ml-auto border-l rounded-l-card"
              : "mr-auto border-r rounded-r-card",
            className,
          )}
        >
          <header className="mb-4 flex items-start justify-between gap-4 border-b border-hairline/60 pb-4">
            <div className="min-w-0">
              <h2
                id={`${labelId}-title`}
                className="break-words text-[16px] font-semibold leading-6 text-body sm:text-[18px]"
              >
                {title}
              </h2>
              {description ? (
                <p
                  id={`${labelId}-description`}
                  className="mt-0.5 text-[13px] leading-5 text-sub"
                >
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton
              ref={closeRef}
              aria-label={`Close ${title}`}
              variant="ghost"
              className="size-11 motion-reduce:transform-none motion-reduce:active:scale-100 motion-reduce:transition-none"
              onClick={() => onOpenChange(false)}
            >
              <X size={16} strokeWidth={2} />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 text-sm leading-6">
            {children}
          </div>
          {footer ? (
            <footer className="mt-4 flex flex-col gap-2.5 border-t border-hairline/60 pt-4 sm:flex-row sm:justify-end">
              {footer}
            </footer>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
