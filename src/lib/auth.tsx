import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "./supabase/client";

type AuthState = {
  isAuthenticated: boolean;
  isAuthReady: boolean;
  session: Session | null;
  user: User | null;
};

type AuthContextValue = AuthState & {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const getCurrentSession = async (): Promise<Session | null> => {
  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await getSupabaseClient().auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
};

export const signInWithGoogle = async () => {
  const redirectTo =
    typeof window === "undefined" ? undefined : window.location.href;

  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }
};

export const signOut = async () => {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await getSupabaseClient().auth.signOut();

  if (error) {
    throw error;
  }
};

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isAuthReady: !isSupabaseConfigured,
    session: null,
    user: null,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    getCurrentSession()
      .then((session) => {
        if (!isMounted) return;

        setAuthState({
          isAuthenticated: Boolean(session),
          isAuthReady: true,
          session,
          user: session?.user ?? null,
        });
      })
      .catch(() => {
        if (!isMounted) return;

        setAuthState({
          isAuthenticated: false,
          isAuthReady: true,
          session: null,
          user: null,
        });
      });

    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      setAuthState({
        isAuthenticated: Boolean(session),
        isAuthReady: true,
        session,
        user: session?.user ?? null,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...authState,
      signInWithGoogle,
      signOut,
    }),
    [authState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
};
