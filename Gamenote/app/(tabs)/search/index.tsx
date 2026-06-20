import {useEffect, useMemo, useState} from "react";
import {ScrollView, StyleSheet, TouchableOpacity, Alert, View, Text, Image, Pressable, Linking} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useTheme } from "@/context/theme";
import { useSettings } from "@/context/settings";
import { colors } from "@/constants/theme";
import GameCard from "@/components/GameCard";
import GameCardCompact from "@/components/GameCardCompact";
import * as Haptics from 'expo-haptics';
import {useUserGames} from "@/hooks/useUserGames";
import {useAuth} from "@/context/auth";
import { SymbolView } from "expo-symbols";
import {useTranslation} from "react-i18next";
import {searchGames} from "@/services/gamesApi";

// noinspection JSUnusedGlobalSymbols
export default function SearchIndex() {
  const [search, setSearch] = useState("");
  const [userGamenotesOnly, setUserGamenotesOnly] = useState(true);
  const [sort] = useState(false);
  const [rawgResults, setRawgResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const {games, deleteGame} = useUserGames();
  const {loggedIn} = useAuth();
  const router = useRouter();

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
  }, [games, search, sort]);

  useEffect(() => {
    if (!search || userGamenotesOnly) {
      setRawgResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchGames(search);
        setRawgResults(data.results ?? []);
      } catch {
        setRawgResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, userGamenotesOnly]);

    useEffect(() => {
    if (!loggedIn) {
      setUserGamenotesOnly(true);
    }
  }, [loggedIn]);

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
                  if (!loggedIn) {
                    Alert.alert(tr('search.loginRequired'));
                    return;
                  }
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
        {userGamenotesOnly ? (
          compactCards ? (
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
              {filteredGames.map((game) => (
                <GameCardCompact key={game.db_id ?? game.game_id} game={game} onDelete={(id) => deleteGame(id)} />
              ))}
            </View>
          ) : (
            filteredGames.map((game) => (
              <GameCard key={game.db_id ?? game.game_id} game={game} onDelete={(id) => deleteGame(id)} />
            ))
          )
        ) : (
          <>
            {!isSearching && !search && rawgResults.length === 0 && (
              <Pressable
                onPress={() => {/* Native search bar is revealed via pull-down */}}
                style={{alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8}}
              >
                <SymbolView name="magnifyingglass" style={{width: 32, height: 32}} tintColor={t.secondaryText} />
                <Text style={{color: t.secondaryText, fontSize: 15, textAlign: 'center'}}>
                  {tr('search.rawgPrompt')}
                </Text>
              </Pressable>
            )}

            {isSearching && (
              <Text style={{color: t.secondaryText, textAlign: 'center', padding: 16}}>
                {tr('search.rawgSearching')}
              </Text>
            )}

            {!isSearching && search && rawgResults.length === 0 && (
              <Text style={{color: t.secondaryText, textAlign: 'center', padding: 16}}>
                {tr('search.rawgNoResults')}
              </Text>
            )}

            {rawgResults.length > 0 && (
              <Pressable
                onPress={() => Linking.openURL('https://rawg.io')}
                style={{marginBottom: 8, alignSelf: 'flex-start'}}
              >
                <Text style={{
                  color: t.secondaryText,
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {tr('search.rawgSectionTitle')}
                </Text>
              </Pressable>
            )}

            {rawgResults.map((rawg: any) => {
              const inLibrary = games.find(g => g.game_id === String(rawg.id));
              return (
              <Pressable
                key={rawg.id}
                onPress={() => {
                  router.push({
                    pathname: '/search/rawg-details',
                    params: {game: JSON.stringify(rawg)},
                  });
                }}
                style={({pressed}) => [{opacity: pressed ? 0.8 : 1}]}
              >
                <View style={[{
                  flexDirection: 'row',
                  borderRadius: 10,
                  overflow: 'hidden',
                  marginBottom: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                  backgroundColor: t.card,
                  shadowColor: '#000',
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  shadowOffset: {width: 0, height: 3},
                  elevation: 2,
                }]}>
                  {rawg.background_image ? (
                    <Image
                      source={{uri: rawg.background_image}}
                      style={{width: 100, aspectRatio: 16 / 9}}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{
                      width: 100,
                      aspectRatio: 16 / 9,
                      backgroundColor: t.background,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{color: t.secondaryText, fontSize: 11}}>{tr('common.noImage')}</Text>
                    </View>
                  )}
                  <View style={{flex: 1, padding: 10, justifyContent: 'center'}}>
                    <Text style={{color: t.text, fontSize: 16, fontWeight: '700'}} numberOfLines={2}>
                      {rawg.name}
                    </Text>
                    {inLibrary ? (
                      <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
                        <SymbolView name="checkmark.circle.fill" style={{width: 14, height: 14}} tintColor="#4cd964"/>
                        <Text style={{color: '#4cd964', fontSize: 12, fontWeight: '600'}}>
                          {tr('search.inLibrary')}
                        </Text>
                      </View>
                    ) : null}
                    <View style={{flexDirection: 'row', gap: 8, marginTop: 4}}>
                      {rawg.released ? (
                        <Text style={{color: t.secondaryText, fontSize: 12}}>
                          {rawg.released.split('-')[0]}
                        </Text>
                      ) : null}
                      {rawg.metacritic ? (
                        <View style={{
                          backgroundColor: (() => {
                            const m = rawg.metacritic;
                            if (m >= 90) return '#00CE7A';
                            if (m >= 75) return '#66CC33';
                            if (m >= 50) return '#FFCC33';
                            return '#FF0000';
                          })(),
                          paddingHorizontal: 6,
                          paddingVertical: 1,
                          borderRadius: 4,
                        }}>
                          <Text style={{color: '#fff', fontSize: 11, fontWeight: '700'}}>
                            {rawg.metacritic}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
              </Pressable>
              );
            })}
          </>
        )}
    </ScrollView>
    </>
  );
}
