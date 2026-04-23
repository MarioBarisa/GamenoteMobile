import { useMemo, useState } from "react";
import {ScrollView, Text, TouchableOpacity, Alert} from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/context/theme";
import { colors } from "@/constants/theme";
import GameCard, {Game} from "@/components/GameCard";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import { SymbolView } from "expo-symbols";

// noinspection JSUnusedGlobalSymbols
export default function SearchIndex() {
  const [search, setSearch] = useState("");
  const [userGamenotesOnly, setUserGamenotesOnly] = useState(false);
  const [sort, setSort] = useState(false);
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
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setSort(prev => !prev)}
              onLongPress={() => Alert.alert("Sortiranje", "Sortiraj rezultate pretrage. Igre koje najviše igraš su prve.")}
              style={{ justifyContent: 'center', alignItems: 'center'}}>
             <SymbolView
                 key={sort ? "line.horizontal.3.decrease.circle" : "line.horizontal.3.decrease.circle.fill"}
                 name={sort ? "line.horizontal.3.decrease.circle" : "line.horizontal.3.decrease.circle.fill"}
                resizeMode="scaleAspectFit"
                style={{ width: 36, height: 30 }}
              />
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => setUserGamenotesOnly(prev => !prev)}
              onLongPress={() => Alert.alert("Tvoji Gamenote", "Ovaj gumb uključuje filtiranje prikaza samo na tvoje dodane igre. Inače tražiš cijeli Gamenote database.")}
              style={{ justifyContent: 'center', alignItems: 'center'}}>

              <SymbolView
                key={userGamenotesOnly ? "bookmark.fill" : "bookmark"}
                name={userGamenotesOnly ? "bookmark.fill" : "bookmark"}
                resizeMode="scaleAspectFit"
                 style={{ width: 36, height: 30 }}
              />
            </TouchableOpacity>
          ),
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
