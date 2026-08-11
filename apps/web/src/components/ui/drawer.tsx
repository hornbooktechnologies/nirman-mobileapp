"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function Drawer({ open, title, description, children, footer, side = "right", onOpenChange, className }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-xs animate-fade-in-up" role="presentation" onMouseDown={() => onOpenChange(false)}>
      <aside
        aria-modal="true"
        role="dialog"
        aria-labelledby="drawer-title"
        className={cn(
          "flex h-full w-full max-w-md flex-col border-hairline bg-surface p-5 text-body shadow-floating sm:p-6",
          side === "right" ? "ml-auto border-l rounded-l-card" : "mr-auto border-r rounded-r-card",
          className,
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="mb-4 flex items-start justify-between gap-4 border-b border-hairline/60 pb-4">
          <div className="min-w-0">
            <h2 id="drawer-title" className="break-words text-[17px] font-semibold leading-6 text-body sm:text-[18px]">{title}</h2>
            {description ? <p className="mt-0.5 text-[13px] leading-5 text-sub">{description}</p> : null}
          </div>
          <IconButton aria-label="Close drawer" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X size={16} strokeWidth={2} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1 text-[13px] sm:text-[13.5px]">{children}</div>
        {footer ? <footer className="mt-4 flex flex-col-reverse gap-2.5 border-t border-hairline/60 pt-4 sm:flex-row sm:justify-end">{footer}</footer> : null}
      </aside>
    </div>
  );
}
