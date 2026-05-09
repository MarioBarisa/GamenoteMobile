export type Group = {
  id: string;
  user_id: string;
  name: string;
  type: string | null;
  rating: number | null;
  created_at: string | null;
};

export type GameGroup = {
  id: string;
  user_id: string;
  game_id: string;
  group_id: string;
  created_at?: string | null;
};