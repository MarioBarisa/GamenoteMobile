import {GameGroup, Group} from "@/common/groups";
import {createContext, ReactNode, useContext, useMemo, useState} from "react";
import {MOCK_GAME_GROUPS, MOCK_GROUPS} from "@/constants/PLACEHOLDER_GROUPS.TSX";


type GroupsContextType = {
    groups: Group[];
    gameGroups: GameGroup[];
    addGroup: (group: Omit<Group, "id" | "created_at">) => void;
    removeGroup: (groupId: string) => void;
    addGameToGroup: (gameId: string, groupId: string) => void;
    removeGameFromGroup: (gameId: string, groupId: string) => void;
    getGroupsForGame: (gameId: string) => Group[];
    getGamesInGroup: (groupId: string) => string[];
};

const GroupsContext = createContext<GroupsContextType | null>(null);

export function GroupsProvider({children}: { children: ReactNode }) {
    const [groups, setGroups] = useState<Group[]>(MOCK_GROUPS);
    const [gameGroups, setGameGroups] = useState<GameGroup[]>(MOCK_GAME_GROUPS);

    const addGroup = (data: Omit<Group, "id" | "created_at">) => {
        const newGroup: Group = {
            ...data,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
        };
        setGroups((prev) => [...prev, newGroup]);
    };

    const removeGroup = (groupId: string) => {
        setGroups((prev) => prev.filter((g) => g.id !== groupId));
        setGameGroups((prev) => prev.filter((g) => g.id !== groupId));
    };

    const addGameToGroup = (gameId: string, groupId: string) => {
        const exists = gameGroups.some((g) => g.id === gameId);
        if (exists) return;
        setGameGroups((prev) => [
            ...prev,
            {
                id: Date.now().toString(),
                user_id: "user1",
                game_id: gameId,
                group_id: groupId,
                created_at: new Date().toISOString(),
            }
        ])
    };

    const removeGameFromGroup = (gameId: string, groupId: string) => {
        setGameGroups((prev) =>
            prev.filter((g) => !(g.id === gameId && g.id === groupId)));
    }

    const getGroupsForGame = (gameId: string): Group[] => {
        const groupIds = gameGroups
            .filter((gg) => gg.game_id === gameId)
            .map((gg) => gg.group_id);
        return groups.filter((g) => groupIds.includes(g.id));
    };

    const getGamesInGroup = (groupId: string): string[] =>
        gameGroups.filter((g) => g.group_id === groupId).map((g) => g.game_id);


    const value = useMemo(() => ({
            groups, gameGroups,
            addGroup, removeGroup,
            addGameToGroup, removeGameFromGroup,
            getGroupsForGame, getGamesInGroup,
        }),
        [groups, gameGroups]);

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