import {useLocalSearchParams, Stack, Link} from "expo-router";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme"
import {useGroups} from "@/context/GroupsContext";
import {Image, ScrollView, Text, View, StyleSheet, Pressable,} from "react-native";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {SymbolView} from "expo-symbols";
import {Ionicons} from "@expo/vector-icons";


export default function GroupDetail(){
    const { id } = useLocalSearchParams<{ id: string }>();
    const { theme } = useTheme();
    const t = colors[theme];
    const {groups, getGamesInGroup } = useGroups();

    const group = groups.find((g)=>g.id === id); // AKO grupa NIJE PRONAĐENA
    if(!group){
        return (
            <View style={{flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: t.background}}>
                <Text style={{color: t.text}}>Grupa nije pronađena.</Text>
            </View>
        );
    }

    const gameIds = getGamesInGroup(group.id);
    const games = gameIds
        .map((gameId) => PLACEHOLDER_GAMES.find((g)=>g.game_id === gameId))
        .filter((game): game is (typeof PLACEHOLDER_GAMES)[number] => Boolean(game));

    return (
        <>
            <Stack.Screen
                options={{
                    title: group.name,
                    headerBackTitle: 'Natrag',
                     headerRight: () => (
                        <Link
                            href={{
                                pathname: "/(modals)/modalEditGroups",
                                params: {group: JSON.stringify(group)}, // cijeli group objekt kao prop
                            }}
                            asChild
                        >
                            <Pressable hitSlop={10}>
                                <SymbolView
                                    name="square.and.pencil"
                                    resizeMode="scaleAspectFit"
                                    style={{width: 32, height: 32, justifyContent: 'center'}}
                                    tintColor={t.text}
                                />
                            </Pressable>
                        </Link>
                    ),
                }}
            />
            <ScrollView style={{backgroundColor: t.background}} contentContainerStyle={{paddingBottom: 16}}>
                <View style={styles.ratingRow}>
                    {group.type && (
                        <Text style={{
                            color: t.text,
                            fontSize: 18,
                            marginTop: 14,
                            fontWeight: "700"
                        }}><Text style={{color: t.secondaryText}}>Tip grupe: </Text>{group.type}</Text>
                    )}
                    {group.created_at && (
                        <Text style={{
                            color: t.text,
                            fontSize: 14,
                            marginTop: 14,
                            fontWeight: "700"
                        }}><Text style={{color: t.secondaryText}}>Grupa napravljena: </Text>{group.created_at}</Text>
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
                    {games.length} {games.length === 1 ? "igra" : "igara"}
                </Text>

                {games.map((game, index) => (
                    <View key={index} style={[styles.gameCard, {backgroundColor: t.card}]}>
                        {game?.image_url?.[0] ? (
                            <Image source={{uri: game.image_url[0]}} style={styles.gameImage} resizeMode="cover"/>
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
    height: 80,
  },
  gameInfo: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
});