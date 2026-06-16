import {useCallback, useEffect, useState} from "react";
import {useAuth} from "@/context/auth";
import {supabase} from "@/services/supabase";
import {Game} from "@/common/Game";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {SeriesGame} from "@/common/GameSeries";

function parseStringArray(raw: any): string[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseSeries(raw: any): SeriesGame[] | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw as SeriesGame[];
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as SeriesGame[];
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function supabaseRowToGame(row: any): Game {
  let status = row.status;
  if (!status && row.currently_playing === true) {
    status = 'playing';
  }

  return {
    title: row.title ?? '',
    game_id: row.game_api_id ?? '',
    platform: row.platform ?? undefined,
    genre: row.genre ?? undefined,
    status: status ?? undefined,
    rating: row.rating ?? undefined,
    metacriticScore: row.metacritic_score ?? 0,
    esrbRating: row.esrb_rating ?? undefined,
    releaseDate: row.release_date ?? '',
    webPage: row.website_url ?? '',
    about: row.description ?? '',
    series: parseSeries(row.series_games),
    notes: row.notes ?? undefined,
    publisher: row.publisher ?? undefined,
    image_url: row.image_url ?? undefined,
    background_image: row.background_image ?? undefined,
    screenshot_urls: parseStringArray(row.screenshot_urls),
    play_time: row.play_time ?? 0,
    start_date: row.start_date ? new Date(row.start_date).toISOString() : undefined,
    end_date: row.end_date ? new Date(row.end_date).toISOString() : undefined,
    progress_value: row.progress_value ?? 0,
    progress_total: row.progress_total ?? 100,
    progress_mode: row.progress_mode ?? undefined,
  };
}

const GAME_TO_DB: Record<string, string> = {
  game_id: 'game_api_id',
  metacriticScore: 'metacritic_score',
  esrbRating: 'esrb_rating',
  releaseDate: 'release_date',
  webPage: 'website_url',
  about: 'description',
  image_url: 'image_url',
  background_image: 'background_image',
  screenshot_urls: 'screenshot_urls',
  play_time: 'play_time',
  start_date: 'start_date',
  end_date: 'end_date',
  progress_value: 'progress_value',
  progress_total: 'progress_total',
  progress_mode: 'progress_mode',
  notes: 'notes',
  publisher: 'publisher',
  title: 'title',
  platform: 'platform',
  genre: 'genre',
  status: 'status',
  rating: 'rating',
};

function partialGameToSupabaseRow(updates: Partial<Game>): Record<string, any> {
  const row: Record<string, any> = {};
  for (const [gameKey, value] of Object.entries(updates)) {
    const dbKey = GAME_TO_DB[gameKey];
    if (dbKey) {
      if (dbKey === 'screenshot_urls') {
        row[dbKey] = value ? JSON.stringify(value) : null;
      } else {
        row[dbKey] = value ?? null;
      }
    }
  }
  if ('status' in updates) {
    row.currently_playing = updates.status === 'playing';
  }
  return row;
}

function gameToSupabaseRow(game: Partial<Game> & { user_id: string }) {
  return {
    user_id: game.user_id,
    game_api_id: game.game_id,
    title: game.title ?? '',
    platform: game.platform ?? null,
    genre: game.genre ?? null,
    status: game.status ?? null,
    currently_playing: game.status === 'playing',
    rating: game.rating ?? null,
    metacritic_score: game.metacriticScore ?? null,
    esrb_rating: game.esrbRating ?? null,
    release_date: game.releaseDate ?? null,
    website_url: game.webPage ?? null,
    description: game.about ?? null,
    publisher: game.publisher ?? null,
    image_url: game.image_url ?? null,
    background_image: game.background_image ?? null,
    screenshot_urls: game.screenshot_urls ? JSON.stringify(game.screenshot_urls) : null,
    series_games: game.series ? JSON.stringify(game.series) : null,
    notes: game.notes ?? null,
    play_time: game.play_time ?? 0,
    start_date: game.start_date ?? null,
    end_date: game.end_date ?? null,
    progress_value: game.progress_value ?? 0,
    progress_total: game.progress_total ?? 100,
    progress_mode: game.progress_mode ?? null,
  };
}

export function useUserGames() {
  const {loggedIn, session} = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    if (!loggedIn || !session?.user.id) {
      setGames(PLACEHOLDER_GAMES);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const {data, error: fetchError} = await supabase
      .from('games')
      .select('*')
      .eq('user_id', session.user.id);

    if (fetchError) {
      console.error('Failed to fetch user games:', fetchError);
      setError(fetchError.message || 'Failed to load games');
      setGames(PLACEHOLDER_GAMES);
      setIsLoading(false);
      return;
    }

    setGames((data ?? []).map(supabaseRowToGame));
    setIsLoading(false);
  }, [loggedIn, session?.user.id]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const addGame = async (game: Game): Promise<void> => {
    if (!loggedIn || !session?.user.id) {
      return;
    }

    const row = gameToSupabaseRow({...game, user_id: session.user.id});
    const {error: insertError} = await supabase
      .from('games')
      .insert(row);

    if (insertError) {
      console.error('Failed to add game:', insertError);
      throw insertError;
    }

    setGames(prev => [...prev, game]);
  };

  const updateGame = async (gameId: string, updates: Partial<Game>): Promise<void> => {
    if (!loggedIn || !session?.user.id) return;

    const row = partialGameToSupabaseRow(updates);
    const {error: updateError} = await supabase
      .from('games')
      .update(row)
      .eq('user_id', session.user.id)
      .eq('game_api_id', gameId);

    if (updateError) {
      console.error('Failed to update game:', updateError);
      throw updateError;
    }

    setGames(prev => prev.map(g => g.game_id === gameId ? {...g, ...updates} : g));
  };

  const deleteGame = async (gameId: string): Promise<void> => {
    if (!loggedIn || !session?.user.id) {
      setGames(prev => prev.filter(g => g.game_id !== gameId));
      return;
    }

    const {error: deleteError} = await supabase
      .from('games')
      .delete()
      .eq('user_id', session.user.id)
      .eq('game_api_id', gameId);

    if (deleteError) {
      console.error('Failed to delete game:', deleteError);
      throw deleteError;
    }

    setGames(prev => prev.filter(g => g.game_id !== gameId));
  };

  return {
    games,
    isLoading,
    error,
    addGame,
    updateGame,
    deleteGame,
    refresh: fetchGames,
  };
}
