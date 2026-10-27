"use client";
import Link from "next/link";
import { UserAvatar } from "@/features/profile/components/user-avatar";

import { Building2, FolderKanban, LogOut } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { IconButton, Select } from "@/components/ui";
import { getRouteTitle } from "@/config/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { authService } from "@/features/auth/services/auth.service";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import {
  useOrganizations,
  useSwitchOrganization,
} from "@/features/organizations/hooks/use-organizations";
import { useProjectAccess } from "@/features/projects/hooks/use-projects";
import { projectNavigation } from "@/features/projects/project-navigation";
import {
  accessibleProjectSwitchHref,
  projectIdFromLocation,
} from "@/features/projects/project-switch";

export interface TopBarProps {
  isMenuOpen?: boolean;
  menuId?: string;
  onOpenMenu?: () => void;
}

function ProjectSwitcher({
  organizationId,
  pathname,
}: {
  organizationId: string | null;
  pathname: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const access = useProjectAccess(organizationId);
  const projects =
    access.data?.organizationId === organizationId ? access.data.projects : [];
  const selectedProjectId = projectIdFromLocation(
    pathname,
    new URLSearchParams(params.toString()),
    projects,
    access.data?.activeProjectId,
  );

  if (!organizationId || !projects.length) return null;

  return (
    <label className="relative hidden lg:block">
      <span className="sr-only">Active project</span>
      <FolderKanban
        aria-hidden="true"
        size={15}
        className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted"
      />
      <Select
        value={selectedProjectId}
        onChange={(event) => {
          if (!event.target.value || event.target.value === selectedProjectId)
            return;
          const project = projects.find(
            (candidate) => candidate.id === event.target.value,
          );
          if (!project) return;
          router.replace(
            accessibleProjectSwitchHref(
              pathname,
              project.id,
              projectNavigation(project).map((item) => item.href),
            ),
          );
        }}
        aria-label="Active project"
        className="w-44 pl-9"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
            {project.status === "ARCHIVED" ? " · Archived" : ""}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function TopBar({
  isMenuOpen = false,
  menuId,
  onOpenMenu,
}: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeOrganizationId, clearSession } = useAuth();
  const organizations = useOrganizations(Boolean(activeOrganizationId));
  const switchOrganization = useSwitchOrganization();
  const activeOrganization = organizations.data?.find(
    (organization) => organization.id === activeOrganizationId,
  );

  function handleOrganizationChange(organizationId: string) {
    if (!organizationId || organizationId === activeOrganizationId) return;
    switchOrganization.mutate(organizationId, {
      onSuccess: () => {
        if (pathname.startsWith("/projects/")) {
          router.replace("/projects");
        }
      },
    });
  }

  async function handleLogout() {
    await authService.logout().catch(() => undefined);
    clearSession();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex min-h-12 items-center justify-between gap-4 border-b border-hairline/70 bg-surface/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: menu trigger + breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <IconButton
          variant="outline"
          size="sm"
          className="shrink-0 bg-sunken/60 text-sub hover:bg-sunken hover:text-body lg:hidden"
          aria-label="Open navigation"
          aria-controls={menuId}
          aria-expanded={isMenuOpen}
          onClick={onOpenMenu}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <line x1="2" y1="5" x2="14" y2="5" />
            <line x1="2" y1="9" x2="14" y2="9" />
            <line x1="2" y1="13" x2="14" y2="13" />
          </svg>
        </IconButton>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.8px] text-muted">
            NirmanSite
          </p>
          <p className="truncate text-[14px] font-semibold leading-tight text-body">
            {getRouteTitle(pathname)}
          </p>
        </div>
      </div>

      {/* Right: user identity + logout */}
      <div className="flex items-center gap-2">
        <NotificationBell />
        {organizations.data?.length === 1 && activeOrganization ? (
          <div className="hidden max-w-44 items-center gap-2 rounded-sub border border-hairline bg-sunken/60 px-2.5 py-1.5 text-[11px] font-medium text-body md:flex">
            <Building2
              size={14}
              className="shrink-0 text-muted"
              aria-hidden="true"
            />
            <span className="truncate">{activeOrganization.name}</span>
          </div>
        ) : organizations.data && organizations.data.length > 1 ? (
          <Select
            value={activeOrganizationId ?? ""}
            onChange={(event) => handleOrganizationChange(event.target.value)}
            disabled={switchOrganization.isPending}
            aria-label="Active organization"
            className="hidden w-44 md:block"
          >
            {organizations.data.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </Select>
        ) : null}
        <Suspense fallback={null}>
          <ProjectSwitcher
            organizationId={activeOrganizationId}
            pathname={pathname}
          />
        </Suspense>

        {/* User meta — hidden on mobile */}
        <div className="hidden min-w-0 text-right sm:block">
          <p className="truncate text-[12.5px] font-semibold text-body">
            {user?.name}
          </p>
          <p className="truncate text-[10px] font-medium text-muted">
            {user?.roleName}
          </p>
        </div>

        {/* Avatar */}
        <Link
          href="/profile"
          aria-label="Open profile"
          className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full border border-hairline bg-sunken text-sub"
        >
          <UserAvatar avatar={user?.avatar} className="size-8" />
        </Link>

        {/* Logout — icon-only on mobile, text on sm+ */}
        <IconButton
          variant="ghost"
          size="sm"
          aria-label="Logout"
          title="Logout"
          onClick={handleLogout}
          className="text-sub hover:text-body"
        >
          <LogOut size={15} strokeWidth={1.8} />
        </IconButton>
      </div>
    </header>
  );
}
