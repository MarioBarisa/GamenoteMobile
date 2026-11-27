import type {Game} from "@/common/Game";
import type {supabase} from "@/services/supabase";
import {fetchUserRows, supabaseRowToGame} from "@/services/userGameRows";

type GamesPatch = (games: Game[]) => Game[];
type Snapshot = {games: Game[]; isLoading: boolean; error: string | null; hasLoaded: boolean};
type Entry = {
    games: Game[];
    snapshot: Snapshot;
    fetchedAt: number | null;
    connected: boolean;
    controller: AbortController;
    pending?: Promise<boolean>;
    outdated: boolean;
    deletedDuringRead: Set<string>;
    optimistic: Set<GamesPatch>;
    writes: Promise<void>;
    changes: Map<string, () => void>;
};

const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();
let channelSequence = 0;

function getEntry(userId: string): Entry {
    const cached = cache.get(userId);
    if (cached) return cached;
    const games: Game[] = [];
    const entry: Entry = {
        games, snapshot: {games, isLoading: true, error: null, hasLoaded: false}, fetchedAt: null, connected: false,
        controller: new AbortController(), outdated: false, optimistic: new Set(),
        writes: Promise.resolve(), changes: new Map(), deletedDuringRead: new Set(),
    };
    cache.set(userId, entry);
    return entry;
}

export function getGamesSnapshot(userId: string) {
    return cache.get(userId)?.snapshot;
}

export function onGamesChanged(userId: string, listener: () => void) {
    const subscribers = listeners.get(userId) ?? new Set();
    listeners.set(userId, subscribers);
    subscribers.add(listener);
    return () => {
        subscribers.delete(listener);
        if (!subscribers.size) listeners.delete(userId);
    };
}

function notify(userId: string) {
    for (const listener of listeners.get(userId) ?? []) listener();
}

function publish(userId: string, entry: Entry, status?: Partial<Omit<Snapshot, "games">>) {
    let games = entry.games;
    for (const patch of entry.optimistic) games = patch(games);
    entry.snapshot = {...entry.snapshot, ...status, games};
    notify(userId);
}

export function getFreshGames(userId: string, {maxAge = 300_000, requireRealtime = true} = {}) {
    const entry = cache.get(userId);
    if (!entry || entry.fetchedAt === null || Date.now() - entry.fetchedAt >= maxAge) return null;
    return !requireRealtime || entry.connected ? entry.snapshot.games : null;
}

export function needsForegroundRefresh(userId: string) {
    const entry = cache.get(userId);
    return Boolean(entry && !entry.pending && (entry.fetchedAt === null ||
        (!entry.connected && !getFreshGames(userId, {maxAge: 60_000, requireRealtime: false}))));
}

function sameGame(first: Game | undefined, second: Game) {
    return first !== undefined && JSON.stringify(first) === JSON.stringify(second);
}

export function loadGames(database: typeof supabase, userId: string, {force = false, silent = false} = {}) {
    const entry = getEntry(userId);
    if (entry.pending) return entry.pending;
    if (!force && getFreshGames(userId, {requireRealtime: false})) return Promise.resolve(false);

    const {signal} = entry.controller;
    entry.pending = Promise.resolve().then(async () => {
        try {
            while (!signal.aborted) {
                entry.outdated = false;
                entry.deletedDuringRead.clear();
                try {
                    const games = await fetchUserRows(database, userId, signal);
                    if (signal.aborted) return false;
                    if (games.some(game => game.db_id && entry.deletedDuringRead.has(game.db_id))) {
                        entry.fetchedAt = null;
                        entry.outdated = true;
                    }
                    if (entry.outdated) continue;

                    const previous = new Map(entry.games.map(game => [game.db_id, game]));
                    entry.games = games.map(game => {
                        const old = previous.get(game.db_id);
                        return old && sameGame(old, game) ? old : game;
                    });
                    entry.fetchedAt = Date.now();
                    publish(userId, entry, {isLoading: false, error: null, hasLoaded: true});
                    return true;
                } catch (error) {
                    if (signal.aborted) return false;
                    if (entry.outdated) continue;
                    const message = (error as {message?: string} | null)?.message || 'Failed to load games';
                    console.error('Failed to fetch user games:', error);
                    publish(userId, entry, {isLoading: false, error: message});
                    return false;
                }
            }
            return false;
        } finally {
            entry.deletedDuringRead.clear();
            entry.pending = undefined;
        }
    });

    if (!silent) publish(userId, entry, {isLoading: true, error: null});
    return entry.pending;
}

export function invalidateGames(userId: string) {
    const entry = cache.get(userId);
    if (!entry) return false;
    entry.fetchedAt = null;
    if (!entry.pending) return true;
    entry.outdated = true;
    return false;
}

export function writeGames(userId: string, optimistic: GamesPatch, write: (signal: AbortSignal) => Promise<GamesPatch>) {
    const entry = getEntry(userId);
    const {signal} = entry.controller;
    entry.optimistic.add(optimistic);
    publish(userId, entry);

    const result = entry.writes.then(async () => {
        try {
            signal.throwIfAborted();
            const commit = await write(signal);
            if (!signal.aborted) {
                entry.games = commit(entry.games);
                if (entry.pending) entry.outdated = true;
            }
        } finally {
            entry.optimistic.delete(optimistic);
            if (!signal.aborted) {
                publish(userId, entry);
                if (!entry.optimistic.size) {
                    for (const change of entry.changes.values()) change();
                    entry.changes.clear();
                }
            }
        }
    });
    entry.writes = result.catch(() => {});
    return result;
}

export function subscribeToGames(database: typeof supabase, userId: string, refresh: (force: boolean) => void) {
    const entry = getEntry(userId);
    const channel = database.channel(`library:${userId}:${++channelSequence}`, {
        config: {postgres_changes_options: {wait: true}},
    });
    const changes = {schema: 'public', table: 'games'};
    const filter = `user_id=eq.${userId}`;
    const invalidate = () => {
        if (invalidateGames(userId)) refresh(true);
    };
    const applyChange = (id: unknown, change: () => void) => {
        if (typeof id !== "string" || entry.controller.signal.aborted) return;
        if (entry.optimistic.size) entry.changes.set(id, change);
        else change();
    };
    const onWrite = ({new: row}: {new: Record<string, unknown>}) => applyChange(row.id, () => {
        const game = supabaseRowToGame(row);
        if (!sameGame(entry.games.find(item => item.db_id === game.db_id), game)) invalidate();
    });

    channel.on('postgres_changes', {...changes, event: 'INSERT', filter}, onWrite);
    channel.on('postgres_changes', {...changes, event: 'UPDATE', filter}, onWrite);
    channel.on('postgres_changes', {...changes, event: 'DELETE'}, ({old}) => {
        const id = old?.id;
        if (typeof id !== "string" || entry.controller.signal.aborted) return;
        if (entry.pending) {
            entry.deletedDuringRead.add(id);
            if (entry.games.some(game => game.db_id === id)) entry.fetchedAt = null;
            return;
        }
        applyChange(id, () => {
            if (entry.games.some(game => game.db_id === id)) invalidate();
        });
    });

    let started = false;
    const timer = setTimeout(() => {
        started = true;
        refresh(false);
    }, 600);

    channel.subscribe(status => {
        if (entry.controller.signal.aborted) return;
        if (status !== 'SUBSCRIBED') {
            entry.connected = false;
            return;
        }
        if (entry.connected) return;
        entry.connected = true;
        clearTimeout(timer);
        const revalidate = started || entry.pending !== undefined || entry.snapshot.hasLoaded;
        started = true;
        if (revalidate) invalidate();
        else refresh(false);
    });

    return () => {
        if (entry.controller.signal.aborted) return;
        clearTimeout(timer);
        entry.controller.abort();
        if (cache.get(userId) === entry) {
            cache.delete(userId);
            notify(userId);
        }
        void database.removeChannel(channel);
    };
}
