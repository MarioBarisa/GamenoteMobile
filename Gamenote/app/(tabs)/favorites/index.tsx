import {useMemo, useState} from "react";
import {ScrollView, View, Text, TouchableOpacity, ActionSheetIOS, Pressable} from "react-native";
import {Stack} from "expo-router";
import {useTheme} from "@/context/theme";
import {useSettings} from "@/context/settings";
import {colors} from "@/constants/theme";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {STATUS_PLATFORM} from "@/common/StatusCommons";
import GameCard from "@/components/GameCard";
import GameCardCompact from "@/components/GameCardCompact";
import {SymbolView} from "expo-symbols";
import * as Haptics from 'expo-haptics';

type FilterKey = 'top_rated' | 'completed' | 'playing' | 'paused' | 'dropped' | 'backlog' | 'wishlist';

const FILTER_ITEMS: { key: FilterKey; icon: string; label: string; color: string }[] = [ // vrsta switchera
    {key: 'top_rated', icon: 'star.fill', label: '5/5', color: '#FFD700'},
    {key: 'completed', icon: 'rosette', label: '100%', color: '#30D158'},
    {key: 'playing', icon: 'play.circle', label: 'Igram', color: '#0A84FF'},
    {key: 'paused', icon: 'pause.circle', label: 'Pauza', color: '#FF9F0A'},
    {key: 'dropped', icon: 'multiply.circle', label: 'Dropped', color: '#FF453A'},
    {key: 'backlog', icon: 'tray.full', label: 'Backlog', color: '#b364da'},
    {key: 'wishlist', icon: 'heart', label: 'Wishlist', color: '#00ddf1'},
];

export default function FavoritesScreen() {
    const [sortBy, setSortBy] = useState<'rating' | 'playtime'>('rating');
    const [platformFilter, setPlatformFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<FilterKey | null>(null);

    const {theme} = useTheme();
    const t = colors[theme];
    const {compactCards} = useSettings();

    const [games, setGames] = useState(PLACEHOLDER_GAMES);

    const platforms = useMemo(
        () => [...new Set(games.map(g => g.platform).filter(Boolean))] as string[],
        [games]
    );

    const filteredGames = useMemo(() => {
        let results = [...games];
        if (platformFilter) {
            results = results.filter(g => g.platform === platformFilter);
        }
        if (statusFilter === 'top_rated') {
            results = results.filter(g => g.rating === 5);
        } else if (statusFilter) {
            results = results.filter(g => g.status === statusFilter);
        }
        if (sortBy === 'rating') {
            results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        } else if (sortBy === 'playtime') {
            results.sort((a, b) => (b.play_time || 0) - (a.play_time || 0));
        }
        return results;
    }, [games, sortBy, platformFilter, statusFilter]);

    function toggleSort() {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // nije potrbeno jace, samo light tap da korisnik dobije feedback
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
                                style={{width: 28, height: 28, marginLeft: 4}}
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
                                    style={{width: 28, height: 28, marginLeft: 4}}
                                    tintColor={t.text}
                                />
                            )}
                        </TouchableOpacity>
                    )
                }}
            />
            <ScrollView
                style={{backgroundColor: t.background}}
                contentContainerStyle={{padding: 16, gap: 0}}
                contentInsetAdjustmentBehavior="automatic"
            >
                <View style={{
                    flexDirection: "row", justifyContent: "space-evenly", alignItems: "center",
                    backgroundColor: t.card, borderRadius: 12, marginBottom: 10, paddingVertical: 10
                }}>
                    {FILTER_ITEMS.map(item => {
                        const active = statusFilter === item.key;
                        return (
                            <Pressable
                                key={item.key}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                                    setStatusFilter(prev => prev === item.key ? null : item.key);
                                }}
                                style={{
                                    alignItems: 'center', padding: 6, borderRadius: 10,
                                    backgroundColor: active ? `${item.color}30` : 'transparent',
                                    opacity: statusFilter && !active ? 0.35 : 1
                                }}
                            >
                                <SymbolView name={item.icon as any} style={{width: 35, height: 35}}
                                            tintColor={item.color}/>
                                <Text style={{fontSize: 10, color: t.secondaryText, marginTop: 4, fontWeight: "bold"}}>
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
                {compactCards ? (
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
                        {filteredGames.map((game) => (
                            <GameCardCompact key={game.game_id} game={game} onDelete={(id) => setGames(prev => prev.filter(g => g.game_id !== id))}/>
                        ))}
                    </View>
                ) : (
                    filteredGames.map((game) => (
                        <GameCard key={game.game_id} game={game} onDelete={(id) => setGames(prev => prev.filter(g => g.game_id !== id))}/>
                    ))
                )}
            </ScrollView>
        </>
    );
}


