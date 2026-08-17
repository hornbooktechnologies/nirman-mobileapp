"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { APP_STORAGE_NAMESPACE } from "@nirman-app/shared";
import {
  setApiAccessTokenSetter,
  setApiSessionClearer,
  setApiTokenGetter,
} from "@/lib/api/api-client";
import { authService } from "@/features/auth/services/auth.service";

const ACCESS_TOKEN_STORAGE_KEY = `${APP_STORAGE_NAMESPACE}.accessToken`;
const ACTIVE_ORGANIZATION_STORAGE_KEY = `${APP_STORAGE_NAMESPACE}.activeOrganizationId`;
const CUSTOMER_OPERATION_PERMISSION_PREFIXES = [
  "workers:",
  "attendance:",
  "kharchi:",
  "wages:",
  "leads:",
] as const;
const PROTECTED_PLATFORM_ROLE_PERMISSIONS = new Set([
  "platform-roles:read",
  "platform-roles:create",
  "platform-roles:update",
  "platform-roles:delete",
  "platform-roles:manage",
]);

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  status: "ACTIVE" | "INACTIVE";
  roleId: string;
  roleName: string;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  activeOrganizationId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: {
    user: AuthUser;
    accessToken: string;
    activeOrganizationId?: string | null;
  }) => void;
  clearSession: () => void;
  refreshUser: (organizationId?: string | null) => Promise<AuthUser | null>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);

  const storeAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
    setAccessToken(token);
    if (typeof window === "undefined") return;
    if (token) window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    else window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }, []);

  const storeActiveOrganization = useCallback((organizationId: string | null) => {
    setActiveOrganizationId(organizationId);
    if (typeof window === "undefined") return;
    if (organizationId) {
      window.localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
    } else {
      window.localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    setApiTokenGetter(() => accessTokenRef.current);
    setApiAccessTokenSetter((token) => storeAccessToken(token));
    setApiSessionClearer(() => {
      setUser(null);
      storeAccessToken(null);
      storeActiveOrganization(null);
      setIsLoading(false);
    });
  }, [storeAccessToken, storeActiveOrganization]);

  const refreshUser = useCallback(async (organizationId?: string | null) => {
    try {
      const preferredOrganizationId =
        organizationId !== undefined
          ? organizationId
          : typeof window === "undefined"
            ? null
            : window.localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
      const profile = await authService.getProfile(preferredOrganizationId);
      setUser(profile.user);
      storeActiveOrganization(profile.activeOrganizationId);
      setIsLoading(false);
      return profile.user;
    } catch {
      setUser(null);
      storeAccessToken(null);
      storeActiveOrganization(null);
      setIsLoading(false);
      return null;
    }
  }, [storeAccessToken, storeActiveOrganization]);

  useEffect(() => {
    let isMounted = true;
    async function hydrateSession() {
      const storedToken =
        typeof window === "undefined"
          ? null
          : window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
      if (storedToken) storeAccessToken(storedToken);

      try {
        let activeToken = storedToken;
        if (!activeToken) {
          const refreshed = await authService.refresh();
          activeToken = refreshed.accessToken;
          storeAccessToken(activeToken);
        }
        if (isMounted) await refreshUser();
      } catch {
        if (isMounted) {
          setUser(null);
          storeAccessToken(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void hydrateSession();
    return () => {
      isMounted = false;
    };
  }, [refreshUser, storeAccessToken]);

  const setSession = useCallback(
    (session: {
      user: AuthUser;
      accessToken: string;
      activeOrganizationId?: string | null;
    }) => {
      setUser(session.user);
      storeAccessToken(session.accessToken);
      storeActiveOrganization(session.activeOrganizationId ?? null);
      setIsLoading(false);
    },
    [storeAccessToken, storeActiveOrganization],
  );

  const clearSession = useCallback(() => {
    setUser(null);
    storeAccessToken(null);
    storeActiveOrganization(null);
    setIsLoading(false);
  }, [storeAccessToken, storeActiveOrganization]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!user) return false;
      const isPlatformOnlyRole =
        user.roleName === "Platform Super Admin" ||
        user.roleName === "Super Admin";
      if (
        isPlatformOnlyRole &&
        CUSTOMER_OPERATION_PERMISSION_PREFIXES.some((prefix) =>
          permission.startsWith(prefix),
        )
      ) {
        return false;
      }
      if (
        isPlatformOnlyRole &&
        PROTECTED_PLATFORM_ROLE_PERMISSIONS.has(permission)
      ) {
        return true;
      }
      return user.permissions.includes(permission);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      activeOrganizationId,
      isAuthenticated: Boolean(user && accessToken),
      isLoading,
      setSession,
      clearSession,
      refreshUser,
      hasPermission,
    }),
    [
      accessToken,
      activeOrganizationId,
      clearSession,
      hasPermission,
      isLoading,
      refreshUser,
      setSession,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
