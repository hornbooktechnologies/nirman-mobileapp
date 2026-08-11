"use client";

import { MoreHorizontal } from "lucide-react";
import {
  type MouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button, IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface RowActionItem {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface MenuPosition {
  left: number;
  top: number;
}

const MENU_WIDTH = 192;
const MENU_MAX_HEIGHT = 320;
const VIEWPORT_GUTTER = 12;

export function RowActionMenu({ actions }: { actions: RowActionItem[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const visibleActions = actions.filter(Boolean);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }

      setOpen(false);
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (visibleActions.length === 0) {
    return null;
  }

  function toggleMenu(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const availableWidth = window.innerWidth - VIEWPORT_GUTTER * 2;
    const menuWidth = Math.min(MENU_WIDTH, availableWidth);
    const preferredLeft = rect.right - menuWidth;
    const maxLeft = window.innerWidth - menuWidth - VIEWPORT_GUTTER;
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
    const spaceAbove = rect.top - VIEWPORT_GUTTER;
    const opensUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const preferredTop = opensUp
      ? rect.top - Math.min(MENU_MAX_HEIGHT, spaceAbove) - 8
      : rect.bottom + 8;
    const maxTop = window.innerHeight - VIEWPORT_GUTTER - 44;

    setPosition({
      left: Math.min(Math.max(VIEWPORT_GUTTER, preferredLeft), maxLeft),
      top: Math.max(VIEWPORT_GUTTER, Math.min(preferredTop, maxTop)),
    });
    setOpen((current) => !current);
  }

  return (
    <div className="flex justify-end">
      <IconButton
        ref={buttonRef}
        aria-label="Open row actions"
        aria-expanded={open}
        variant="outline"
        className="size-[34px]"
        onClick={toggleMenu}
      >
        <MoreHorizontal size={17} strokeWidth={1.8} />
      </IconButton>

      {open && position ? (
        <div
          ref={menuRef}
          className="fixed z-50 w-[min(192px,calc(100vw-24px))] overflow-y-auto rounded-inner border border-hairline bg-card p-2 shadow-pill"
          style={{
            left: position.left,
            maxHeight: `min(${MENU_MAX_HEIGHT}px, calc(100dvh - ${position.top + VIEWPORT_GUTTER}px))`,
            top: position.top,
          }}
          role="menu"
        >
          {visibleActions.map((action) => (
            <Button
              key={action.label}
              variant="ghost"
              size="sm"
              role="menuitem"
              disabled={action.disabled}
              className={cn(
                "min-h-10 w-full justify-start gap-3 rounded-sub px-3 py-2 text-left text-[13px] font-medium text-body hover:bg-sunken/70 hover:text-body",
                action.destructive && "text-danger hover:bg-danger/10 hover:text-danger",
              )}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              <span className="grid size-5 place-items-center">{action.icon}</span>
              <span className="min-w-0 break-words">{action.label}</span>
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
