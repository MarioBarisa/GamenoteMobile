import {createContext, ReactNode, useContext, useEffect, useMemo, useState} from "react";
import {supabase} from "@/services/supabase";
import {User, Session} from "@supabase/supabase-js";
import * as supabaseAuth from "@/services/supabaseAuth";

type AuthContextValue = {
  loggedIn: boolean;
  user: User | null;
  session: Session | null;
  username: string;
  avatarUrl: string;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; user?: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error: string }>;
  updateUsername: (name: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatar: (url: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({children}: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({data: {session: s}}) => {
      setSession(s);
      if (s) {
        const {data: {user: freshUser}} = await supabase.auth.getUser();
        setUser(freshUser ?? s.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const username = user?.user_metadata?.name ?? user?.email?.split('@')[0] ?? '';
  const avatarUrl = user?.user_metadata?.avatar_url ?? '';

  const loggedIn = !!session;

  const signIn = async (email: string, password: string) => {
    return await supabaseAuth.signIn(email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    return await supabaseAuth.signUp(email, password, name);
  };

  const signOut = async () => {
    await supabaseAuth.signOut();
  };

  const updateUsername = async (name: string) => {
    return await supabaseAuth.updateUsername(name);
  };

  const updateAvatar = async (url: string) => {
    return await supabaseAuth.updateAvatar(url);
  };

  const deleteAccount = async () => {
    return await supabaseAuth.deleteAccount();
  };

  const value = useMemo(
    () => ({
      loggedIn,
      user,
      session,
      username,
      avatarUrl,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword: supabaseAuth.resetPassword,
      updatePassword: supabaseAuth.updatePassword,
      updateUsername,
      updateAvatar,
      deleteAccount,
    }),
    [loggedIn, user, session, username, avatarUrl, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
