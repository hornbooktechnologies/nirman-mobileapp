"use client";
import { useQuery } from "@tanstack/react-query";
import { useNotificationScope } from "../components/notifications-provider";
import { notificationKey } from "../notification-rules";
import { notificationsService } from "../services/notifications.service";
export function useNotificationSummary() {
  const { client, org, user } = useNotificationScope();
  return useQuery(
    {
      queryKey: [...notificationKey(user, org), "summary"],
      queryFn: ({ signal }) => notificationsService.summary(org, signal),
      enabled: Boolean(user && org),
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
    client,
  );
}
export function useNotifications(page: number, unreadOnly: boolean) {
  const { client, org, user } = useNotificationScope();
  return useQuery(
    {
      queryKey: [...notificationKey(user, org), "list", page, unreadOnly],
      queryFn: ({ signal }) =>
        notificationsService.list(org, page, unreadOnly, signal),
      enabled: Boolean(user && org),
      refetchInterval: 60_000,
      refetchIntervalInBackground: false,
    },
    client,
  );
}
