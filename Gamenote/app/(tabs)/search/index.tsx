import { useMemo, useState } from "react";
import {ScrollView, TouchableOpacity, Alert, View} from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/context/theme";
import { useSettings } from "@/context/settings";
import { colors } from "@/constants/theme";
import GameCard from "@/components/GameCard";
import GameCardCompact from "@/components/GameCardCompact";
import * as Haptics from 'expo-haptics';
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import { SymbolView } from "expo-symbols";

// noinspection JSUnusedGlobalSymbols
export default function SearchIndex() {
  const [search, setSearch] = useState("");
  const [userGamenotesOnly, setUserGamenotesOnly] = useState(false);
  const [sort] = useState(false);
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
        return (b.rating || 0) - (a.rating || 0);
      } else {
        return (b.play_time || 0) - (a.play_time || 0);
      }
    });

    return results;
  }, [search, sort]); // <- Obavezno dodati 'sort' u ovisnosti (dependency array)

    function searchBarText(vrsta: boolean){
        if(vrsta){
            return "Pretraži svoji Gamenote"
        } else{
            return "Pretraži Gamenote DB"
        }
    }

  const { theme } = useTheme();
  const t = colors[theme];
  const {compactCards} = useSettings();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Pretraži Gamenote",
          headerRight: () => (
                <TouchableOpacity
              accessibilityLabel="Filtriraj svoje igre"
              onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setUserGamenotesOnly(prev => !prev)
              }}
              onLongPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  Alert.alert("Tvoji Gamenote", "Ovaj gumb uključuje filtiranje prikaza samo na tvoje dodane igre. Inače tražiš cijeli Gamenote database.")
              }}
              style={{ justifyContent: 'center', alignItems: 'center'}}>

              <SymbolView
                key={userGamenotesOnly ? "bookmark.fill" : "bookmark"}
                name={userGamenotesOnly ? "bookmark.fill" : "bookmark"}
                resizeMode="scaleAspectFit"
                 style={{ width: 36, height: 30 }}
                 tintColor={t.text}
              />
            </TouchableOpacity>
          ),
          headerSearchBarOptions: {
            placeholder: searchBarText(userGamenotesOnly),
            onChangeText: (event) => setSearch(event.nativeEvent.text),
          },
        }}
      />
      <ScrollView
      style={{ backgroundColor: t.background }}
      contentContainerStyle={{ padding: 16, gap: 0 }}
      contentInsetAdjustmentBehavior="automatic"
    >
      {compactCards ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
          {filteredGames.map((game, i) => (
            <GameCardCompact key={game.title} game={game} />
          ))}
        </View>
      ) : (
        filteredGames.map((game, i) => (
          <GameCard key={game.title} game={game} />
        ))
      )}
    </ScrollView>
    </>
  );
}
