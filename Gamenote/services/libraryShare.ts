import type {Session} from "@supabase/supabase-js";
import {requireSession, supabase} from "./supabase";

export const SHARE_SCOPES = ["none", "library", "all"] as const;
export type ShareScope = typeof SHARE_SCOPES[number];
export type ShareSettings = {username: string | null; share_scope: ShareScope};
const RESERVED_USERNAMES = [
    "library", "games", "groups", "stats", "profile", "login", "register", "shared", "privacy", "tos",
    "about", "contact", "add-game", "game", "edit-game", "api-games", "theme-settings", "reset-password",
    "importers", "u", "api", "assets", "admin", "support", "www", "app",
];

export function normalizeUsername(value: string) {
    return value.trim().toLowerCase();
}

export function usernameError(username: string) {
    if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(username)) return "libraryShare.invalid";
    if (RESERVED_USERNAMES.includes(username)) return "libraryShare.reserved";
    return "";
}

export function publicProfileUrl(saved: ShareSettings | null, scope: ShareScope) {
    if (!saved?.username || scope === "none" || scope !== saved.share_scope) return "";
    return `https://gamenote.eu/${saved.username}`;
}

export async function loadShareSettings(userId: string, signal?: AbortSignal): Promise<ShareSettings> {
    let request = supabase.from("library_shares").select("username,share_scope").eq("user_id", userId);
    if (signal) request = request.abortSignal(signal);
    const {data, error} = await request.maybeSingle();
    if (error) throw new Error("libraryShare.loadError");
    return data ?? {username: null, share_scope: "none"};
}

export async function saveShareSettings(session: Session, saved: ShareSettings, username: string, scope: ShareScope): Promise<ShareSettings> {
    let proposedUsername = null;
    if (!saved.username && scope !== "none") {
        proposedUsername = normalizeUsername(username);
        const validationError = usernameError(proposedUsername);
        if (validationError) throw new Error(validationError);
        const {data, error} = await supabase.rpc("check_library_username", {p_username: proposedUsername});
        if (error) throw new Error("libraryShare.checkError");
        if (data?.available !== true) throw new Error("libraryShare.taken");
    }
    await requireSession(session);
    const {data, error} = await supabase.rpc("save_library_share", {
        p_username: proposedUsername, p_scope: scope,
    });
    if (error?.code === "23505") throw new Error("libraryShare.taken");
    if (error || !data) throw new Error("libraryShare.saveError");
    return data;
}
