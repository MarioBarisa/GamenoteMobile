import {uuid} from "expo";
import type {Game} from "@/common/Game";
import type {GameGroup, Group} from "@/common/groups";
import {editLocalDocument, getLocalState, localGameFields, localImageUrl, localUuid, type LocalProfile, type MirrorEntry} from "@/services/localData";
import {supabase} from "@/services/supabase";
import {supabaseRowToGame} from "@/services/userGameRows";

type CloudLibrary = {games: (Game & {db_id: string})[]; groups: Group[]; links: GameGroup[]};

async function readRows(table: string, userId: string) {
    const size = 500;
    const rows = [];
    let cursor: string | undefined;
    for (;;) {
        const page = supabase.from(table).select("*").eq("user_id", userId).order("id").limit(size);
        const {data, error} = await (cursor ? page.gt("id", cursor) : page);
        if (error) throw error;
        rows.push(...data);
        if (data.length < size) return rows;
        cursor = data[data.length - 1].id;
    }
}

async function readCloudLibrary(userId: string): Promise<CloudLibrary> {
    const [games, groups, links] = await Promise.all([
        readRows("games", userId), readRows("groups", userId), readRows("game_groups", userId),
    ]);
    return {games: games.map(row => ({...supabaseRowToGame(row), db_id: row.id})), groups, links};
}

function reconcile<T extends object>(
    records: T[], idOf: (record: T) => string, entries: Record<string, MirrorEntry>,
    remote: {id: string; record: Omit<T, "id" | "db_id">}[], create: (id: string, record: Omit<T, "id" | "db_id">) => T,
) {
    const byId = new Map(records.map(record => [idOf(record), record]));
    const incoming = new Set(remote.map(item => item.id));
    for (const [key, entry] of Object.entries(entries)) {
        if (incoming.has(key)) continue;
        byId.delete(entry.id);
        delete entries[key];
    }
    for (const item of remote) {
        const entry = entries[item.id];
        const version = uuid.v5(JSON.stringify(item.record), uuid.namespace.url);
        if (entry?.version === version) continue;
        const id = entry?.id ?? localUuid();
        entries[item.id] = {id, version};
        byId.set(id, create(id, item.record));
    }
    return [...byId.values()];
}

export async function syncLocalMirror(userId: string, isCurrent: () => boolean, initialProfile?: LocalProfile) {
    const {document, resetRevision} = getLocalState();
    if (!isCurrent() || (!initialProfile && !document?.mirrors?.[userId]?.enabled)) return;
    const library = await readCloudLibrary(userId);
    if (!isCurrent()) return;
    await editLocalDocument(document => {
        if (!isCurrent() || getLocalState().resetRevision !== resetRevision) return;
        const mirror = document.mirrors?.[userId] ?? {enabled: false, games: {}, groups: {}, links: {}};
        if (!initialProfile && !mirror.enabled) return;
        if (initialProfile && !Object.keys(document.mirrors ?? {}).length) {
            document.profile = {
                name: initialProfile.name.trim() || document.profile.name,
                profileUrl: localImageUrl(initialProfile.profileUrl) ?? document.profile.profileUrl,
            };
        }
        mirror.enabled = true;
        document.mirrors = {...document.mirrors, [userId]: mirror};
        document.games = reconcile(document.games, game => game.db_id, mirror.games,
            library.games.map(game => ({id: game.db_id, record: localGameFields(game)})),
            (db_id, fields) => ({...fields, db_id}));
        document.groups = reconcile(document.groups, group => group.id, mirror.groups,
            library.groups.map(({id, name, type, rating, created_at, user_notes}) => ({
                id, record: {name, type, rating, created_at, user_notes},
            })), (id, fields) => ({...fields, id})).sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
        document.game_groups = reconcile(document.game_groups, link => link.id, mirror.links,
            library.links.flatMap(link => {
                const game_id = mirror.games[link.game_id]?.id;
                const group_id = mirror.groups[link.group_id]?.id;
                return game_id && group_id ? [{id: link.id, record: {game_id, group_id}}] : [];
            }), (id, fields) => ({...fields, id}));
        const gameIds = new Set(document.games.map(game => game.db_id));
        const groupIds = new Set(document.groups.map(group => group.id));
        document.game_groups = document.game_groups.filter(link => gameIds.has(link.game_id) && groupIds.has(link.group_id));
    });
}

export function disableLocalMirror(userId: string) {
    return editLocalDocument(document => {
        const mirror = document.mirrors?.[userId];
        if (mirror) mirror.enabled = false;
    });
}
