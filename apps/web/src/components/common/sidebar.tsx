"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { DEFAULT_APP_NAME } from "@nirman-app/shared";
import { scopedNavigationHref } from "@/features/projects/project-navigation";
import { navGroups } from "@/config/navigation";
import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { brandAssets } from "@/theme";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
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

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarContent {...props} />
    </Suspense>
  );
}

function SidebarContent({
  className,
  onClose,
  onNavigate,
  variant = "desktop",
}: SidebarProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { hasPermission, activeOrganizationId } = useAuth();
  const access = useProjectAccess(activeOrganizationId);
  const requestedProjectId =
    pathname.match(/^\/projects\/([^/]+)(?:\/|$)/)?.[1] ??
    params.get("projectId");
  const contextProject =
    access.isSuccess &&
    access.data.organizationId === activeOrganizationId &&
    (!params.get("organizationId") ||
      params.get("organizationId") === activeOrganizationId)
      ? access.data.projects.find(
          (project) => project.id === requestedProjectId,
        )
      : undefined;
  const canNavigate = (permission: string) => {
    if (
      contextProject &&
      /^(workers|attendance|work-calendar|wages|kharchi|expenses|materials|progress|gallery|leads|inventory):/.test(
        permission,
      )
    )
      return contextProject.permissions.some((grant) => grant === permission);
    if (permission === "inventory:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("inventory:read"),
        )
      );
    if (permission.startsWith("leads:read-"))
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes(
            permission as import("@nirman-app/shared").PermissionKey,
          ),
        )
      );
    if (permission === "gallery:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("gallery:read"),
        )
      );
    if (permission === "progress:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("progress:read"),
        )
      );
    if (permission === "expenses:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("expenses:read"),
        )
      );
    if (permission === "materials:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("materials:read"),
        )
      );
    if (permission === "kharchi:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("kharchi:read"),
        )
      );
    if (permission === "wages:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("wages:read"),
        )
      );
    if (permission === "attendance:read")
      return (
        access.isSuccess &&
        access.data.projects.some((project) =>
          project.permissions.includes("attendance:read"),
        )
      );
    if (permission === "work-calendar:read")
      return (
        hasPermission(permission) ||
        (access.isSuccess &&
          access.data.projects.some((project) =>
            project.permissions.includes("work-calendar:read"),
          ))
      );
    return hasPermission(permission);
  };
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
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close navigation"
            onClick={onClose}
            className="text-surface hover:bg-surface/10"
          >
            <X size={16} />
          </IconButton>
        ) : null}
      </div>

      {contextProject ? (
        <div className="mt-3 rounded-inner border border-surface/20 p-3 text-[13px]">
          <p className="text-surface/60">Project context</p>
          <p className="mt-1 break-words">{contextProject.name}</p>
          {contextProject.status === "ARCHIVED" ? (
            <p className="text-surface/60">Archived</p>
          ) : null}
        </div>
      ) : null}
      <nav className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto pr-0.5">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(
            (item) =>
              (!item.permission && !item.permissionAnyOf) ||
              (item.permission ? canNavigate(item.permission) : false) ||
              (item.permissionAnyOf?.some(canNavigate) ?? false),
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
                  const href = contextProject
                    ? scopedNavigationHref(item.href, contextProject.id)
                    : item.href;
                  const target = href.split("?")[0];
                  const isActive =
                    item.href === "/projects"
                      ? pathname === "/projects" ||
                        /^\/projects\/[^/]+(?:\/team)?$/.test(pathname)
                      : pathname === target ||
                        pathname.startsWith(`${target}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
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
                        className={
                          isActive ? "text-lime-pale" : "text-surface/60"
                        }
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
