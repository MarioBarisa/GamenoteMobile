import {Group, GameGroup} from "@/common/groups";

export const MOCK_GROUPS: Group[]=[
    {
    id: "g1",
    user_id: "user1",
    name: "RPG games",
    type: "Genre",
    rating: 4,
    created_at: "2025-11-11",
    user_notes: "very fun nintendo games"
  },
  {
    id: "g2",
    user_id: "user1",
    name: "Platinum",
    type: "Collection",
    rating: 5,
    created_at: null,
    user_notes: "I need to platinum these!"
  },

]

export const MOCK_GAME_GROUPS: GameGroup[] = [
    {id: "gg1", user_id: "user1", game_id: "0", group_id: "g1"},
    {id: "gg11", user_id: "user1", game_id: "1", group_id: "g1"},
    {id: "gg31", user_id: "user1", game_id: "3", group_id: "g2"},
    {id: "gg3", user_id: "user1", game_id: "2", group_id: "g2"},
]