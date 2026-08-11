"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FolderKanban,
  HardHat,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { IconButton } from "@/design-system/primitives/controls";
import { ActionMenu } from "@/design-system/overlays/overlays";
import styles from "./app-shell.module.css";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Projects", icon: FolderKanban, active: true },
  { label: "Organizations", icon: Building2 },
  { label: "Workers", icon: HardHat },
  { label: "Users", icon: UsersRound },
  { label: "Roles", icon: ShieldCheck },
];

function BrandMark() {
  return (
    <svg
      viewBox="0 0 36 36"
      aria-hidden="true"
      focusable="false"
      className={styles.brandMark}
    >
      <path
        d="M16.2 3.7C10.1 4.5 5.5 9.8 5.5 16.1c0 7.3 5.4 12.3 10.7 16.2V19.1L10.4 13v8.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <path
        d="M19.8 3.7c6.1.8 10.7 6.1 10.7 12.4 0 7.3-5.4 12.3-10.7 16.2V19.1l5.8 5.8V14"
        fill="none"
        stroke="var(--preview-brand-copper)"
        strokeWidth="3.2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

interface AppShellProps {
  children: ReactNode;
  sidebarCollapsed: boolean;
  mobileNavigationOpen: boolean;
  onSidebarToggle: () => void;
  onMobileNavigationChange: (open: boolean) => void;
  onPrototypeAction: (message: string) => void;
}

export function AppShell({
  children,
  sidebarCollapsed,
  mobileNavigationOpen,
  onSidebarToggle,
  onMobileNavigationChange,
  onPrototypeAction,
}: AppShellProps) {
  const [notificationsSeen, setNotificationsSeen] = useState(false);
  const mobileSidebarRef = useRef<HTMLDivElement>(null);
  const mobileTriggerRef = useRef<HTMLSpanElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);

  const closeMobileNavigation = useCallback(() => {
    const shouldRestoreFocus = mobileNavigationOpen;
    onMobileNavigationChange(false);
    if (shouldRestoreFocus) {
      window.setTimeout(() => {
        mobileTriggerRef.current?.querySelector("button")?.focus();
      }, 0);
    }
  }, [mobileNavigationOpen, onMobileNavigationChange]);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const panel = mobileSidebarRef.current;
    if (!panel) return;

    const focusableSelector =
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';
    panel.querySelector<HTMLElement>(focusableSelector)?.focus();

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileNavigation();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        panel?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [closeMobileNavigation, mobileNavigationOpen]);

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 1024px)");

    function closeDrawerAtDesktop() {
      if (!desktopViewport.matches || !mobileNavigationOpen) return;
      onMobileNavigationChange(false);
      window.setTimeout(() => workspaceRef.current?.focus(), 0);
    }

    closeDrawerAtDesktop();
    desktopViewport.addEventListener("change", closeDrawerAtDesktop);
    return () =>
      desktopViewport.removeEventListener("change", closeDrawerAtDesktop);
  }, [mobileNavigationOpen, onMobileNavigationChange]);

  const sidebar = (
    <aside className={styles.sidebar} aria-label="Primary navigation">
      <div className={styles.logoArea}>
        <BrandMark />
        <span className={styles.wordmark}>
          <span>Nirman</span>
          <strong>Site</strong>
        </span>
        <div className={styles.mobileClose}>
          <IconButton
            icon={X}
            label="Close navigation"
            onClick={closeMobileNavigation}
          />
        </div>
      </div>

      <div className={styles.workspaceIdentity}>
        <span className={styles.workspaceMonogram}>AB</span>
        <span className={styles.workspaceCopy}>
          <strong>Arora Builders</strong>
          <small>Ahmedabad workspace</small>
        </span>
      </div>

      <nav className={styles.navigation}>
        <span className={styles.navigationLabel}>Workspace</span>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              className={item.active ? styles.navItemActive : styles.navItem}
              aria-current={item.active ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
              onClick={() => {
                closeMobileNavigation();
                if (!item.active) {
                  onPrototypeAction(`${item.label} navigation is disabled in the preview.`);
                }
              }}
            >
              <Icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <button
          type="button"
          className={styles.navItem}
          onClick={() => onPrototypeAction("Settings are not connected in this preview.")}
          aria-label="Settings"
          title="Settings"
        >
          <Settings aria-hidden="true" size={18} />
          <span>Settings</span>
        </button>
        <button
          type="button"
          className={styles.navItem}
          onClick={() => onPrototypeAction("Help centre is not connected in this preview.")}
          aria-label="Help centre"
          title="Help centre"
        >
          <CircleHelp aria-hidden="true" size={18} />
          <span>Help centre</span>
        </button>
        <button
          type="button"
          className={styles.collapseButton}
          onClick={onSidebarToggle}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title="Toggle sidebar"
        >
          {sidebarCollapsed ? (
            <ChevronRight aria-hidden="true" size={17} />
          ) : (
            <ChevronLeft aria-hidden="true" size={17} />
          )}
          <span>Collapse sidebar</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div
      className={styles.shell}
      data-sidebar-collapsed={sidebarCollapsed || undefined}
      data-mobile-navigation-open={mobileNavigationOpen || undefined}
    >
      <div className={styles.desktopSidebar}>{sidebar}</div>
      {mobileNavigationOpen ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          aria-label="Close navigation"
          tabIndex={-1}
          onClick={closeMobileNavigation}
        />
      ) : null}
      <div
        ref={mobileSidebarRef}
        className={styles.mobileSidebar}
        role={mobileNavigationOpen ? "dialog" : undefined}
        aria-modal={mobileNavigationOpen || undefined}
        aria-label={mobileNavigationOpen ? "Navigation drawer" : undefined}
        aria-hidden={!mobileNavigationOpen}
        inert={!mobileNavigationOpen ? true : undefined}
      >
        {sidebar}
      </div>

      <section
        ref={workspaceRef}
        className={styles.workspace}
        aria-label="Projects workspace"
        aria-hidden={mobileNavigationOpen || undefined}
        inert={mobileNavigationOpen ? true : undefined}
        tabIndex={-1}
      >
        <header className={styles.topBar}>
          <div className={styles.topBarLeading}>
            <div className={styles.mobileMenu}>
              <span ref={mobileTriggerRef}>
                <IconButton
                  icon={Menu}
                  label="Open navigation"
                  onClick={() => onMobileNavigationChange(true)}
                />
              </span>
            </div>
            <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
              <span>Workspace</span>
              <ChevronRight aria-hidden="true" size={13} />
              <strong>Projects</strong>
            </nav>
          </div>

          <div className={styles.topBarActions}>
            <span className={styles.previewLabel}>Gate 2 preview</span>
            <IconButton
              icon={Search}
              label="Search workspace"
              onClick={() =>
                onPrototypeAction("Global search is intentionally disconnected.")
              }
            />
            <span className={styles.notificationAnchor}>
              <IconButton
                icon={Bell}
                label="Notifications"
                onClick={() => {
                  setNotificationsSeen(true);
                  onPrototypeAction("No live notifications are loaded in the preview.");
                }}
              />
              {!notificationsSeen ? <span className={styles.notificationDot} /> : null}
            </span>
            <ActionMenu
              label="Open account menu"
              compact={false}
              triggerIcon={UserRound}
              items={[
                {
                  id: "profile",
                  label: "Profile",
                  icon: UserRound,
                  onSelect: () => onPrototypeAction("Profile is not connected in the preview."),
                },
                {
                  id: "preferences",
                  label: "Preferences",
                  icon: SlidersHorizontal,
                  onSelect: () =>
                    onPrototypeAction("Preferences are not connected in the preview."),
                },
                {
                  id: "logout",
                  label: "Sign out",
                  icon: LogOut,
                  separatorBefore: true,
                  onSelect: () =>
                    onPrototypeAction("Sign out is disabled in the isolated preview."),
                },
              ]}
            />
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </section>
    </div>
  );
}
