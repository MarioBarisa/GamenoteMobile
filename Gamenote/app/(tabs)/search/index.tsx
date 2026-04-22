import { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import GameCard, {Game} from "@/components/GameCard";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";

// noinspection JSUnusedGlobalSymbols
export default function SearchIndex() {
  const [search, setSearch] = useState("");
  const PLACEHOLDER_IGRE = PLACEHOLDER_GAMES;

  const filteredGames = useMemo(() => {
    if (!search) return PLACEHOLDER_IGRE;
    return PLACEHOLDER_IGRE.filter((game) =>
      game.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [search]);

  const { theme } = useTheme();
  const t = colors[theme];

  return (
    <>
      <Stack.Screen
        options={{
          title: "Pretraži Gamenote",
          headerSearchBarOptions: {
            placeholder: "Pretraži Gamenote",
            onChangeText: (event) => setSearch(event.nativeEvent.text),
          },
        }}
      />
      <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: 16, gap: 0 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {filteredGames.map((game, i) => (
        <GameCard key={i} game={game} />
      ))}
    </ScrollView>
    </>
  );
}

