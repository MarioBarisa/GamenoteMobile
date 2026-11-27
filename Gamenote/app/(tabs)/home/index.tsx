import {useGamePresentation} from "@/context/localMode";
import {Image} from "expo-image";
import {useVerticalBarEdgeIOS} from "expo-status-bar";
import {Platform, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions} from "react-native";
import {useTheme} from "@/context/theme";
import GameLibraryList from "@/components/GameLibraryList";
import {useSettings} from "@/context/settings";
import {useCallback, useMemo, useState} from "react";
import {useUserGames} from "@/hooks/useUserGames";
import * as Haptics from "expo-haptics";
import {SymbolView} from "expo-symbols";
import {STATUS_CONFIG} from "@/common/StatusCommons";
import {router} from "expo-router";
import {useTranslation} from "react-i18next";

const POSTER_ASPECT_RATIO = 15 / 16;
const ADAPTIVE_CARD_WIDTH = 320;
const ADAPTIVE_CARD_PADDING = 12;

// noinspection JSUnusedGlobalSymbols
export default function HomeIndex() {
    const {t: tr} = useTranslation();
    const {themeColors: t} = useTheme();
    const {width, height} = useWindowDimensions();
    const verticalBarEdge = useVerticalBarEdgeIOS();
    const hasVerticalBar = verticalBarEdge === "leading" || verticalBarEdge === "trailing";
    const adaptivePoster = Platform.OS === "ios" && (Platform.isPad || hasVerticalBar || Math.min(width, height) >= 600);
    const {isLocal, imageUrl} = useGamePresentation();
    const {compactCards} = useSettings();
    const {games, deleteGame, refresh, isLoading} = useUserGames();
    const [refreshing, setRefreshing] = useState(false);
    const [poster, setPoster] = useState<{uri: string; aspectRatio: number} | null>(null);
    const [cardWidth, setCardWidth] = useState(ADAPTIVE_CARD_WIDTH);

    // Odvojeno stanje za pull-to-refresh
    const onRefresh = useCallback(async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        try {
            await refresh();
        } finally {
            setRefreshing(false);
        }
    }, [refresh]);

    // Duhovi samo na prvom učitavanju
    const showGhost = isLoading && games.length === 0;

    const {playtime, finishedGames, gameNumber, jumpBackGame, playingGames} = useMemo(() => {
        let playtime = 0;
        let finishedGames = 0;
        const playingGames = [];
        const jumpBackGames = [];

        for (const game of games) {
            playtime += game.play_time ?? 0;
            if (game.status === "completed") finishedGames += 1;
            if (game.status === "playing") playingGames.push(game);
            if (game.status === "paused" || game.status === "backlog") jumpBackGames.push(game);
        }

        const gameNumber = games.length;
        const jumpBackGame = jumpBackGames.length ? jumpBackGames[gameNumber % jumpBackGames.length] : null;
        return {playtime, finishedGames, gameNumber, jumpBackGame, playingGames};
    }, [games]);
    const posterUri = jumpBackGame ? imageUrl(jumpBackGame.image_url) : null;
    const posterAspectRatio = poster && poster.uri === posterUri ? poster.aspectRatio : 3 / 4;
    const posterWidth = Math.min(Math.max(0, cardWidth - ADAPTIVE_CARD_PADDING * 2),
        Math.min(320, height * 0.44) * posterAspectRatio);
    const posterStyle = adaptivePoster ? {width: posterWidth, height: posterWidth / posterAspectRatio} : styles.standardPoster;
    const onDelete = useCallback((id: string) => deleteGame(id), [deleteGame]);

    const openDetails = () => {
    if (!jumpBackGame) return;

    router.push({
        pathname: "/home/details",
        params: {game: JSON.stringify(jumpBackGame)},
    });
};

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
        <GameLibraryList
            compact={compactCards}
            games={playingGames}
            onDelete={onDelete}
            showSkeleton={showGhost}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} />}
            ListHeaderComponent={
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
            }
            ListFooterComponent={
                jumpBackGame ? (
                    <View style={[styles.jumpBack, adaptivePoster && styles.adaptiveJumpBack,
                        adaptivePoster && posterUri ? styles.adaptiveJumpBackWithPoster : null, {backgroundColor: t.backgroundModal}]}
                          onLayout={adaptivePoster && posterUri ? event => setCardWidth(event.nativeEvent.layout.width) : undefined}>
                        <Text style={[styles.title, {color: "#F43098"}]}>Jump back in!</Text>

                        <Pressable onPress={openDetails}>
                            <Text style={[styles.gameTitle, {color: t.text}]}>
                                {jumpBackGame.title}
                            </Text>
                        </Pressable>

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

                        {posterUri ? (
                            <Image
                                source={{uri: posterUri}}
                                style={[styles.image, posterStyle]}
                                contentFit={adaptivePoster ? "contain" : "cover"}
                                onLoad={adaptivePoster ? ({source}) => {
                                    if (source.width > 0 && source.height > 0) {
                                        setPoster({uri: posterUri, aspectRatio: source.width / source.height});
                                    }
                                } : undefined}
                                cachePolicy={isLocal ? "memory" : "memory-disk"}
                                transition={{duration: 200, effect: "cross-dissolve"}}

                            />
                        ) : null}

                        <Pressable
                            onPress={handlePress}
                            style={[styles.saveButton, adaptivePoster && styles.adaptiveSaveButton, {backgroundColor: "#605DFF"}]}
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
                ) : (
                    <View style={[styles.jumpBack, adaptivePoster && styles.adaptiveJumpBack, {backgroundColor: t.backgroundModal}]}>
                        <Text style={[styles.name, {color: "#00D391"}]}>
                            {tr("home.allPlayed")}
                        </Text>
                    </View>
                )
            }
        />
    );
}

const styles = StyleSheet.create({
    name: {
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
    },
    jumpBack: {
        borderRadius: 12,
        margin: 8,
        padding: 16,
        gap: 12,
    },
    adaptiveJumpBack: {
        width: "100%",
        maxWidth: 440,
        alignSelf: "center",
        marginHorizontal: 0,
    },
    adaptiveJumpBackWithPoster: {
        maxWidth: ADAPTIVE_CARD_WIDTH,
        padding: ADAPTIVE_CARD_PADDING,
        gap: 8,
    },
    image: {
        alignSelf: "center",
        width: "100%",
        borderRadius: 8,
    },
    standardPoster: {
        maxWidth: 400,
        aspectRatio: POSTER_ASPECT_RATIO,
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
    adaptiveSaveButton: {
        alignSelf: "center",
        margin: 0,
        marginBottom: 0,
        paddingHorizontal: 20,
    },
});
