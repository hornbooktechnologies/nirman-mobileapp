"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface DialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function Dialog({
  open,
  title,
  description,
  children,
  footer,
  onOpenChange,
  className,
}: DialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusableSelector = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";
    const focusable = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    const focusFrame = window.requestAnimationFrame(() => (focusable()[0] ?? dialogRef.current)?.focus());

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); dialogRef.current?.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onOpenChange, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid min-h-dvh place-items-end bg-ink/50 backdrop-blur-xs p-0 animate-fade-in-up sm:place-items-center sm:p-6"
      role="presentation"
      onMouseDown={() => onOpenChange(false)}
    >
      <section
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "flex max-h-[min(100dvh,720px)] w-full max-w-lg flex-col rounded-t-card border border-hairline bg-surface p-5 text-body shadow-floating sm:max-h-[calc(100dvh-48px)] sm:rounded-card sm:p-6",
          className,
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="mb-4 flex min-w-0 shrink-0 items-start justify-between gap-4 border-b border-hairline/60 pb-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="break-words text-[16px] font-semibold leading-6 text-body sm:text-[18px]"
            >
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-0.5 break-words text-[13px] leading-5 text-sub">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton
            aria-label="Close dialog"
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <X size={16} strokeWidth={2} />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-[13px] sm:text-[13.5px]">
          {children}
        </div>

        {footer ? (
          <footer className="mt-4 flex shrink-0 flex-col-reverse gap-2.5 border-t border-hairline/60 pt-4 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
