import type {Game} from "@/common/Game";
import type {SeriesGame} from "@/common/GameSeries";

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

export function supabaseRowToGame(row: any): Game {
  let status = row.status;
  if (!status && row.currently_playing === true) {
    status = 'playing';
  }

  return {
    title: row.title ?? '',
    game_id: row.game_api_id ?? '',
    db_id: row.id,
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

export function partialGameToSupabaseRow(updates: Partial<Game>): Record<string, any> {
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

export function gameToSupabaseRow(game: Partial<Game> & { user_id: string }) {
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


const WEB_GAME_COLUMNS = 'id,title,platform,status,currently_playing,rating,notes,genre,genres_list,publisher,play_time,start_date,end_date,created_at,image_url,background_image,progress_mode,progress_value,progress_total,progress_source,achievement_percent';
export const USER_GAME_COLUMNS = `${WEB_GAME_COLUMNS},game_api_id,metacritic_score,esrb_rating,release_date,website_url,description,screenshot_urls,series_games` as const;

export async function fetchUserRows(database: typeof import("@/services/supabase").supabase, userId: string, signal: AbortSignal): Promise<Game[]> {
  const games: Game[] = [];
  const ids = new Set<string>();
  let expectedCount: number | null = null;
  for (;;) {
    signal.throwIfAborted();
    const {data, error, count} = await database.from('games')
      .select(USER_GAME_COLUMNS, {count: 'exact'})
      .eq('user_id', userId)
      .order('id')
      .range(games.length, games.length + 999)
      .abortSignal(signal);
    if (error) throw error;
    if (expectedCount !== null && count !== expectedCount) throw new Error('Library changed while loading');
    expectedCount = count;

    const page = data ?? [];
    for (const row of page) {
      if (ids.has(row.id)) throw new Error('Library changed while loading');
      ids.add(row.id);
      games.push(supabaseRowToGame(row));
    }

    if (expectedCount === null ? page.length < 1000 : games.length === expectedCount) return games;
    if (!page.length || (expectedCount !== null && games.length > expectedCount)) {
      throw new Error('Library could not be fully loaded');
    }
  }
}
