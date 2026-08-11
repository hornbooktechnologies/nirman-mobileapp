"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button, Dialog } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface ResponsiveFilterBarProps {
  advancedLabel?: string;
  desktopClassName?: string;
  renderFilters: () => ReactNode;
  search?: ReactNode;
}

export function ResponsiveFilterBar({
  advancedLabel = "Filters",
  desktopClassName,
  renderFilters,
  search,
}: ResponsiveFilterBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "grid gap-3 lg:hidden",
          search ? "sm:grid-cols-[minmax(0,1fr)_auto]" : "sm:grid-cols-[auto]",
        )}
      >
        {search ? <div className="min-w-0">{search}</div> : null}
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <SlidersHorizontal size={15} strokeWidth={1.8} />
          {advancedLabel}
        </Button>
      </div>

      <div className={cn("hidden gap-3 lg:grid", desktopClassName)}>
        {search ? search : null}
        {renderFilters()}
      </div>

      <Dialog
        open={open}
        title={advancedLabel}
        description="Refine the current list without changing saved data."
        onOpenChange={setOpen}
        footer={
          <Button variant="dark" size="sm" onClick={() => setOpen(false)}>
            Apply Filters
          </Button>
        }
      >
        <div className="grid gap-3.5 py-1">{renderFilters()}</div>
      </Dialog>
    </div>
  );
}
