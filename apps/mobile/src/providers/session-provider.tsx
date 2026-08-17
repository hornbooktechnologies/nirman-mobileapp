import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { apiRequest } from '../lib/api';
import {
  clearStoredSession,
  createMobileSession,
  getStoredActiveProjectId,
  getStoredSession,
  mergeSessionPayload,
  normalizeStoredSession,
  saveStoredActiveProjectId,
  saveStoredSession,
  type LoginResponseData,
  type MobileSession,
  type SessionResponseData,
} from '../lib/auth';

type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
};

type SignInCredentials = {
  email: string;
  password: string;
};

type SessionContextValue = {
  isLoading: boolean;
  isRefreshing: boolean;
  session: MobileSession | null;
  signIn: (credentials: SignInCredentials) => Promise<void>;
  refreshSession: () => Promise<void>;
  switchActiveProject: (projectId: string) => Promise<void>;
  switchActiveOrganization: (organizationId: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [session, setSession] = useState<MobileSession | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadingFallback = setTimeout(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    }, 1200);

    Promise.all([getStoredSession(), getStoredActiveProjectId()])
      .then(([storedSession, storedProjectId]) => {
        if (isMounted) {
          if (storedSession) {
            const normalizedSession = normalizeStoredSession(storedSession);
            const hydratedSession = {
              ...normalizedSession,
              activeProjectId:
                storedProjectId &&
                normalizedSession.projectAccess.projects.some(
                  (project) => project.id === storedProjectId,
                )
                  ? storedProjectId
                  : normalizedSession.activeProjectId,
            };
            setSession(hydratedSession);
            const organizationQuery = hydratedSession.activeOrganization
              ? `?organizationId=${encodeURIComponent(hydratedSession.activeOrganization.id)}`
              : '';
            void apiRequest<ApiEnvelope<SessionResponseData>>(
              `/auth/session${organizationQuery}`,
              {},
              { accessToken: hydratedSession.accessToken },
            )
              .then(async (response) => {
                if (!isMounted) return;
                const refreshedSession = mergeSessionPayload(
                  hydratedSession,
                  response.data,
                  storedProjectId,
                );
                await saveStoredSession(refreshedSession);
                await saveStoredActiveProjectId(
                  refreshedSession.activeProjectId,
                );
                if (isMounted) setSession(refreshedSession);
              })
              .catch(() => {
                // Keep the normalized cached session for recoverable offline use.
              });
          } else {
            setSession(null);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          clearTimeout(loadingFallback);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(loadingFallback);
    };
  }, []);

  const signIn = useCallback(async (credentials: SignInCredentials) => {
    const response = await apiRequest<ApiEnvelope<LoginResponseData>>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(credentials),
      },
    );
    const storedProjectId = await getStoredActiveProjectId();
    const nextSession = createMobileSession(response.data, storedProjectId);

    await saveStoredSession(nextSession);
    await saveStoredActiveProjectId(nextSession.activeProjectId);
    setSession(nextSession);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!session) return;

    setIsRefreshing(true);
    try {
      const organizationQuery = session.activeOrganization
        ? `?organizationId=${encodeURIComponent(session.activeOrganization.id)}`
        : '';
      const response = await apiRequest<ApiEnvelope<SessionResponseData>>(
        `/auth/session${organizationQuery}`,
        {},
        { accessToken: session.accessToken },
      );
      const storedProjectId = await getStoredActiveProjectId();
      const nextSession = mergeSessionPayload(
        session,
        response.data,
        storedProjectId,
      );

      await saveStoredSession(nextSession);
      await saveStoredActiveProjectId(nextSession.activeProjectId);
      setSession(nextSession);
    } finally {
      setIsRefreshing(false);
    }
  }, [session]);

  const switchActiveProject = useCallback(
    async (projectId: string) => {
      if (!session) return;
      const project = session.projectAccess.projects.find(
        (candidate) =>
          candidate.id === projectId &&
          (candidate.status === 'ACTIVE' ||
            candidate.status === 'DRAFT' ||
            candidate.status === 'ON_HOLD'),
      );

      if (!project) {
        throw new Error('Project is not available as a working context');
      }

      const nextSession: MobileSession = {
        ...session,
        activeProjectId: project.id,
        projectAccess: {
          ...session.projectAccess,
          activeProjectId: project.id,
        },
      };

      await saveStoredSession(nextSession);
      await saveStoredActiveProjectId(project.id);
      setSession(nextSession);
    },
    [session],
  );

  const switchActiveOrganization = useCallback(
    async (organizationId: string) => {
      if (!session) return;
      const membership = session.memberships.find(
        (candidate) =>
          candidate.organizationId === organizationId &&
          candidate.memberStatus === 'ACTIVE',
      );
      if (!membership) {
        throw new Error('Organization membership is not active');
      }
      await apiRequest<ApiEnvelope<{ activeOrganizationId: string }>>(
        `/organizations/${organizationId}/switch`,
        { method: 'POST' },
        { accessToken: session.accessToken },
      );
      const response = await apiRequest<ApiEnvelope<SessionResponseData>>(
        `/auth/session?organizationId=${encodeURIComponent(organizationId)}`,
        {},
        { accessToken: session.accessToken },
      );
      const nextSession = mergeSessionPayload(session, response.data, null);
      await saveStoredSession(nextSession);
      await saveStoredActiveProjectId(nextSession.activeProjectId);
      setSession(nextSession);
    },
    [session],
  );

  const signOut = useCallback(async () => {
    await clearStoredSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      isLoading,
      isRefreshing,
      session,
      signIn,
      refreshSession,
      switchActiveProject,
      switchActiveOrganization,
      signOut,
    }),
    [
      isLoading,
      isRefreshing,
      session,
      signIn,
      refreshSession,
      switchActiveProject,
      switchActiveOrganization,
      signOut,
    ],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used inside SessionProvider');
  }

  return context;
}
