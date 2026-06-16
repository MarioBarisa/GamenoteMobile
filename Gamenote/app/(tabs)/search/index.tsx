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
import {useTranslation} from "react-i18next";

// noinspection JSUnusedGlobalSymbols
export default function SearchIndex() {
  const [search, setSearch] = useState("");
  const [userGamenotesOnly, setUserGamenotesOnly] = useState(false);
  const [sort] = useState(false);
  const [games, setGames] = useState(PLACEHOLDER_GAMES);

  const filteredGames = useMemo(() => {
    let results = [...games];

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
  }, [games, search, sort]); // <- Obavezno moram biti 'sort' u ovisnosti (dependency array)

    const {t: tr} = useTranslation();

    function searchBarText(vrsta: boolean){
        if(vrsta){
            return tr("search.placeholderMyGames")
        } else{
            return tr("search.placeholderDB")
        }
    }

  const { theme } = useTheme();
  const t = colors[theme];
  const {compactCards} = useSettings();

  return (
    <>
      <Stack.Screen
        options={{
          title: tr("search.title"),
          headerRight: () => (
                <TouchableOpacity
              accessibilityLabel={tr("search.filterA11y")}
              onPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setUserGamenotesOnly(prev => !prev)
              }}
              onLongPress={async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  Alert.alert(tr("search.filterTitle"), tr("search.filterMessage"))
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
          {filteredGames.map((game) => (
            <GameCardCompact key={game.game_id} game={game} onDelete={(id) => setGames(prev => prev.filter(g => g.game_id !== id))} />
          ))}
        </View>
      ) : (
        filteredGames.map((game) => (
          <GameCard key={game.game_id} game={game} onDelete={(id) => setGames(prev => prev.filter(g => g.game_id !== id))} />
        ))
      )}
    </ScrollView>
    </>
  );
}
