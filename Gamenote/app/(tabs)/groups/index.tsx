import {Image} from "expo-image";
import {RefreshControl, ScrollView, Text, View, StyleSheet, TouchableOpacity} from "react-native";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useGroups} from "@/context/GroupsContext";
import {Ionicons} from "@expo/vector-icons";
import {useUserGames} from "@/hooks/useUserGames";
import {useMemo} from "react";
import {router} from "expo-router";
import {SymbolView} from "expo-symbols";
import {useTranslation} from "react-i18next";



export default function GroupsIndex() {
    const {t: tr} = useTranslation();
    const {theme} = useTheme();
    const t = colors[theme];
    const {groups, getGamesInGroup, refreshGroups, isLoading: isLoadingGroups} = useGroups();

    const getGameCountLabel = (n: number) => {
        if (n === 1) return `${n} ${tr("groups.gameCountSingle")}`;
        if (n >= 2 && n <= 4) return `${n} ${tr("groups.gameCountFew")}`;
        return `${n} ${tr("groups.gameCountLabel")}`;
    };
    const {games, refresh: refreshGames, isLoading: isLoadingGames} = useUserGames();
    const gamesMap = useMemo(() => new Map(games.map(g => [g.db_id ?? g.game_id, g])), [games]);

    const getGroupGameImages = (groupId: string) => {
        const gameIds = getGamesInGroup(groupId);
        const found = gameIds
            .slice(0, 4)
            .map(gameId => gamesMap.get(gameId))
            .filter(Boolean);
        return Array.from({length: 4}, (_, i) => found[i] ?? null);
    };

    return (
        <ScrollView
            style={{backgroundColor: t.background}}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={
              <RefreshControl
                refreshing={isLoadingGroups || isLoadingGames}
                onRefresh={() => { refreshGames(); refreshGroups(); }}
              />
            }
        >
            {groups.length === 0 ? (
                <Text style={{color: t.text, fontSize: 26, fontWeight: "bold", textAlign: "center", padding: 32}}>
                    {tr("groups.empty")}
                </Text>
            ) : (
                groups.map((group) => {
                    const groupGames = getGroupGameImages(group.id);
                    const realCount = getGamesInGroup(group.id).length;

                    return (
                        <TouchableOpacity
                            key={group.id}
                            accessibilityLabel={tr("groups.openA11y", {name: group.name})}
                            style={[styles.card, {backgroundColor: t.card}]}
                            onPress={() => router.push({
                                pathname: "/(tabs)/groups/group-detail",
                                params: {id: group.id}
                            })}
                            activeOpacity={0.75}
                        >
                            <View style={styles.headerRow}>
                                <View style={styles.titleSection}>
                                    <Text style={{color: t.text, fontWeight: "700", fontSize: 18}}>{group.name}</Text>
                                    {group.type && (
                                        <Text style={{
                                            color: t.secondaryText,
                                            fontSize: 12,
                                            marginTop: 2
                                        }}>{group.type}</Text>
                                    )}
                                </View>
                                {typeof group.rating === 'number' ? (
                                    <View style={styles.ratingRow}>
                                        {[1, 2, 3, 4, 5].map(star => (
                                            <SymbolView
                                                key={star}
                                                name={star <= group.rating! ? 'star.fill' : 'star'}
                                                style={{width: 22, height: 22}}
                                                tintColor={star <= group.rating! ? '#FF9F0A' : t.secondaryText}
                                            />
                                        ))}
                                    </View>
                                ) : null}
                            </View>

                            <View style={styles.gamesPreview}>
                                <View style={styles.gameImagesRow}>
                                    {groupGames.map((game, index) => (
                                        <View key={index} style={styles.gameImageWrapper}>
                                            {game?.image_url ? (
                                                <Image
                                                    source={{uri: game.image_url}}
                                                    style={styles.gameImage}
                                                    contentFit="cover"
                                                    cachePolicy="memory-disk"
                                                    transition={{duration: 200, effect: "cross-dissolve"}}
                                                />
                                            ) : (
                                                <View style={[styles.gameImage, styles.gameImagePlaceholder, {backgroundColor: t.background}]}>
                                                    <Ionicons name="image-outline" size={18} color={t.secondaryText}/>
                                                </View>
                                            )}
                                        </View>
                                    ))}
                                </View>
                                <Text style={{color: t.secondaryText, fontSize: 11, marginTop: 4}}>
                                    {getGameCountLabel(realCount)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    card: {
        margin: 12,
        padding: 12,
        borderRadius: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    titleSection: {
        flex: 1,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    gamesPreview: {
        marginTop: 10,
    },
    gameImagesRow: {
        flexDirection: 'row',
        gap: 6,
    },
    gameImageWrapper: {
        flex: 1,
    },
    gameImage: {
        width: '100%',
        height: 72,
        borderRadius: 6,
    },
    gameImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});
