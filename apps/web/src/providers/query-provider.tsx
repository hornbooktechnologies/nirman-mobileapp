"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { FINANCIAL_DATA_CHANGED } from "@/lib/api/financial-events";
const RootQueryContext = createContext<QueryClient | null>(null);
export function useRootQueryClient() {
  const client = useContext(RootQueryContext);
  if (!client) throw new Error("Root query provider required");
  return client;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    const changed = (event: Event) => {
      const scope = (
        event as CustomEvent<{ organizationId: string; projectId: string }>
      ).detail;
      void queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === "total-expenses" &&
          query.queryKey[2] === scope.organizationId &&
          (query.queryKey[3] === scope.projectId ||
            query.queryKey[3] === "access"),
      });
    };
    window.addEventListener(FINANCIAL_DATA_CHANGED, changed);
    return () => window.removeEventListener(FINANCIAL_DATA_CHANGED, changed);
  }, [queryClient]);
  return (
    <RootQueryContext.Provider value={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RootQueryContext.Provider>
  );
}
