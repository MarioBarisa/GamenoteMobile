import {useCallback, useEffect, useState} from "react";
import {useAuth} from "@/context/auth";
import {useLocalMode} from "@/context/localMode";
import {addLocalGame, deleteLocalGame, loadLocalData, updateLocalGame} from "@/services/localData";
import {supabase} from "@/services/supabase";
import {Game} from "@/common/Game";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {gameToSupabaseRow, partialGameToSupabaseRow, supabaseRowToGame} from "@/services/userGameRows";

const EMPTY_LOCAL_GAMES: Game[] = [];

export function useUserGames() {
  const {loggedIn, session} = useAuth();
  const {activeSource, document, storageError, requestMirrorRefresh} = useLocalMode();
  const isLocal = activeSource === "local";
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    if (isLocal) {
      await loadLocalData().catch(() => {});
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      if (!loggedIn || !session?.user.id) {
        setGames(PLACEHOLDER_GAMES);
        return;
      }

      const {data, error: fetchError} = await supabase
        .from('games')
        .select('*')
        .eq('user_id', session.user.id);

      if (fetchError) {
        console.error('Failed to fetch user games:', fetchError);
        setError(fetchError.message || 'Failed to load games');
        setGames(PLACEHOLDER_GAMES);
        return;
      }

      setGames((data ?? []).map(supabaseRowToGame));
      requestMirrorRefresh();
    } finally {
      setIsLoading(false);
    }
  }, [isLocal, loggedIn, requestMirrorRefresh, session?.user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- početno učitavanje igara
    fetchGames();
  }, [fetchGames]);

  const addGame = async (game: Game, groupIds?: string[]): Promise<void> => {
    if (isLocal) {
      await addLocalGame(game, groupIds);
      return;
    }
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
    await fetchGames();
  };

  const updateGame = async (gameId: string, updates: Partial<Game>, groupChanges?: {add: string[]; remove: string[]}): Promise<void> => {
    if (isLocal) return updateLocalGame(gameId, updates, groupChanges);
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
    await fetchGames();
  };

  const deleteGame = async (gameId: string): Promise<void> => {
    if (isLocal) return deleteLocalGame(gameId);
    if (!loggedIn || !session?.user.id) {
      setGames(prev => prev.filter(g => g.db_id !== gameId && g.game_id !== gameId));
      return;
    }

    // Brisanje po primarnom ključu
    const byId = await supabase
      .from('games')
      .delete()
      .eq('user_id', session.user.id)
      .eq('id', gameId)
      .select();

    if (!byId.error && byId.data && byId.data.length > 0) {
      requestMirrorRefresh();
      setGames(prev => prev.filter(g => g.db_id !== gameId && g.game_id !== gameId));
      return;
    }

    // Stari način preko API id-a
    const byApiId = await supabase
      .from('games')
      .delete()
      .eq('user_id', session.user.id)
      .eq('game_api_id', gameId)
      .select();

    if (byApiId.error) {
      console.error('Failed to delete game:', byApiId.error);
      throw byApiId.error;
    }

    if (!byApiId.data || byApiId.data.length === 0) {
      console.error('Failed to delete game: no row deleted');
      throw new Error('Game not deleted');
    }

    setGames(prev => prev.filter(g => g.db_id !== gameId && g.game_id !== gameId));
    requestMirrorRefresh();
  };

  return {
    games: isLocal ? document?.games ?? EMPTY_LOCAL_GAMES : games,
    isLoading: isLocal ? !document && !storageError : isLoading,
    error: isLocal ? (storageError ? "screens.localMode.storageError" : null) : error,
    addGame,
    updateGame,
    deleteGame,
    refresh: fetchGames,
  };
}
