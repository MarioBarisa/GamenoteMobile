import {Group, GameGroup} from "@/common/groups";

export const MOCK_GROUPS: Group[]=[
    {
    id: "g1",
    user_id: "user1",
    name: "RPG igre",
    type: "Genre",
    rating: 4,
    created_at: "2025-11-11",
    user_notes: "Jako poggers nintendo igre igre."
  },
  {
    id: "g2",
    user_id: "user1",
    name: "Platinum",
    type: "Collection",
    rating: 5,
    created_at: null,
  },
  {
    id: "g3",
    user_id: "user1",
    name: "Wishlist",
    type: "Trilogy",
    rating: 3,
    created_at: null,
  },
]

export const MOCK_GAME_GROUPS: GameGroup[] = [
    {id: "gg1", user_id: "user1", game_id: "0", group_id: "g1"},
    {id: "gg11", user_id: "user1", game_id: "1", group_id: "g1"},
    {id: "gg12", user_id: "user1", game_id: "3", group_id: "g1"},
    {id: "gg2", user_id: "user1", game_id: "4", group_id: "g1"},
    {id: "gg31", user_id: "user1", game_id: "2", group_id: "g2"},
    {id: "gg3", user_id: "user1", game_id: "2", group_id: "g2"},
]