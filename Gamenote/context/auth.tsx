import {createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState} from "react";
import {AppState} from "react-native";
import {requireSession, supabase} from "@/services/supabase";
import type {Session, User} from "@supabase/supabase-js";
import * as supabaseAuth from "@/services/supabaseAuth";
import {sameSession, sessionClaims, sessionPhase, verifiedTotp} from "@/services/authSession";
import {isCloudSourceAvailable, useSettings} from "@/context/settings";
import {checkCurrentPassword, inspectSession, recoveryCodes, verifyTotp} from "@/services/mfa";

type Phase = "starting" | "checking" | "guest" | "mfa" | "ready" | "error";
type Snapshot = {phase: Phase; session: Session | null; user: User | null};
type PasswordResult = {success: boolean; error?: string};

function useAuthState() {
  const {activeSource, localSettingsLoaded} = useSettings();
  const cloudActive = localSettingsLoaded && activeSource === "cloud";
  const [source, setSource] = useState(activeSource);
  const [knownCloudUserId, setKnownCloudUserId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>({phase: "starting", session: null, user: null});
  const current = useRef(snapshot);
  if (source !== activeSource) {
    setSource(activeSource);
    setSnapshot({phase: "starting", session: null, user: null});
  }
  const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const recoveredSession = useRef<Session | null>(null);
  const signingIn = useRef(false);
  const profileSession = useRef<Session | null>(null);

  const publish = useCallback((next: Snapshot) => {
    if (!isCloudSourceAvailable()) return;
    current.current = next;
    if (next.phase === "ready" || next.phase === "guest") setKnownCloudUserId(next.user?.id ?? null);
    setSnapshot(next);
  }, []);

  const checkSession = useCallback((session: Session | null) => {
    if (!isCloudSourceAvailable()) return;
    clearTimeout(timer.current);
    const check = ++revision.current;
    if (!session) {
      recoveredSession.current = null;
      profileSession.current = null;
      publish({phase: "guest", session: null, user: null});
      return;
    }

    const previous = current.current;
    const same = sameSession(previous.session, session);
    if (!same) {
      recoveredSession.current = null;
      profileSession.current = signingIn.current ? session : null;
    }
    const nextAal = sessionClaims(session).aal;
    const hasPendingTotp = nextAal === "aal1" && verifiedTotp(session.user).length > 0;
    const keepReady = same && previous.phase === "ready" && previous.session && !hasPendingTotp
        && (sessionClaims(previous.session).aal === nextAal || nextAal === "aal2");
    const keepMfa = same && previous.phase === "mfa";
    if (keepReady || keepMfa) {
      publish({...previous, session});
    } else {
      publish({phase: previous.phase === "starting" ? "starting" : "checking", session, user: null});
    }

    // Supabase pozivi izvan auth callbacka.
    timer.current = setTimeout(async () => {
      const timeout = setTimeout(() => {
        if (check !== revision.current) return;
        revision.current++;
        if (!keepReady) publish({phase: "error", session, user: null});
      }, 10000);
      try {
        const user = await inspectSession(session);
        if (check !== revision.current) return;
        publish({phase: sessionPhase(session, user), session, user});
      } catch {
        if (check === revision.current && !keepReady) publish({phase: "error", session, user: null});
      } finally {
        clearTimeout(timeout);
      }
    }, 0);
  }, [publish]);

  useEffect(() => {
    if (!cloudActive) return;
    current.current = {phase: "starting", session: null, user: null};
    let active = true;
    const initializing = supabase.auth.initialize();
    const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
      checkSession(session);
    });
    initializing.then(() => {
      if (active && isCloudSourceAvailable()) return supabase.auth.startAutoRefresh();
    }).catch(() => {});
    const watchdog = setTimeout(() => {
      if (current.current.phase === "starting" && !current.current.session) checkSession(null);
    }, 10000);
    const appState = AppState.addEventListener("change", state => {
      if (state === "active" && current.current.session) checkSession(current.current.session);
    });
    return () => {
      active = false;
      revision.current++;
      void supabase.auth.stopAutoRefresh();
      clearTimeout(watchdog);
      clearTimeout(timer.current);
      appState.remove();
      subscription.unsubscribe();
    };
  }, [checkSession, cloudActive]);

  const refreshSecurity = useCallback(async () => {
    if (!isCloudSourceAvailable()) return;
    const expected = current.current.session;
    if (!expected) return;
    checkSession(await requireSession(expected));
  }, [checkSession]);

  const pendingSession = cloudActive && snapshot.phase === "mfa" ? snapshot.session : null;
  const session = cloudActive && snapshot.phase === "ready" ? snapshot.session : null;
  const user = session ? snapshot.user : null;
  const totpFactors = cloudActive && snapshot.user ? verifiedTotp(snapshot.user) : [];

  const verifySignIn = async (factorId: string, code: string) => {
    if (!pendingSession || !totpFactors.some(factor => factor.id === factorId)) throw new Error("session");
    await verifyTotp(pendingSession, factorId, code);
  };

  const recoverSignIn = async (code: string) => {
    if (!pendingSession) throw new Error("session");
    if (!sameSession(recoveredSession.current, pendingSession)) {
      const result = await recoveryCodes(pendingSession, {action: "recover", code});
      if (!result.recovered) throw new Error("unavailable");
      await requireSession(pendingSession);
      recoveredSession.current = pendingSession;
    }
    const {data, error} = await supabase.auth.refreshSession();
    if (error || !data.session || !sameSession(pendingSession, data.session)) throw new Error("recoveryRefresh");
  };

  const cancelSignIn = async () => {
    if (!snapshot.session) return;
    await requireSession(snapshot.session);
    const {error} = await supabase.auth.signOut({scope: "local"});
    if (error) throw error;
  };

  const updatePassword = async (
    password: string, currentPassword: string, cancelled: () => boolean = () => false,
  ): Promise<PasswordResult> => {
    if (!session || !currentPassword || cancelled()) return {success: false};
    await requireSession(session);
    await checkCurrentPassword(session, currentPassword);
    if (cancelled()) return {success: false};
    return supabaseAuth.updatePassword(password, currentPassword);
  };

  const signIn = async (email: string, password: string) => {
    if (signingIn.current) return {success: false, error: undefined};
    signingIn.current = true;
    try {
      return await supabaseAuth.signIn(email, password);
    } finally {
      signingIn.current = false;
    }
  };

  const acknowledgeProfile = useCallback(() => {
    recoveredSession.current = null;
    profileSession.current = null;
  }, []);

  return {
    loggedIn: Boolean(session),
    user,
    session,
    username: user?.user_metadata?.name ?? user?.email?.split("@")[0] ?? "",
    avatarUrl: user?.user_metadata?.avatar_url ?? "",
    phase: activeSource === "local" ? "guest" as const : snapshot.phase,
    knownCloudUserId,
    totpFactors,
    refreshSecurity,
    verifySignIn,
    recoverSignIn,
    cancelSignIn,
    updatePassword,
    openRecoveredProfile: sameSession(recoveredSession.current, session),
    openProfileAfterSignIn: sameSession(profileSession.current, session),
    acknowledgeProfile,
    signIn,
    signUp: supabaseAuth.signUp,
    signOut: supabaseAuth.signOut,
    resetPassword: supabaseAuth.resetPassword,
    updateUsername: supabaseAuth.updateUsername,
    updateAvatar: supabaseAuth.updateAvatar,
    deleteAccount: supabaseAuth.deleteAccount,
  };
}

const AuthContext = createContext<ReturnType<typeof useAuthState> | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
