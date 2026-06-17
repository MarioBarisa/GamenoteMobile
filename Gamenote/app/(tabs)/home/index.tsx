import {Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View} from "react-native";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import GameCard from "@/components/GameCard";
import GameCardCompact from "@/components/GameCardCompact";
import {useSettings} from "@/context/settings";
import {useMemo} from "react";
import {useUserGames} from "@/hooks/useUserGames";
import * as Haptics from "expo-haptics";
import {SymbolView} from "expo-symbols";
import {STATUS_CONFIG} from "@/common/StatusCommons";
import {router} from "expo-router";
import {useTranslation} from "react-i18next";

// noinspection JSUnusedGlobalSymbols
export default function HomeIndex() {
    const {t: tr} = useTranslation();
    const {theme} = useTheme();
    const t = colors[theme];
    const {compactCards} = useSettings();
    const {games, deleteGame, refresh, isLoading} = useUserGames();

    let playtime = 0;
    for (const game of games) {
        playtime = playtime + (game.play_time ?? 0);
    }

    const gameNumber = games.length;

    let finishedGames = 0;
    for (const game of games) {
        if (game.status === "completed") {
            finishedGames += 1;
        }
    }

    const jumpBackGame = useMemo(() => {
        const moguce = games.filter(
            (g) => g.status === "paused" || g.status === "backlog"
        );
        if (!moguce.length) {
            return null;
        } else {
            return moguce[Math.floor(Math.random() * moguce.length)];
        }
    }, [games]);

      const handlePress = () => {
      if (Platform.OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      router.push({
          pathname: '/(modals)/modalEdit',
          params: {game: JSON.stringify(jumpBackGame)},
      })
  }

    return (
        <ScrollView
            style={{backgroundColor: t.background}}
            contentContainerStyle={{padding: 16, gap: 0}}
            contentInsetAdjustmentBehavior="automatic"
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
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
                <View style={{flex: 1, alignItems: "center"}}>
                    <Text style={[styles.name, {color: t.text}]}>{tr("home.totalGames")}</Text>
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
                <View style={{flex: 1, alignItems: "center"}}>
                    <Text style={[styles.name, {color: t.text}]}>{tr("home.playtime")}</Text>
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
                <View style={{flex: 1, alignItems: "center"}}>
                    <Text style={[styles.name, {color: t.text}]}>{tr("home.completedGames")}</Text>
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

            {(() => {
                const igre = games.filter((g) => g.status === "playing");
                if (compactCards) {
                    return (
                        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
                            {igre.map((game) => (
                                <GameCardCompact key={game.db_id ?? game.game_id} game={game} onDelete={(id) => deleteGame(id)}/>
                            ))}
                        </View>
                    );
                }
                return igre.map((game) => (
                    <GameCard key={game.db_id ?? game.game_id} game={game} onDelete={(id) => deleteGame(id)}/>
                ));
            })()}

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

                        {jumpBackGame.image_url ? (
                            <Image
                                source={{uri: jumpBackGame.image_url}}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        ) : null}
                    </>
                ) : (
                    <Text style={[styles.name, {color: t.text}]}>
                        {tr("home.allPlayed")}
                    </Text>
                )}

                <Pressable
                    onPress={handlePress}
                    style={[styles.saveButton, {backgroundColor: "#605DFF"}]}
                >
                    <View style={{flexDirection: "row", alignItems: "center", gap: 6}}>

                        <Text style={{color: "#fff", fontWeight: "700", fontSize: 16}}>
                            {tr("home.playToday")}
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
        width: "100%",
        aspectRatio: 0.9375,
        maxWidth: 400,
        borderRadius: 8,
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