import type {Session, User} from "@supabase/supabase-js";

export function sessionClaims(session: Session) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let bits = 0;
    let buffer = 0;
    let payload = "";
    for (const character of session.access_token.split(".")[1] ?? "") {
        const digit = alphabet.indexOf(character);
        if (digit === -1) break;
        buffer = (buffer << 6) | digit;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            payload += String.fromCharCode((buffer >> bits) & 255);
        }
    }
    try {
        return JSON.parse(payload) as {session_id?: string; aal?: string};
    } catch {
        return {};
    }
}

export function sameSession(first: Session | null, second: Session | null) {
    if (!first || !second || first.user.id !== second.user.id) return false;
    const id = sessionClaims(first).session_id;
    return Boolean(id && id === sessionClaims(second).session_id);
}

export function verifiedTotp(user: User) {
    return (user.factors ?? []).filter(factor => factor.factor_type === "totp" && factor.status === "verified");
}

export function sessionPhase(session: Session, user: User) {
    const {aal, session_id} = sessionClaims(session);
    if (!session_id || user.id !== session.user.id || (aal !== "aal1" && aal !== "aal2")) {
        throw new Error("session");
    }
    return aal === "aal1" && verifiedTotp(user).length > 0 ? "mfa" : "ready";
}
