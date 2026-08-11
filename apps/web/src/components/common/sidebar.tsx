"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { DEFAULT_APP_NAME } from "@nirman-app/shared";
import { navGroups } from "@/config/navigation";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { brandAssets } from "@/theme";
import { useAuth } from "@/features/auth/hooks/use-auth";

function LogoMark() {
  return (
    <Image
      src={brandAssets.logoMark}
      alt=""
      width={36}
      height={36}
      className="size-8 rounded-sub object-contain"
      aria-hidden="true"
    />
  );
}

export interface SidebarProps {
  className?: string;
  onClose?: () => void;
  onNavigate?: () => void;
  variant?: "desktop" | "drawer";
}

export function Sidebar({
  className,
  onClose,
  onNavigate,
  variant = "desktop",
}: SidebarProps) {
  const pathname = usePathname();
  const { hasPermission } = useAuth();
  const isDrawer = variant === "drawer";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-hairline/20 bg-ink px-3.5 pb-4 pt-5 text-surface select-none",
        isDrawer
          ? "h-full w-[min(280px,calc(100vw-48px))] max-w-full"
          : "w-[248px]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-2 pb-5 border-b border-surface/10">
        <div className="flex min-w-0 items-center gap-3">
          <LogoMark />
          <div className="min-w-0">
            <span className="truncate block text-[13.5px] font-bold uppercase tracking-[0.6px] text-surface">
              {DEFAULT_APP_NAME}
            </span>
            <span className="truncate block text-[10px] font-semibold text-surface/50">
              Enterprise Operating System
            </span>
          </div>
        </div>
        {isDrawer ? (
          <IconButton variant="ghost" size="sm" aria-label="Close navigation" onClick={onClose} className="text-surface hover:bg-surface/10">
            <X size={16} />
          </IconButton>
        ) : null}
      </div>

      <nav className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) =>
              (!item.permission && !item.permissionAnyOf) ||
              (item.permission ? hasPermission(item.permission) : false) ||
              (item.permissionAnyOf?.some(hasPermission) ?? false),
          );
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label} className="mt-4 first:mt-2">
              <div className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[1.2px] text-surface/45">
                {group.label}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={onNavigate}
                      className={cn(
                        "relative flex min-h-10 w-full items-center gap-3 rounded-inner px-3 text-[13px] font-medium transition-all duration-150",
                        isActive
                          ? "bg-surface/12 text-surface font-semibold shadow-pill"
                          : "text-surface/70 hover:bg-surface/6 hover:text-surface",
                      )}
                    >
                      {isActive ? (
                        <span
                          className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-lime"
                          aria-hidden="true"
                        />
                      ) : null}
                      <Icon
                        size={17}
                        strokeWidth={isActive ? 2 : 1.7}
                        className={isActive ? "text-lime-pale" : "text-surface/60"}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
