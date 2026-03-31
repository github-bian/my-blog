import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiJson } from "../lib/api";

export type AuthUser = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

type AuthState = {
  user: AuthUser;
  accessToken: string;
};

type AuthContextValue = {
  state: AuthState | null;
  isAuthed: boolean;
  login: (args: { email: string; password: string }) => Promise<void>;
  register: (args: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
};

const STORAGE_KEY = "auth_state_v1";

const AuthContext = createContext<AuthContextValue | null>(null);

function safeParseAuth(json: string | null): AuthState | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as any;
    if (!obj?.accessToken || !obj?.user?.id) return null;
    return obj as AuthState;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState | null>(() =>
    safeParseAuth(window.localStorage.getItem(STORAGE_KEY)),
  );

  useEffect(() => {
    if (!state) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const login = useCallback(async (args: { email: string; password: string }) => {
    type Resp = { user: AuthUser; accessToken: string };
    const data = await apiJson<Resp>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(args),
    });
    setState({ user: data.user, accessToken: data.accessToken });
  }, []);

  const register = useCallback(
    async (args: { email: string; password: string; displayName: string }) => {
      type Resp = { user: AuthUser; accessToken: string };
      const data = await apiJson<Resp>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(args),
      });
      setState({ user: data.user, accessToken: data.accessToken });
    },
    [],
  );

  const logout = useCallback(() => setState(null), []);

  const updateProfile = useCallback((updates: Partial<AuthUser>) => {
    setState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        user: { ...prev.user, ...updates },
      };
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      isAuthed: Boolean(state?.accessToken),
      login,
      register,
      logout,
      updateProfile,
    }),
    [state, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

