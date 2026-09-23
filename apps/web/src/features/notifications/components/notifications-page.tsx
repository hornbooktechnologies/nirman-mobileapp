"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationItem } from "@nirman-app/shared";
import { Bell, CheckCheck } from "lucide-react";
import { Badge, Button, Card, LoadingState } from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { projectsService } from "@/features/projects/services/projects.service";
import { ApiError } from "@/lib/api/api-client";
import { useNotificationScope } from "./notifications-provider";
import {
  useNotifications,
  useNotificationSummary,
} from "../hooks/use-notifications";
import {
  notificationKey,
  notificationTarget,
  ownsNotification,
} from "../notification-rules";
import { notificationsService } from "../services/notifications.service";
import { AdministrationFilters } from "@/features/administration/administration-filters";

function failure(error: unknown) {
  if (error instanceof ApiError && error.statusCode === 404)
    return "This notification or its record is no longer available. Refresh the inbox to see the latest state.";
  if (error instanceof ApiError && error.statusCode === 403)
    return "Your access has changed. Refresh access or contact your administrator.";
  return error instanceof Error
    ? error.message
    : "Unable to complete this action. Please retry.";
}
function Inbox() {
  const scope = useNotificationScope();
  const { org, user, client } = scope;
  const { activeOrganizationTimezone, refreshUser } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1),
    [unreadOnly, setUnreadOnly] = useState(false);
  const list = useNotifications(page, unreadOnly),
    summary = useNotificationSummary();
  const [pending, setPending] = useState("");
  const busy = useRef(false);
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    if (lifetime.current.signal.aborted)
      lifetime.current = new AbortController();
    return () => lifetime.current.abort();
  }, []);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [fallback, setFallback] = useState("");
  const refresh = () =>
    client.invalidateQueries({ queryKey: notificationKey(user, org) });
  async function act(item?: NotificationItem, open = false) {
    if (busy.current || !org || !user) return;
    if (item && !ownsNotification(item, user, org)) return;
    const signal = AbortSignal.any([scope.signal, lifetime.current.signal]);
    busy.current = true;
    setPending(item?.id ?? "all");
    setNotice("");
    setError("");
    setFallback("");
    try {
      let receiptError = "";
      try {
        if (!item) await notificationsService.readAll(org, signal);
        else if (!item.readAt)
          await notificationsService.read(org, item.id, signal);
      } catch (e) {
        if (!open) throw e;
        receiptError = `Read status could not be saved: ${failure(e)}`;
      }
      if (signal.aborted) return;
      await refresh();
      if (signal.aborted) return;
      if (!open || !item) {
        setNotice(
          item
            ? "Notification marked as read."
            : "All notifications marked as read.",
        );
        if (!item) setPage(1);
        return;
      }
      // Fetch fresh effective grants before requesting any protected target record.
      const access = await projectsService.projectAccess(org);
      if (signal.aborted) return;
      if (access.organizationId !== org)
        throw new Error("Workspace changed. Refresh the inbox.");
      const target = notificationTarget(item, user, org, access.projects);
      if (!target.exact) {
        setNotice(
          `${receiptError ? `${receiptError} ` : ""}The exact record cannot be opened from this notification. You can browse the authorized module.`,
        );
        setFallback(target.href);
        return;
      }
      await notificationsService.verifyTarget(org, item, target.type, signal);
      if (signal.aborted) return;
      if (receiptError) {
        setError(receiptError);
        setFallback(target.href);
        return;
      }
      router.push(target.href);
    } catch (e) {
      if (!signal.aborted) setError(failure(e));
    } finally {
      if (!signal.aborted) {
        busy.current = false;
        setPending("");
      }
    }
  }
  if (!org || !user)
    return (
      <Card>
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p role="alert">
          Select an organization with Notifications permission to view your
          inbox.
        </p>
      </Card>
    );
  const items = (list.data?.items ?? []).filter((item) =>
    ownsNotification(item, user, org),
  );
  const pages = Math.max(1, list.data?.pagination.totalPages ?? 1);
  return (
    <div className="mx-auto max-w-5xl space-y-5 text-base leading-relaxed [&_button]:min-h-11 [&_button]:text-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-body">Notifications</h1>
          <p className="text-sub">
            Updates and approvals for your organization.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={Boolean(pending) || list.isFetching}
            onClick={() => void refresh()}
          >
            {list.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
          <Button
            disabled={
              Boolean(pending) || summary.isError || !summary.data?.unreadCount
            }
            onClick={() => void act()}
          >
            <CheckCheck size={18} aria-hidden="true" />
            {pending === "all" ? "Marking all…" : "Mark all as read"}
          </Button>
        </div>
      </header>
      <AdministrationFilters
        name="notifications"
        scope={summary.isPending ? "Loading unread count…" : summary.isError ? "Unread count unavailable" : `${summary.data.unreadCount} unread · only notifications for this account and organization`}
        value={{ view: unreadOnly ? "unread" : "" }}
        fields={[{ key: "view", label: "Read state", allLabel: "All notifications", options: [{ value: "unread", label: "Unread only" }] }]}
        disabled={Boolean(pending)}
        onApply={(value) => { setUnreadOnly(value.view === "unread"); setPage(1); }}
      />
      {summary.isError && (
        <Card>
          <p role="alert">
            Could not refresh the unread count: {failure(summary.error)}
          </p>
          <Button variant="outline" onClick={() => void summary.refetch()}>
            Retry count
          </Button>
        </Card>
      )}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <Card>
          <p role="alert">{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              void refreshUser();
              void refresh();
            }}
          >
            Refresh access and inbox
          </Button>
        </Card>
      )}
      {fallback && (
        <Link
          className="inline-flex min-h-11 items-center underline focus-visible:ring-2 focus-visible:ring-lime"
          href={fallback}
        >
          Continue to destination
        </Link>
      )}
      {list.isPending ? (
        <LoadingState label="Loading notifications" />
      ) : list.isError ? (
        <Card>
          <p role="alert">{failure(list.error)}</p>
          <Button onClick={() => void list.refetch()}>Retry inbox</Button>
        </Card>
      ) : (
        <>
          {!items.length ? (
            <Card>
              <Bell aria-hidden="true" className="mb-3 text-sub" />
              <h2 className="text-lg font-semibold">
                {unreadOnly ? "You're all caught up" : "No notifications"}
              </h2>
              <p className="text-sub">
                {unreadOnly
                  ? "No unread notifications on this page."
                  : "Your project updates and approval requests will appear here."}
              </p>
              {page > 1 && (
                <Button variant="outline" onClick={() => setPage(1)}>
                  Return to first page
                </Button>
              )}
            </Card>
          ) : (
            <ul className="space-y-3" aria-label="Notifications">
              {items.map((item) => (
                <li key={item.id}>
                  <Card
                    className={`space-y-3 ${!item.readAt ? "border-l-4 border-l-lime" : ""}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="min-w-0 flex-1 break-words text-base font-semibold">
                        {item.title}
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          className="text-xs"
                          variant={item.readAt ? "default" : "warning"}
                        >
                          {item.readAt ? "Read" : "Unread"}
                        </Badge>
                        {item.importance !== "NORMAL" && (
                          <Badge
                            className="text-xs"
                            variant={
                              item.importance === "URGENT"
                                ? "danger"
                                : "warning"
                            }
                          >
                            {item.importance === "URGENT"
                              ? "Urgent"
                              : "High priority"}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sub">
                      {item.message}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <time
                        className="text-sm text-sub"
                        dateTime={item.createdAt}
                      >
                        {new Intl.DateTimeFormat("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone:
                            activeOrganizationTimezone || "Asia/Kolkata",
                        }).format(new Date(item.createdAt))}
                      </time>
                      <div className="flex flex-wrap gap-2">
                        {!item.readAt && (
                          <Button
                            variant="outline"
                            disabled={Boolean(pending)}
                            onClick={() => void act(item)}
                          >
                            Mark as read
                          </Button>
                        )}
                        {item.referenceType && (
                          <Button
                            variant="ghost"
                            disabled={Boolean(pending)}
                            aria-label={`Open ${item.title}`}
                            onClick={() => void act(item, true)}
                          >
                            {pending === item.id ? "Opening…" : "Open record"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
          <nav
            aria-label="Notification pages"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <span className="text-sm text-sub">
              Page {page} of {pages} · {list.data.pagination.total}{" "}
              notifications
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={page <= 1 || Boolean(pending) || list.isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                disabled={page >= pages || Boolean(pending) || list.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
export function NotificationsPage() {
  const { user, org } = useNotificationScope();
  return <Inbox key={`${user}:${org}`} />;
}
