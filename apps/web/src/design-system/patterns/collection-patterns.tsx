import { type ReactNode } from "react";
import {
  AlertCircle,
  FileSearch,
  Inbox,
  LockKeyhole,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { Button } from "@/design-system/primitives/controls";
import styles from "./collection-patterns.module.css";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderCopy}>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className={styles.pageActions}>{actions}</div>
    </header>
  );
}

export function CollectionSurface({
  toolbar,
  activeFilters,
  banner,
  children,
  footer,
}: {
  toolbar: ReactNode;
  activeFilters?: ReactNode;
  banner?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className={styles.collectionSurface} aria-label="Projects collection">
      {banner}
      <div className={styles.toolbar}>{toolbar}</div>
      {activeFilters ? <div className={styles.activeFilters}>{activeFilters}</div> : null}
      <div className={styles.collectionBody}>{children}</div>
      {footer ? <footer className={styles.collectionFooter}>{footer}</footer> : null}
    </section>
  );
}

export function BulkActionBar({
  count,
  children,
  onClear,
}: {
  count: number;
  children: ReactNode;
  onClear: () => void;
}) {
  return (
    <div className={styles.bulkBar} role="region" aria-label="Bulk actions">
      <span className={styles.bulkCount}>{count} selected</span>
      <Button variant="tertiary" size="compact" onClick={onClear}>
        Clear selection
      </Button>
      <span className={styles.bulkDivider} />
      <div className={styles.bulkActions}>{children}</div>
    </div>
  );
}

export function StaleDataBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.staleBanner} role="status">
      <WifiOff aria-hidden="true" size={17} />
      <div>
        <strong>Showing saved project data</strong>
        <span>Last refreshed 24 minutes ago. Changes may not be visible yet.</span>
      </div>
      <Button
        variant="tertiary"
        size="compact"
        leadingIcon={RefreshCw}
        onClick={onRetry}
      >
        Retry
      </Button>
    </div>
  );
}

type StateKind = "empty" | "no-results" | "error" | "denied";

const stateContent: Record<
  StateKind,
  { icon: typeof Inbox; title: string; description: string }
> = {
  empty: {
    icon: Inbox,
    title: "No projects yet",
    description:
      "Create the first project to begin tracking progress, inventory, and activity.",
  },
  "no-results": {
    icon: FileSearch,
    title: "No projects match these filters",
    description:
      "Adjust the search or remove one or more filters to see available records.",
  },
  error: {
    icon: AlertCircle,
    title: "Projects could not be loaded",
    description:
      "The request failed before any records were changed. Try loading the collection again.",
  },
  denied: {
    icon: LockKeyhole,
    title: "403 — Projects access restricted",
    description:
      "Your role does not include permission to view project records in this workspace.",
  },
};

export function CollectionState({
  kind,
  action,
}: {
  kind: StateKind;
  action?: ReactNode;
}) {
  const content = stateContent[kind];
  const Icon = content.icon;

  return (
    <div
      className={cx(styles.state, kind === "error" && styles.stateError)}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className={styles.stateIcon} aria-hidden="true">
        <Icon size={22} />
      </span>
      <h2>{content.title}</h2>
      <p>{content.description}</p>
      {action ? <div className={styles.stateAction}>{action}</div> : null}
    </div>
  );
}
