import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const BASE_URL: string = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8080';
const AJAX_HEADER = { 'X-Requested-With': 'XMLHttpRequest' };

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;
const CHECK_EVERY_MS = 15_000; // how often we look at the session
const REFRESH_AT_MOST_EVERY_MS = 60_000; // while the user is active, refresh at most once a minute
const CHANNEL_NAME = 'pharmacom-auth';

export interface SessionUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  city: string;
}

export interface AuthPayload {
  accessToken: string;
  expiresInSeconds: number;
  user: SessionUser;
}

type Status = 'loading' | 'authenticated' | 'anonymous';
type RefreshResult = { kind: 'ok'; payload: AuthPayload } | { kind: 'denied' } | { kind: 'error' };

/* ------------------------------------------------------------------ */
/* Refresh call. The refresh token lives in an HttpOnly cookie, so    */
/* this code never sees it: the browser attaches it automatically.    */
/* ------------------------------------------------------------------ */

let inflight: Promise<RefreshResult> | null = null;

// Only one refresh at a time across all tabs. The cookie is rotated on every refresh,
// so two simultaneous refreshes with the same cookie would look like token theft.
const withLock = <T,>(fn: () => Promise<T>): Promise<T> =>
  typeof navigator !== 'undefined' && navigator.locks
    ? navigator.locks.request('pharmacom-refresh', fn)
    : fn();

export function refreshSession(): Promise<RefreshResult> {
  if (!inflight) {
    inflight = withLock(async (): Promise<RefreshResult> => {
      try {
        const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: AJAX_HEADER,
        });
        if (res.ok) return { kind: 'ok', payload: (await res.json()) as AuthPayload };
        return res.status === 401 || res.status === 403 ? { kind: 'denied' } : { kind: 'error' };
      } catch {
        return { kind: 'error' }; // network problem: don't log the user out because of it
      }
    }).finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

/* ------------------------------------------------------------------ */

interface AuthContextValue {
  status: Status;
  isAuthenticated: boolean;
  user: SessionUser | null;
  /** Call after a successful /login response. */
  signIn: (payload: AuthPayload) => void;
  signOut: () => Promise<void>;
  /** fetch() for protected endpoints: adds the access token, retries once after a refresh on 401. */
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);

  // The access token lives ONLY in memory: not in localStorage, not in a cookie.
  const tokenRef = useRef<string | null>(null);
  const expiresAtRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const activeRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const apply = useCallback((p: AuthPayload) => {
    tokenRef.current = p.accessToken;
    expiresAtRef.current = Date.now() + p.expiresInSeconds * 1000;
    lastRefreshRef.current = Date.now();
    activeRef.current = false;
    setUser((prev) => (prev && prev.id === p.user.id ? prev : p.user));
    setStatus('authenticated');
  }, []);

  const clear = useCallback(() => {
    tokenRef.current = null;
    expiresAtRef.current = 0;
    setUser(null);
    setStatus('anonymous');
  }, []);

  // 1) On page load the memory is empty, so try to restore the session from the refresh cookie.
  useEffect(() => {
    let cancelled = false;
    refreshSession().then((r) => {
      if (cancelled) return;
      if (r.kind === 'ok') apply(r.payload);
      else clear();
    });
    return () => {
      cancelled = true;
    };
  }, [apply, clear]);

  // 2) While signed in: watch for activity, refresh the token, and end the session when it runs out.
  useEffect(() => {
    if (status !== 'authenticated') return;

    const onActivity = () => {
      activeRef.current = true;
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    const timer = window.setInterval(async () => {
      const now = Date.now();
      if (now >= expiresAtRef.current) {
        clear(); // no activity for the whole period: the token expired
        return;
      }
      if (activeRef.current && now - lastRefreshRef.current >= REFRESH_AT_MOST_EVERY_MS) {
        activeRef.current = false;
        const r = await refreshSession();
        if (r.kind === 'ok') apply(r.payload);
        else if (r.kind === 'denied') clear();
      }
    }, CHECK_EVERY_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
      window.clearInterval(timer);
    };
  }, [status, apply, clear]);

  // 3) Logging out in one tab logs out the others.
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (e) => {
      if (e.data === 'logout') clear();
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [clear]);

  const signOut = useCallback(async () => {
    try {
      await fetch(`${BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: AJAX_HEADER,
      });
    } catch {
      /* even if the server is unreachable we still drop the local session */
    }
    channelRef.current?.postMessage('logout');
    clear();
  }, [clear]);

  const authFetch = useCallback(
    async (input: string, init: RequestInit = {}) => {
      const url = input.startsWith('http') ? input : `${BASE_URL}${input}`;
      const send = () => {
        const headers = new Headers(init.headers);
        if (tokenRef.current) headers.set('Authorization', `Bearer ${tokenRef.current}`);
        return fetch(url, { ...init, headers, credentials: 'include' });
      };

      let res = await send();
      if (res.status === 401) {
        const r = await refreshSession();
        if (r.kind === 'ok') {
          apply(r.payload);
          res = await send();
        } else if (r.kind === 'denied') {
          clear();
        }
      }
      return res;
    },
    [apply, clear],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      user,
      signIn: apply,
      signOut,
      authFetch,
    }),
    [status, user, apply, signOut, authFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}