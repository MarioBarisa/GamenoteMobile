import {GameGroup, Group} from "@/common/groups";
import {createContext, ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {MOCK_GAME_GROUPS, MOCK_GROUPS} from "@/constants/PLACEHOLDER_GROUPS.TSX";
import {useAuth} from "@/context/auth";
import {supabase} from "@/services/supabase";
import * as groupsApi from "@/services/groupsApi";


type GroupsContextType = {
    groups: Group[];
    gameGroups: GameGroup[];
    isLoading: boolean;
    error: string | null;
    addGroup: (group: Omit<Group, "id" | "created_at"> & Partial<Pick<Group, "id" | "created_at">>) => Promise<Group | undefined>;
    updateGroup: (groupId: string, payload: Partial<Group>) => Promise<void>;
    removeGroup: (groupId: string) => Promise<void>;
    addGameToGroup: (gameId: string, groupId: string) => Promise<void>;
    removeGameFromGroup: (gameId: string, groupId: string) => Promise<void>;
    getGroupsForGame: (gameId: string) => Group[];
    getGamesInGroup: (groupId: string) => string[];
    refreshGroups: () => Promise<void>;
};

const GroupsContext = createContext<GroupsContextType | null>(null);

export function GroupsProvider({children}: { children: ReactNode }) {
    const {loggedIn, session} = useAuth();
    const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
    const [gameGroups, setGameGroups] = useState<GameGroup[]>(MOCK_GAME_GROUPS);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadGameGroups = useCallback(async () => {
        if (!loggedIn || !session?.user.id) return;
        try {
            const allGameGroups: GameGroup[] = [];
            const data = await groupsApi.listGroups(session.user.id);
            for (const g of data) {
                const games = await groupsApi.listGroupGames(g.id, session.user.id);
                for (const gg of games) {
                    allGameGroups.push({
                        id: gg.id,
                        user_id: gg.user_id,
                        game_id: gg.game_id,
                        group_id: gg.group_id,
                        created_at: gg.created_at,
                    });
                }
            }
            return allGameGroups;
        } catch (err) {
            console.error('Failed to load game groups:', err);
            return undefined;
        }
    }, [loggedIn, session?.user.id]);

    const refreshGroups = useCallback(async () => {
        if (!loggedIn || !session?.user.id) {
            setGroups(MOCK_GROUPS);
            setGameGroups(MOCK_GAME_GROUPS);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const data = await groupsApi.listGroups(session.user.id);
            setGroups(data.length > 0 ? data : []);
            const gg = await loadGameGroups();
            if (gg) setGameGroups(gg);
        } catch (err) {
            console.error('Failed to refresh groups:', err);
            setError('Failed to load groups');
        } finally {
            setIsLoading(false);
        }
    }, [loggedIn, session?.user.id, loadGameGroups]);

    useEffect(() => {
        if (!loggedIn || !session?.user.id) {
            setGroups(MOCK_GROUPS);
            setGameGroups(MOCK_GAME_GROUPS);
            return;
        }

        groupsApi.listGroups(session.user.id).then(async (data) => {
            setGroups(data.length > 0 ? data : []);
            const gg = await loadGameGroups();
            if (gg) setGameGroups(gg);
        }).catch(console.error);
    }, [loggedIn, session?.user.id, loadGameGroups]);

    const addGroup = async (data: Omit<Group, "id" | "created_at"> & Partial<Pick<Group, "id" | "created_at">>) => {
        if (!loggedIn || !session?.user.id) {
            const newGroup: Group = {
                ...data,
                id: (data as any).id ?? Date.now().toString(),
                created_at: (data as any).created_at ?? new Date().toISOString(),
            };
            setGroups((prev) => [...prev, newGroup]);
            return newGroup;
        }

        try {
            const created = await groupsApi.createGroup({
                user_id: session.user.id,
                name: data.name,
                type: data.type ? data.type.toLowerCase() : 'collection',
                rating: data.rating ?? null,
            });
            setGroups((prev) => [...prev, created]);
            return created;
        } catch (err) {
            console.error('Failed to create group:', err);
            setError('Failed to create group');
        }
    };

    const updateGroup = async (groupId: string, payload: Partial<Group>) => {
        const normalized = {...payload};
        if (normalized.type) normalized.type = normalized.type.toLowerCase();

        if (!loggedIn || !session?.user.id) {
            setGroups((prev) => prev.map((g) => g.id === groupId ? {...g, ...normalized} : g));
            return;
        }

        try {
            await groupsApi.updateGroup(groupId, session.user.id, normalized);
            setGroups((prev) => prev.map((g) => g.id === groupId ? {...g, ...normalized} : g));
        } catch (err) {
            console.error('Failed to update group:', err);
            setError('Failed to update group');
            throw err;
        }
    };

    const removeGroup = async (groupId: string) => {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setGameGroups((prev) => prev.filter((g) => g.group_id !== groupId));

        if (!loggedIn || !session?.user.id) return;

        try {
            await groupsApi.deleteGroup(groupId, session.user.id);
        } catch (err) {
            console.error('Failed to delete group:', err);
            setError('Failed to delete group');
        }
    };

    const resolveGameId = useCallback(async (gameId: string): Promise<string> => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(gameId)) return gameId;

        if (!session?.user.id) return gameId;

        const {data} = await supabase
            .from('games')
            .select('id')
            .eq('game_api_id', gameId)
            .eq('user_id', session.user.id)
            .maybeSingle();

        return data?.id ?? gameId;
    }, [session?.user.id]);

    const addGameToGroup = async (gameId: string, groupId: string) => {
        const resolvedId = await resolveGameId(gameId);

        const exists = gameGroups.some(
            (g) => g.game_id === resolvedId && g.group_id === groupId
        );
        if (exists) return;

        setGameGroups((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                user_id: session?.user.id ?? "user1",
                game_id: resolvedId,
                group_id: groupId,
                created_at: new Date().toISOString(),
            }
        ]);

        if (!loggedIn || !session?.user.id) return;

        try {
            await groupsApi.addGameToGroup({
                user_id: session.user.id,
                group_id: groupId,
                game_id: resolvedId,
            });
        } catch (err) {
            console.error('Failed to add game to group:', err);
            setError('Failed to add game to group');
        }
    };

    const removeGameFromGroup = async (gameId: string, groupId: string) => {
        const resolvedId = await resolveGameId(gameId);

        setGameGroups((prev) =>
            prev.filter((g) => !(g.game_id === resolvedId && g.group_id === groupId))
        );

        if (!loggedIn || !session?.user.id) return;

        try {
            await groupsApi.removeGameFromGroup({
                user_id: session.user.id,
                group_id: groupId,
                game_id: resolvedId,
            });
        } catch (err) {
            console.error('Failed to remove game from group:', err);
            setError('Failed to remove game from group');
        }
    };

    const getGroupsForGame = (gameId: string): Group[] => {
        const groupIds = gameGroups
            .filter((gg) => gg.game_id === gameId)
            .map((gg) => gg.group_id);
        return groups.filter((g) => groupIds.includes(g.id));
    };

    const getGamesInGroup = (groupId: string): string[] =>
        gameGroups.filter((g) => g.group_id === groupId).map((g) => g.game_id);


    const value = {
            groups, gameGroups, isLoading, error,
            addGroup, updateGroup, removeGroup,
            addGameToGroup, removeGameFromGroup,
            getGroupsForGame, getGamesInGroup, refreshGroups,
        };

    return <GroupsContext.Provider value={value}>{children}</GroupsContext.Provider>
}

//GRUPE MOPGU IMATI TYPE KOJI JE SAMO collection, trilogy ili frnachise!!!

export function useGroups() {
    const context = useContext(GroupsContext);
    if (!context) {
        throw new Error("useGroups mora biti unutar GroupsProvider");
    }
    return context;
}
