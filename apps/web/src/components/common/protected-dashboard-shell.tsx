"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Sidebar } from "@/components/common/sidebar";
import { TopBar } from "@/components/common/top-bar";
import { Card } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";

const MOBILE_NAVIGATION_ID = "mobile-navigation-dialog";
const DASHBOARD_MAIN_ID = "dashboard-main-content";
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function DashboardFrame({ children, pathname }: { children: ReactNode; pathname: string }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Route transitions are an external navigation event; only transient drawer state resets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktopViewport = window.matchMedia("(min-width: 64rem)");

    function closeDrawerOnDesktop(event: MediaQueryListEvent) {
      if (event.matches) setIsDrawerOpen(false);
    }

    desktopViewport.addEventListener("change", closeDrawerOnDesktop);
    return () => desktopViewport.removeEventListener("change", closeDrawerOnDesktop);
  }, []);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const drawer = drawerRef.current;
    const getFocusableElements = () =>
      Array.from(drawer?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? []).filter(
        (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
      );

    const focusFrame = window.requestAnimationFrame(() => {
      (getFocusableElements()[0] ?? drawer)?.focus();
    });

    function handleDrawerKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsDrawerOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        drawer?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleDrawerKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      const previousTargetIsVisible =
        previouslyFocused?.isConnected && previouslyFocused.getClientRects().length > 0;
      const focusTarget = previousTargetIsVisible
        ? previouslyFocused
        : document.getElementById(DASHBOARD_MAIN_ID);
      focusTarget?.focus();
    };
  }, [isDrawerOpen]);

  return (
    <div className="min-h-screen bg-canvas lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <Sidebar className="sticky top-0 hidden h-screen lg:flex" />
      {isDrawerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-ink/45 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            ref={drawerRef}
            id={MOBILE_NAVIGATION_ID}
            role="dialog"
            aria-label="Primary navigation"
            aria-modal="true"
            tabIndex={-1}
            className="h-full w-fit"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar
              variant="drawer"
              onClose={() => setIsDrawerOpen(false)}
              onNavigate={() => setIsDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}
      <div className="min-w-0" inert={isDrawerOpen}>
        <TopBar
          isMenuOpen={isDrawerOpen}
          menuId={MOBILE_NAVIGATION_ID}
          onOpenMenu={() => setIsDrawerOpen(true)}
        />
        <main
          id={DASHBOARD_MAIN_ID}
          tabIndex={-1}
          className="min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
        >
          <div className="mx-auto w-full max-w-[1480px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function ProtectedDashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-4">
        <Card padding="compact" className="flex items-center gap-3 text-[13px] text-body">
          <LoaderCircle size={17} className="animate-spin text-lime" aria-hidden="true" />
          Loading workspace
        </Card>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return <DashboardFrame pathname={pathname}>{children}</DashboardFrame>;
}
