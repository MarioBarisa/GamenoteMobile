import { useMemo, useState } from "react";
import {ScrollView, View, Text, TouchableOpacity, ActionSheetIOS} from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/context/theme";
import { useSettings } from "@/context/settings";
import { colors } from "@/constants/theme";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {STATUS_PLATFORM} from "@/common/StatusCommons";
import GameCard from "@/components/GameCard";
import GameCardCompact from "@/components/GameCardCompact";
import { SymbolView } from "expo-symbols";
import * as Haptics from 'expo-haptics';

export default function FavoritesScreen() {
  const [sortBy, setSortBy] = useState<'rating' | 'playtime'>('rating');
  const [platformFilter, setPlatformFilter] = useState<string | null>(null);

  const { theme } = useTheme();
  const t = colors[theme];
  const {compactCards} = useSettings();

  const platforms = useMemo(
    () => [...new Set(PLACEHOLDER_GAMES.map(g => g.platform).filter(Boolean))] as string[],
    []
  );

  const filteredGames = useMemo(() => {
    let results = [...PLACEHOLDER_GAMES];
    if (platformFilter) {
      results = results.filter(g => g.platform === platformFilter);
    }
    if (sortBy === 'rating') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'playtime') {
      results.sort((a, b) => (b.play_time || 0) - (a.play_time || 0));
    }
    return results;
  }, [sortBy, platformFilter]);

  function toggleSort() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSortBy(prev => prev === 'rating' ? 'playtime' : 'rating');
  }

  function showPlatformSheet() {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: "Odaberi platformu:",
        options: ['Odustani', 'Sve platforme', ...platforms],
        cancelButtonIndex: 0,
      },
      (i) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (i === 1) setPlatformFilter(null);
        if (i > 1) setPlatformFilter(prev => prev === platforms[i - 2] ? null : platforms[i - 2]);
      }
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              accessibilityLabel="Sortiraj igre"
              onPress={toggleSort}
            >
              <SymbolView
                name={sortBy === 'rating' ? 'star.fill' : 'clock.fill'}
                style={{ width: 28, height: 28, marginLeft: 4 }}
                tintColor={sortBy === 'rating' ? '#FFD700' : t.accent}
              />
            </TouchableOpacity>
          ),
          headerLeft: () => (
            <TouchableOpacity
              accessibilityLabel="Filtriraj po platformi"
              onPress={showPlatformSheet}
            >
              {platformFilter ? (
                <Text
                  style={{
                    color: STATUS_PLATFORM[platformFilter]?.text ?? t.text,
                    fontSize: 17,
                    padding: 4,
                    fontWeight: "600"
                  }}
                >
                  {STATUS_PLATFORM[platformFilter]?.label ?? platformFilter}
                </Text>
              ) : (
                <SymbolView
                  name="gamecontroller.fill"
                  style={{ width: 28, height: 28, marginLeft: 4 }}
                  tintColor={t.text}
                />
              )}
            </TouchableOpacity>
          )
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
              <GameCardCompact key={i} game={game} />
            ))}
          </View>
        ) : (
          filteredGames.map((game, i) => (
            <GameCard key={i} game={game} />
          ))
        )}
      </ScrollView>
    </>
  );
}


