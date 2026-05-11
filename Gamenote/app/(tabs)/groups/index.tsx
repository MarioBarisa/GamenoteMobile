import {ScrollView, Text, View, StyleSheet, Image, TouchableOpacity} from "react-native";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useGroups} from "@/context/GroupsContext";
import {Ionicons} from "@expo/vector-icons";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {router} from "expo-router";
import {SymbolView} from "expo-symbols";

const getGameCountLabel = (n: number) => {
    if (n === 1) return '1 igra';
    if (n === 2 || n === 3 || n === 4) return `${n} igre`;
    return `${n} igara`;
};

export default function GroupsIndex() {
    const {theme} = useTheme();
    const t = colors[theme];
    const {groups, getGamesInGroup} = useGroups();

    const getGroupGameImages = (groupId: string) => {
        const gameIds = getGamesInGroup(groupId);
        return gameIds
            .slice(0, 4)
            .map(gameId => PLACEHOLDER_GAMES.find(g => g.game_id === gameId))
            .filter(Boolean);
    };

    return (
        <ScrollView
            style={{backgroundColor: t.background}}
            contentInsetAdjustmentBehavior="automatic"
        >
            {groups.length === 0 ? (
                <Text style={{color: t.text, fontSize: 26, fontWeight: "bold", textAlign: "center", padding: 32}}>
                    Nemaš još niti jednu grupu.
                </Text>
            ) : (
                groups.map((group) => {
                    const groupGames = getGroupGameImages(group.id);
                    const isSingle = groupGames.length === 1;

                    return (
                        <TouchableOpacity
                            key={group.id}
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

                            {groupGames.length > 0 && (
                                <View style={styles.gamesPreview}>
                                    <View style={styles.gameImagesRow}>
                                        {groupGames.map((game, index) => (
                                            <View
                                                key={index}
                                                style={[
                                                    styles.gameImageWrapper,
                                                    isSingle && styles.gameImageWrapperSingle,
                                                ]}
                                            >
                                                {game?.image_url?.[0] ? (
                                                    <Image
                                                        source={{uri: game.image_url[0]}}
                                                        style={[
                                                            styles.gameImage,
                                                            isSingle && styles.gameImageSingle,
                                                        ]}
                                                        resizeMode="cover"
                                                    />
                                                ) : (
                                                    <View style={[
                                                        styles.gameImage,
                                                        isSingle && styles.gameImageSingle,
                                                        {
                                                            backgroundColor: t.background,
                                                            justifyContent: 'center',
                                                            alignItems: 'center'
                                                        }
                                                    ]}>
                                                        <Ionicons name="image-outline" size={isSingle ? 24 : 14}
                                                                  color={t.secondaryText}/>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={{color: t.secondaryText, fontSize: 11, marginTop: 4}}>
                                        {getGameCountLabel(groupGames.length)}
                                    </Text>
                                </View>
                            )}
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
    gameImageWrapperSingle: {
        flex: 0,
        width: '100%',
    },
    gameImage: {
        width: '100%',
        height: 75,
        borderRadius: 6,
        backgroundColor: '#f0f0f0',
    },
    gameImageSingle: {
        height: 120,
        borderRadius: 8,
    },
});