import {uuid} from "expo";
import * as FileSystem from "expo-file-system/legacy";
import type {Game} from "@/common/Game";
import type {GameGroup, Group} from "@/common/groups";
import {PLATFORM_ICON_KEYS} from "@/constants/platformIcons";

export const LOCAL_PLATFORMS = Object.keys(PLATFORM_ICON_KEYS).filter(name =>
    !["PlayStation", "Xbox", "Nintendo"].includes(name),
);
export const LOCAL_USER_ID = "local";

export type LocalProfile = {name: string; profileUrl: string};
export type LocalGame = Game & {db_id: string};
export type LocalGroup = Omit<Group, "user_id">;
export type LocalGameGroup = Pick<GameGroup, "id" | "game_id" | "group_id">;
export type MirrorEntry = {id: string; version: string};
export type LocalMirror = {
    enabled: boolean;
    games: Record<string, MirrorEntry>;
    groups: Record<string, MirrorEntry>;
    links: Record<string, MirrorEntry>;
};
export type LocalDocument = {
    schemaVersion: 1;
    profile: LocalProfile;
    platforms: string[];
    games: LocalGame[];
    groups: LocalGroup[];
    game_groups: LocalGameGroup[];
    platformColors?: Record<string, string>;
    mirrors?: Record<string, LocalMirror>;
};

type LocalState = {document: LocalDocument | null; size: number; error: boolean; resetRevision: number};
let state: LocalState = {document: null, size: 0, error: false, resetRevision: 0};
let queue: Promise<unknown> = Promise.resolve();
const listeners = new Set<() => void>();

export function localDocumentUri() {
    if (!FileSystem.documentDirectory) throw new Error("localStorage");
    return `${FileSystem.documentDirectory}gamenote-local.json`;
}

export function localUuid() {
    return globalThis.crypto?.randomUUID?.() ?? uuid.v4();
}

export function httpUrl(value: string | undefined) {
    if (!value || !/^https?:\/\/[^\s/]+/i.test(value)) return undefined;
    try {
        const url = new URL(value);
        return url.hostname && !url.username && !url.password ? url : undefined;
    } catch {
        return undefined;
    }
}

export function localImageUrl(value: string | undefined) {
    const url = httpUrl(value);
    if (!url || /(^|\.)gamenote\.eu\.?$/i.test(url.hostname)) return undefined;
    return url.href;
}

export function localGameFields(game: Game): Game {
    return {
        title: game.title,
        game_id: game.game_id,
        platform: game.platform,
        genre: game.genre,
        status: game.status,
        rating: game.rating,
        metacriticScore: game.metacriticScore,
        esrbRating: game.esrbRating,
        releaseDate: game.releaseDate,
        webPage: game.webPage,
        about: game.about,
        series: game.series?.map(({id, name, released, background_image}) => ({
            id, name, released, background_image: httpUrl(background_image)?.href ?? "",
        })),
        notes: game.notes,
        publisher: game.publisher,
        image_url: httpUrl(game.image_url)?.href,
        background_image: httpUrl(game.background_image)?.href,
        screenshot_urls: game.screenshot_urls?.flatMap(value => httpUrl(value)?.href ?? []),
        play_time: game.play_time,
        start_date: game.start_date,
        end_date: game.end_date,
        progress_value: game.progress_value,
        progress_total: game.progress_total,
        progress_mode: game.progress_mode,
    };
}

export function getLocalState() {
    return state;
}

export function subscribeLocalData(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

function publish(next: LocalState) {
    state = next;
    for (const listener of listeners) listener();
}

function serialize<T>(task: () => Promise<T>) {
    const result = queue.then(task);
    queue = result.catch(() => undefined);
    return result;
}

function emptyDocument(): LocalDocument {
    return {
        schemaVersion: 1,
        profile: {name: "", profileUrl: ""},
        platforms: [...LOCAL_PLATFORMS],
        games: [], groups: [], game_groups: [],
    };
}

async function writeDocument(document: LocalDocument, content = JSON.stringify(document), resetRevision = state.resetRevision) {
    await FileSystem.writeAsStringAsync(localDocumentUri(), content);
    const size = new TextEncoder().encode(content).length;
    publish({document, size, error: false, resetRevision});
}

async function readDocument() {
    if (state.document) return state.document;
    try {
        const uri = localDocumentUri();
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) {
            const document = emptyDocument();
            await writeDocument(document);
            return document;
        }
        const document: LocalDocument = JSON.parse(await FileSystem.readAsStringAsync(uri));
        if (document?.schemaVersion !== 1 || typeof document.profile?.name !== "string" ||
            typeof document.profile?.profileUrl !== "string" || !Array.isArray(document.platforms) ||
            !Array.isArray(document.games) || !Array.isArray(document.groups) || !Array.isArray(document.game_groups)) {
            throw new Error("localDocument");
        }
        publish({...state, document, size: info.size, error: false});
        return document;
    } catch (error) {
        publish({...state, error: true});
        throw error;
    }
}

export function loadLocalData() {
    return serialize(readDocument);
}

export function deleteLocalProfile() {
    return serialize(() => writeDocument(emptyDocument(), undefined, state.resetRevision + 1));
}

export function editLocalDocument<T>(edit: (document: LocalDocument) => T) {
    return serialize(async () => {
        const previous = JSON.stringify(await readDocument());
        const document: LocalDocument = JSON.parse(previous);
        const result = edit(document);
        const content = JSON.stringify(document);
        if (content !== previous) await writeDocument(document, content);
        return result;
    });
}

export async function getLocalProfile() {
    return (await loadLocalData()).profile;
}

export function setLocalProfile(profile: LocalProfile) {
    return editLocalDocument(document => {
        document.profile = {name: profile.name.trim(), profileUrl: httpUrl(profile.profileUrl)?.href ?? ""};
    });
}

export async function getLocalPlatforms() {
    return (await loadLocalData()).platforms;
}

export function setLocalPlatforms(change: (platforms: string[]) => string[], color?: {name: string; value: string}) {
    return editLocalDocument(document => {
        document.platforms = [...new Set(change(document.platforms))];
        if (color) document.platformColors = {...document.platformColors, [color.name]: color.value};
    });
}

export async function listLocalGames() {
    return (await loadLocalData()).games;
}

function linkGame(document: LocalDocument, gameId: string, groupId: string) {
    if (document.game_groups.some(link => link.game_id === gameId && link.group_id === groupId)) return;
    if (!document.games.some(game => game.db_id === gameId) || !document.groups.some(group => group.id === groupId)) {
        throw new Error("localGroupLink");
    }
    document.game_groups.push({id: localUuid(), game_id: gameId, group_id: groupId});
}

export function addLocalGame(game: Game, groupIds: string[] = []) {
    return editLocalDocument(document => {
        const db_id = localUuid();
        const record = {...localGameFields(game), db_id, game_id: game.game_id || `local-${db_id}`};
        document.games.push(record);
        for (const groupId of groupIds) linkGame(document, db_id, groupId);
        return record;
    });
}

export function updateLocalGame(id: string, changes: Partial<Game>, groupChanges?: {add: string[]; remove: string[]}) {
    return editLocalDocument(document => {
        const index = document.games.findIndex(game => game.db_id === id);
        if (index < 0) throw new Error("localGame");
        document.games[index] = {...localGameFields({...document.games[index], ...changes}), db_id: id};
        if (groupChanges) {
            document.game_groups = document.game_groups.filter(link => link.game_id !== id || !groupChanges.remove.includes(link.group_id));
            for (const groupId of groupChanges.add) linkGame(document, id, groupId);
        }
    });
}

export function deleteLocalGame(id: string) {
    return editLocalDocument(document => {
        document.games = document.games.filter(game => game.db_id !== id);
        document.game_groups = document.game_groups.filter(link => link.game_id !== id);
    });
}

export async function listLocalGroups() {
    return (await loadLocalData()).groups;
}

export async function getLocalGroup(id: string) {
    return (await listLocalGroups()).find(group => group.id === id);
}

export function createLocalGroup(group: Pick<LocalGroup, "name" | "type" | "rating">, gameIds: string[] = []) {
    return editLocalDocument(document => {
        const created = {...group, type: group.type?.toLowerCase() ?? "collection", id: localUuid(), created_at: new Date().toISOString()};
        document.groups.unshift(created);
        for (const gameId of gameIds) linkGame(document, gameId, created.id);
        return created;
    });
}

export function updateLocalGroup(id: string, changes: Partial<LocalGroup>) {
    return editLocalDocument(document => {
        const group = document.groups.find(item => item.id === id);
        if (!group) throw new Error("localGroup");
        if (changes.name !== undefined) group.name = changes.name;
        if (changes.type !== undefined) group.type = changes.type?.toLowerCase() ?? null;
        if (changes.rating !== undefined) group.rating = changes.rating;
        if (changes.user_notes !== undefined) group.user_notes = changes.user_notes;
        return group;
    });
}

export function deleteLocalGroup(id: string) {
    return editLocalDocument(document => {
        document.groups = document.groups.filter(group => group.id !== id);
        document.game_groups = document.game_groups.filter(link => link.group_id !== id);
    });
}

export async function listLocalGroupGames(groupId: string) {
    return (await loadLocalData()).game_groups.filter(link => link.group_id === groupId);
}

export async function listLocalGameGroups(gameId: string) {
    return (await loadLocalData()).game_groups.filter(link => link.game_id === gameId);
}

export function addLocalGameToGroup(gameId: string, groupId: string) {
    return editLocalDocument(document => linkGame(document, gameId, groupId));
}

export function removeLocalGameFromGroup(gameId: string, groupId: string) {
    return editLocalDocument(document => {
        document.game_groups = document.game_groups.filter(link => link.game_id !== gameId || link.group_id !== groupId);
    });
}
