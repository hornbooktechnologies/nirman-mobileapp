"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";

const Context = createContext<{
  client: QueryClient;
  user: string;
  org: string;
  signal: AbortSignal;
} | null>(null);
function Scope({
  user,
  org,
  children,
}: {
  user: string;
  org: string;
  children: ReactNode;
}) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: true },
          mutations: { retry: false },
        },
      }),
  );
  const lifetime = useRef(new AbortController());
  useEffect(() => {
    client.mount();
    if (lifetime.current.signal.aborted)
      lifetime.current = new AbortController();
    return () => {
      lifetime.current.abort();
      void client.cancelQueries();
      client.clear();
      client.unmount();
    };
  }, [client]);
  return (
    <Context.Provider
      value={{
        client,
        user,
        org,
        get signal() {
          return lifetime.current.signal;
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, activeOrganizationId: org, hasPermission } = useAuth();
  const allowed = Boolean(user && org && hasPermission("notifications:read"));
  return (
    <Scope
      key={`${user?.id}:${org}:${allowed}`}
      user={allowed ? user!.id : ""}
      org={allowed ? org! : ""}
    >
      {children}
    </Scope>
  );
}
export function useNotificationScope() {
  const value = useContext(Context);
  if (!value) throw new Error("NotificationsProvider is required");
  return value;
}
