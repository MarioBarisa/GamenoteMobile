import {Image, Platform, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import GameCard from "@/components/GameCard";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {useMemo} from "react";
import * as Haptics from "expo-haptics";
import {SymbolView} from "expo-symbols";
import {STATUS_CONFIG} from "@/common/StatusCommons";

// noinspection JSUnusedGlobalSymbols
export default function HomeIndex() {
    const {theme} = useTheme();
    const t = colors[theme];

    let playtime = 0;
    for (const game of PLACEHOLDER_GAMES) {
        // @ts-ignore
        playtime = playtime + game.play_time;
    }

    const gameNumber = PLACEHOLDER_GAMES.length;

    let finishedGames = 0;
    for (const game of PLACEHOLDER_GAMES) {
        if (game.status === "completed") {
            finishedGames += 1;
        }
    }

    const jumpBackGame = useMemo(() => {
        const moguce = PLACEHOLDER_GAMES.filter(
            (g) => g.status === "paused" || g.status === "backlog"
        );
        if (!moguce.length) {
            return null;
        } else {
            return moguce[Math.floor(Math.random() * moguce.length)];
        }
    }, [PLACEHOLDER_GAMES]);

    // @ts-ignore
    // @ts-ignore
    return (
        <ScrollView
            style={{backgroundColor: t.background}}
            contentContainerStyle={{padding: 16, gap: 0}}
            contentInsetAdjustmentBehavior="automatic"
        >
            <View
                style={{
                    flexDirection: "row",
                    gap: 12,
                    marginBottom: 12,
                    padding: 16,
                    justifyContent: "center",
                    backgroundColor: t.backgroundModal,
                    borderRadius: 12,
                }}
            >
                <View>
                    <Text style={[styles.name, {color: t.text}]}>Ukupno igara</Text>
                    <Text
                        style={{
                            textAlign: "center",
                            color: "#F43098",
                            fontSize: 16,
                            fontWeight: "bold",
                        }}
                    >
                        {gameNumber}
                    </Text>
                </View>
                <View>
                    <Text style={[styles.name, {color: t.text}]}>Vrijeme igranja</Text>
                    <Text
                        style={{
                            textAlign: "center",
                            color: "#00D3BC",
                            fontSize: 16,
                            fontWeight: "bold",
                        }}
                    >
                        {playtime}
                    </Text>
                </View>
                <View>
                    <Text style={[styles.name, {color: t.text}]}>Završene igre</Text>
                    <Text
                        style={{
                            textAlign: "center",
                            color: "#00D391",
                            fontSize: 16,
                            fontWeight: "bold",
                        }}
                    >
                        {finishedGames}
                    </Text>
                </View>
            </View>

            {PLACEHOLDER_GAMES.filter((g) => g.status === "playing").map((game, i) => (
                <GameCard key={i} game={game}/>
            ))}

            <View
                style={{
                    backgroundColor: t.backgroundModal,
                    borderRadius: 12,
                    margin: 8,
                    padding: 16,
                    flexDirection: "column",
                    gap: 12,
                }}
            >
                <Text style={[styles.title, {color: "#F43098"}]}>Jump back in!</Text>

                {jumpBackGame ? (
                    <>
                        <Text style={[styles.gameTitle, {color: t.text}]}>
                            {jumpBackGame.title}
                        </Text>

                        <View
                            style={{
                                flexDirection: "row",
                                gap: 12,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {jumpBackGame.status ? (
                                <Text style={[styles.gameInfo, {color: t.secondaryText}]}>
                                    {STATUS_CONFIG[jumpBackGame.status].label}
                                </Text>
                            ) : null}

                            {jumpBackGame.platform ? (
                                <Text style={[styles.gameInfo, {color: t.secondaryText}]}>
                                    {jumpBackGame.platform}
                                </Text>
                            ) : null}
                        </View>

                        {jumpBackGame.image_url?.[0] ? (
                            <Image
                                source={{uri: jumpBackGame.image_url[0]}}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        ) : null}
                    </>
                ) : (
                    <Text style={[styles.name, {color: t.text}]}>
                        Sve igre su odigrane. Bravo!
                    </Text>
                )}

                <Pressable
                    onPress={() => {
                        // SAVE GUMB
                        // handleSave();
                        if (Platform.OS === "ios") {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                    }}
                    style={[styles.saveButton, {backgroundColor: "#605DFF"}]}
                >
                    <View style={{flexDirection: "row", alignItems: "center", gap: 6}}>
                        <Text style={{color: "#fff", fontWeight: "700", fontSize: 16}}>
                            Igraj danas!
                        </Text>
                        <SymbolView
                            name="play.circle.fill"
                            style={{width: 24, height: 24}}
                            tintColor={"#fff"}
                        />
                    </View>
                </Pressable>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    name: {
        fontSize: 12,
        fontWeight: "bold",
        textAlign: "center",
    },
    image: {
        alignSelf: "center",
        width: 200,
        height: 250,
        borderRadius: 8,
        paddingBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        textAlign: "center",
    },
    gameTitle: {
        fontSize: 24,
        fontWeight: "bold",
        textAlign: "center",
    },
    gameInfo: {
        fontSize: 16,
        fontWeight: "bold",
        textAlign: "center",
    },
    type: {
        fontSize: 15,
        fontWeight: "600",
        textAlign: "center",
        marginLeft: 80,
    },
    saveButton: {
        margin: 8,
        padding: 10,
        borderRadius: 24,
        alignItems: "center",
        marginBottom: 8,
    },
});