"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotificationSummary } from "../hooks/use-notifications";
import { useNotificationScope } from "./notifications-provider";
export function NotificationBell() {
  const { org, user } = useNotificationScope();
  const summary = useNotificationSummary();
  if (!org || !user) return null;
  const count = summary.isError ? undefined : summary.data?.unreadCount;
  return (
    <Link
      href="/notifications"
      className="relative grid min-h-11 min-w-11 place-items-center rounded-sub text-body hover:bg-sunken focus-visible:ring-2 focus-visible:ring-lime"
      aria-label={`Notifications${count !== undefined ? `, ${count} unread` : ", unread count unavailable"}`}
    >
      <Bell size={20} aria-hidden="true" />
      {count !== undefined && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 top-0 rounded-full bg-lime px-1.5 text-xs font-semibold text-lime-ink"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
