import {createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode} from "react";
import {AppState} from "react-native";
import {useAuth} from "@/context/auth";
import {useLocalMode} from "@/context/localMode";
import {addLocalGame, deleteLocalGame, loadLocalData, updateLocalGame} from "@/services/localData";
import {supabase} from "@/services/supabase";
import type {Game} from "@/common/Game";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {gameToSupabaseRow, partialGameToSupabaseRow, supabaseRowToGame, USER_GAME_COLUMNS} from "@/services/userGameRows";
import {getGamesSnapshot, loadGames, needsForegroundRefresh, onGamesChanged, subscribeToGames, writeGames} from "@/services/gamesCache";

const EMPTY_GAMES: Game[] = [];

export class GameNotFoundError extends Error {}

function useLibrary() {
    const {phase, session} = useAuth();
    const {activeSource, document, storageError, requestMirrorRefresh} = useLocalMode();
    const isLocal = activeSource === "local";
    const userId = !isLocal && phase === "ready" ? session?.user.id : undefined;
    const [demoGames, setDemoGames] = useState(PLACEHOLDER_GAMES);

    const subscribe = useCallback((listener: () => void) => {
        return userId ? onGamesChanged(userId, listener) : () => {};
    }, [userId]);
    const getSnapshot = useCallback(() => userId ? getGamesSnapshot(userId) : undefined, [userId]);
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const refreshCloud = useCallback(async (force: boolean, silent = false) => {
        if (userId && await loadGames(supabase, userId, {force, silent})) requestMirrorRefresh();
    }, [userId, requestMirrorRefresh]);

    useEffect(() => {
        if (isLocal) {
            void loadLocalData().catch(() => {});
            return;
        }
        if (!userId) return;
        const unsubscribe = subscribeToGames(supabase, userId, force => {
            void refreshCloud(force, force);
        });
        const foreground = AppState.addEventListener("change", state => {
            if (state === "active" && needsForegroundRefresh(userId)) void refreshCloud(true, true);
        });
        return () => {
            foreground.remove();
            unsubscribe();
        };
    }, [isLocal, userId, refreshCloud]);

    const refresh = useCallback(async () => {
        if (isLocal) await loadLocalData().catch(() => {});
        else if (userId) await refreshCloud(true);
        else setDemoGames(PLACEHOLDER_GAMES);
    }, [isLocal, userId, refreshCloud]);

    const addGame = useCallback(async (game: Game, groupIds?: string[]): Promise<void> => {
        if (isLocal) {
            await addLocalGame(game, groupIds);
            return;
        }
        if (!userId) return;

        const row = gameToSupabaseRow({...game, user_id: userId});
        await writeGames(userId, games => [...games, game], async signal => {
            const {data, error} = await supabase.from('games').insert(row)
                .select(USER_GAME_COLUMNS).abortSignal(signal).single();
            if (error) {
                console.error('Failed to add game:', error);
                throw error;
            }
            const inserted = supabaseRowToGame(data);
            return games => games.some(item => item.db_id === inserted.db_id)
                ? games.map(item => item.db_id === inserted.db_id ? inserted : item)
                : [...games, inserted];
        });
        requestMirrorRefresh();
    }, [isLocal, userId, requestMirrorRefresh]);

    const updateGame = useCallback(async (gameId: string, updates: Partial<Game>, groupChanges?: {add: string[]; remove: string[]}): Promise<void> => {
        if (isLocal) return updateLocalGame(gameId, updates, groupChanges);
        if (!userId) return;

        const row = partialGameToSupabaseRow(updates);
        await writeGames(userId, games => games.map(game => game.game_id === gameId ? {...game, ...updates} : game), async signal => {
            const {data, error: updateError} = await supabase.from('games').update(row)
                .eq('user_id', userId).eq('game_api_id', gameId)
                .select(USER_GAME_COLUMNS).abortSignal(signal);
            if (updateError) {
                console.error('Failed to update game:', updateError);
                throw updateError;
            }
            if (!data?.length) throw new GameNotFoundError("Game not found");
            const updated = new Map(data.map(row => [row.id, supabaseRowToGame(row)]));
            return games => games.map(game => game.db_id ? updated.get(game.db_id) ?? game : game);
        });
        requestMirrorRefresh();
    }, [isLocal, userId, requestMirrorRefresh]);

    const deleteGame = useCallback(async (gameId: string): Promise<void> => {
        if (isLocal) return deleteLocalGame(gameId);
        if (!userId) {
            setDemoGames(games => games.filter(game => game.db_id !== gameId && game.game_id !== gameId));
            return;
        }

        await writeGames(userId, games => games.filter(game => game.db_id !== gameId && game.game_id !== gameId), async signal => {
            const byId = await supabase.from('games').delete()
                .eq('user_id', userId).eq('id', gameId).select('id').abortSignal(signal);
            if (byId.data?.length) {
                return games => games.filter(game => game.db_id !== gameId);
            }

            const byApiId = await supabase.from('games').delete()
                .eq('user_id', userId).eq('game_api_id', gameId).select('id').abortSignal(signal);
            const error = byApiId.error ?? (!byApiId.data?.length ? new Error('Game not deleted') : null);
            if (error) {
                console.error('Failed to delete game:', error);
                throw error;
            }
            const deleted = new Set(byApiId.data?.map(row => row.id));
            return games => games.filter(game => !deleted.has(game.db_id));
        });
        requestMirrorRefresh();
    }, [isLocal, userId, requestMirrorRefresh]);

    let games = demoGames;
    if (isLocal) games = document?.games ?? EMPTY_GAMES;
    else if (userId) games = snapshot?.error && !snapshot.hasLoaded ? PLACEHOLDER_GAMES : snapshot?.games ?? EMPTY_GAMES;

    return {
        games,
        isLoading: isLocal ? !document && !storageError : Boolean(userId && (snapshot?.isLoading ?? true)),
        error: isLocal ? (storageError ? "screens.localMode.storageError" : null) : snapshot?.error ?? null,
        addGame,
        updateGame,
        deleteGame,
        refresh,
    };
}

const UserGamesContext = createContext<ReturnType<typeof useLibrary> | null>(null);

export function UserGamesProvider({children}: {children: ReactNode}) {
    return <UserGamesContext.Provider value={useLibrary()}>{children}</UserGamesContext.Provider>;
}

export function useUserGames() {
    const library = useContext(UserGamesContext);
    if (!library) throw new Error('UserGamesProvider is missing');
    return library;
}
