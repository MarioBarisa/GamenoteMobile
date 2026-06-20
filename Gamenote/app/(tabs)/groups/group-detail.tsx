import {useLocalSearchParams, Stack, Link, useRouter} from "expo-router";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme"
import {useGroups} from "@/context/GroupsContext";
import {Image} from "expo-image";
import {ScrollView, Text, View, StyleSheet, Pressable,} from "react-native";
import {useUserGames} from "@/hooks/useUserGames";
import {useMemo} from "react";
import {SymbolView} from "expo-symbols";
import {Ionicons} from "@expo/vector-icons";
import {useTranslation} from "react-i18next";


export default function GroupDetail(){
    const { t: tr } = useTranslation();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { theme } = useTheme();
    const t = colors[theme];
    const {groups, getGamesInGroup } = useGroups();
    const router = useRouter();
    const {games: allGames} = useUserGames();
    const gamesMap = useMemo(() => new Map(allGames.map(g => [g.db_id ?? g.game_id, g])), [allGames]);

    const group = groups.find((g)=>g.id === id); // AKO grupa NIJE PRONAĐENA
    if(!group){
        return (
            <View style={{flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.background}}>
                <Text style={{color: t.text}}>{tr("groups.notFound")}</Text>
            </View>
        );
    }

    const gameIds = getGamesInGroup(group.id);
    const games = gameIds
        .map((gameId) => gamesMap.get(gameId))
        .filter((game): game is NonNullable<typeof game> => Boolean(game));

    return (
        <>
            <Stack.Screen
                options={{
                    title: group.name,
                    headerBackTitle: tr("common.back"),
                     headerRight: () => (
                        <Link
                            href={{
                                pathname: "/(modals)/modalEditGroups",
                                params: {group: JSON.stringify(group)},
                            }}
                            asChild
                        >
                            <Pressable accessibilityLabel={tr("groups.editA11y")} hitSlop={10}>
                                <SymbolView
                                    name="square.and.pencil"

                                    style={{width: 32, height: 32, justifyContent: 'center'}}
                                    tintColor={t.text}
                                />
                            </Pressable>
                        </Link>
                    ),
                }}
            />
            <ScrollView style={{backgroundColor: t.background}} contentContainerStyle={{paddingBottom: 16}} contentInsetAdjustmentBehavior="automatic" >
                <View style={styles.ratingRow}>
                    {group.type && (
                        <Text style={{
                            color: t.text,
                            fontSize: 18,
                            marginTop: 14,
                            fontWeight: "700"
                        }}><Text style={{color: t.secondaryText}}>{tr("groups.typeLabel")}</Text>{group.type}</Text>
                    )}
                    {group.created_at && (
                        <Text style={{
                            color: t.text,
                            fontSize: 14,
                            marginTop: 14,
                            fontWeight: "700"
                        }}><Text style={{color: t.secondaryText}}>{tr("groups.createdLabel")}</Text>{new Date(group.created_at).toLocaleDateString('en-GB').replace(/\//g, '.')}</Text>
                    )}
                    {group.user_notes && (
                        <Text style={{color: t.text, fontSize: 16, marginTop: 14, fontStyle: "italic"}}>{group.user_notes}</Text>
                    )}
                </View>
                {typeof group.rating === "number" && (
                    <View style={styles.ratingRowStars}>
                        {[1, 2, 3, 4, 5].map(star => (
                            <SymbolView
                                key={star}
                                name={star <= group.rating! ? 'star.fill' : 'star'}
                                style={{width: 34, height: 34}}
                                tintColor={star <= group.rating! ? '#FF9F0A' : t.secondaryText}
                            />
                        ))}
                    </View>
                )}
                <Text style={{color: t.secondaryText, fontSize: 13, margin: 16, marginBottom: 8}}>
                    {games.length > 0 ? `${games.length} ${games.length === 1 ? tr("groups.gameCountSingle") : tr("groups.gameCountLabel", {count: games.length})}` : ""}
                </Text>

                {games.map((game, index) => (
                    <Pressable key={index} onPress={() => router.push({ //KADA KORISNIK KLIKNE NA NEKU IGRU OTVORI DETALJE IGRE
                        pathname: "/(tabs)/groups/details",
                        params: { game: JSON.stringify(game) },
                    })}>
                        <View style={[styles.gameCard, {backgroundColor: t.card}]}>
                            {game?.image_url ? (
                                <Image source={{uri: game.image_url}} style={styles.gameImage} contentFit="cover" cachePolicy="memory-disk" transition={{duration: 200, effect: "cross-dissolve"}}/>
                            ) : (
                                <View style={[styles.gameImage, {
                                    backgroundColor: t.background,
                                    justifyContent: "center",
                                    alignItems: "center"
                                }]}>
                                    <Ionicons name="image-outline" size={24} color={t.secondaryText}/>
                                </View>
                            )}
                            <View style={styles.gameInfo}>
                                <Text style={{color: t.text, fontWeight: "600", fontSize: 15}}>{game?.title}</Text>
                                {game?.genre && (
                                    <Text style={{color: t.secondaryText, fontSize: 12, marginTop: 2}}>{game.genre}</Text>
                                )}
                            </View>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </>
    );
}


const styles = StyleSheet.create({
  header: {
    padding: 20,
    margin: 12,
    borderRadius: 12,
  },
  ratingRow: {
    flexDirection: "column",
    //marginTop: 4,
      padding: 4,
  },
    ratingRowStars: {
    flexDirection: "row",
    alignItems: "center",
        padding: 8,
    marginTop: 4,
  },
  gameCard: {
    flexDirection: "row",
    margin: 12,
    marginTop: 0,
    borderRadius: 10,
    overflow: "hidden",
  },
  gameImage: {
    width: 80,
    aspectRatio: 1,
  },
  gameInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
});