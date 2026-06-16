import {GameGroup, Group} from "@/common/groups";
import {createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {MOCK_GAME_GROUPS, MOCK_GROUPS} from "@/constants/PLACEHOLDER_GROUPS.TSX";
import {useAuth} from "@/context/auth";
import * as groupsApi from "@/services/groupsApi";


type GroupsContextType = {
    groups: Group[];
    gameGroups: GameGroup[];
    isLoading: boolean;
    addGroup: (group: Omit<Group, "id" | "created_at"> & Partial<Pick<Group, "id" | "created_at">>) => Group;
    removeGroup: (groupId: string) => void;
    addGameToGroup: (gameId: string, groupId: string) => void;
    removeGameFromGroup: (gameId: string, groupId: string) => void;
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

    const refreshGroups = useCallback(async () => {
        if (!loggedIn || !session?.user.id) {
            setGroups(MOCK_GROUPS);
            setGameGroups(MOCK_GAME_GROUPS);
            return;
        }

        setIsLoading(true);
        try {
            const data = await groupsApi.listGroups(session.user.id);
            setGroups(data.length > 0 ? data : MOCK_GROUPS);
        } catch (err) {
            console.error('Failed to refresh groups:', err);
        } finally {
            setIsLoading(false);
        }
    }, [loggedIn, session?.user.id]);

    useEffect(() => {
        if (!loggedIn || !session?.user.id) {
            setGroups(MOCK_GROUPS);
            setGameGroups(MOCK_GAME_GROUPS);
            return;
        }

        groupsApi.listGroups(session.user.id).then((data) => {
            setGroups(data.length > 0 ? data : MOCK_GROUPS);
        }).catch(console.error);
    }, [loggedIn, session?.user.id]);

    const addGroup = (data: Omit<Group, "id" | "created_at"> & Partial<Pick<Group, "id" | "created_at">>) => {
        if (loggedIn && session?.user.id) {
            groupsApi.createGroup({
                user_id: session.user.id,
                name: data.name,
                type: data.type || 'collection',
                rating: data.rating ?? null,
            }).then((created) => {
                setGroups((prev) => [...prev, created]);
            }).catch(console.error);
        }

        const newGroup: Group = {
            ...data,
            id: (data as any).id ?? Date.now().toString(),
            created_at: (data as any).created_at ?? new Date().toISOString(),
        };
        setGroups((prev) => [...prev, newGroup]);
        return newGroup;
    };

    const removeGroup = (groupId: string) => {
        if (loggedIn && session?.user.id) {
            groupsApi.deleteGroup(groupId, session.user.id).catch(console.error);
        }
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setGameGroups((prev) => prev.filter((g) => g.id !== groupId));
    };

    const addGameToGroup = (gameId: string, groupId: string) => {
        const exists = gameGroups.some(
            (g) => g.game_id === gameId && g.group_id === groupId
        );
        if (exists) return;

        if (loggedIn && session?.user.id) {
            groupsApi.addGameToGroup({
                user_id: session.user.id,
                group_id: groupId,
                game_id: gameId,
            }).catch(console.error);
        }

        setGameGroups((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                user_id: session?.user.id ?? "user1",
                game_id: gameId,
                group_id: groupId,
                created_at: new Date().toISOString(),
            }
        ]);
    };

    const removeGameFromGroup = (gameId: string, groupId: string) => {
        if (loggedIn && session?.user.id) {
            groupsApi.removeGameFromGroup({
                user_id: session.user.id,
                group_id: groupId,
                game_id: gameId,
            }).catch(console.error);
        }
        setGameGroups((prev) =>
            prev.filter((g) => !(g.game_id === gameId && g.group_id === groupId))
        );
    };

    const getGroupsForGame = (gameId: string): Group[] => {
        const groupIds = gameGroups
            .filter((gg) => gg.game_id === gameId)
            .map((gg) => gg.group_id);
        return groups.filter((g) => groupIds.includes(g.id));
    };

    const getGamesInGroup = (groupId: string): string[] =>
        gameGroups.filter((g) => g.group_id === groupId).map((g) => g.game_id);


    const value = useMemo(() => ({
            groups, gameGroups, isLoading,
            addGroup, removeGroup,
            addGameToGroup, removeGameFromGroup,
            getGroupsForGame, getGamesInGroup, refreshGroups,
        }),
        [groups, gameGroups, isLoading, loggedIn, session?.user.id]);

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
