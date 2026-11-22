import type {Session} from "@supabase/supabase-js";
import {createPasswordCheckClient, requireSession, supabase} from "./supabase";
import {sameSession, sessionClaims, verifiedTotp} from "./authSession";

type RecoveryRequest =
    | {action: "status"}
    | {action: "issue" | "clear"; factorId: string}
    | {action: "recover"; code: string};

const TOTP_NAME = "Gamenote";

export async function checkCurrentPassword(session: Session, password: string) {
    if (!session.user.email) throw new Error("session");
    const {auth} = createPasswordCheckClient();
    const {data, error} = await auth.signInWithPassword({email: session.user.email, password});
    if (error) throw error;
    try {
        if (data.user?.id !== session.user.id) throw new Error("session");
    } finally {
        await auth.signOut({scope: "local"});
    }
    await requireSession(session);
}

export async function verifyTotp(session: Session, factorId: string, code: string) {
    await requireSession(session);
    const challenge = await supabase.auth.mfa.challenge({factorId});
    if (challenge.error) throw challenge.error;
    await requireSession(session);
    const result = await supabase.auth.mfa.verify({factorId, challengeId: challenge.data.id, code});
    if (result.error) throw result.error;
    if (!sameSession(session, result.data) || sessionClaims(result.data).aal !== "aal2") {
        throw new Error("session");
    }
    return result.data;
}

export async function recoveryCodes(expected: Session, request: RecoveryRequest) {
    const session = await requireSession(expected);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch("https://gamenote.eu/.netlify/functions/mfa-recovery", {
            method: "POST",
            headers: {Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json"},
            body: JSON.stringify(request),
            signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as {codes?: string[]; hasCodes?: boolean; recovered?: boolean; cleared?: boolean};
    } finally {
        clearTimeout(timeout);
    }
}

export async function inspectSession(session: Session) {
    const {data: {user}, error} = await supabase.auth.getUser(session.access_token);
    if (error || !user || user.id !== session.user.id) throw error ?? new Error("session");
    return user;
}

export async function enrollTotp(session: Session, cancelled: () => boolean) {
    const status = await recoveryCodes(session, {action: "status"}).catch(() => null);
    if (typeof status?.hasCodes !== "boolean") throw new Error("recoveryUnavailable");
    const current = await requireSession(session);
    const user = await inspectSession(current);
    if (verifiedTotp(user).length) throw new Error("factor");
    for (const factor of user.factors ?? []) {
        if (cancelled()) return null;
        if (factor.factor_type === "totp" && factor.status === "unverified" && factor.friendly_name === TOTP_NAME) {
            await removeUnverifiedFactor(session, factor.id);
        }
    }
    await requireSession(session);
    if (cancelled()) return null;
    const result = await supabase.auth.mfa.enroll({factorType: "totp", friendlyName: TOTP_NAME, issuer: "gamenote.eu"});
    if (result.error) throw result.error;
    return result.data;
}

export async function removeTotp(session: Session, factorId: string) {
    await requireSession(session);
    const {error} = await supabase.auth.mfa.unenroll({factorId});
    if (error) throw error;
}

export async function removeUnverifiedFactor(session: Session, factorId: string) {
    const current = await requireSession(session);
    const user = await inspectSession(current);
    if (!user.factors?.some(factor => factor.id === factorId && factor.status === "unverified")) return;
    await removeTotp(session, factorId);
}

export function isInvalidTotp(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error
        && (error.code === "mfa_verification_failed" || error.code === "mfa_verification_rejected"
            || error.code === "mfa_challenge_expired");
}
