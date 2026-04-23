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
    let results = [...PLACEHOLDER_IGRE];

    if (search) {
      results = results.filter((game) =>
        game.title.toLowerCase().includes(search.toLowerCase()),
      );
    }
    results.sort((a, b) => {
      if (sort) {
        // default (sort = false): sort po playtime-u (silazno)
        return (b.rating || 0) - (a.rating || 0);
      } else {
          // sort  uključen (sort = true): sort po ocjeni (silazno)
        return (b.play_time || 0) - (a.play_time || 0);
      }
    });

    return results;
  }, [search, sort]); // <- Obavezno dodati 'sort' u ovisnosti (dependency array)


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
              onLongPress={() => Alert.alert("Sortiranje", "Sortiraj rezultate pretrage. Ako je sortiranje uključeno igre koje najviše igraš su prve.")}
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
