import {useLocalSearchParams, Stack, Link, useRouter, useSegments} from "expo-router";
import {useState} from "react";
import {Image} from "expo-image";
import {ScrollView, StyleSheet, Text, View, Pressable, useWindowDimensions, Modal, Share} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Game} from "@/common/Game";
import {SeriesGame} from "@/common/GameSeries";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {SymbolView} from "expo-symbols";
import {STATUS_CONFIG, STATUS_PLATFORM} from "@/common/StatusCommons";
import {isProgressModeKey, PROGRESS_MODE_MAP, progressLabel, progressColor} from "@/common/ProgressSources";
import {useTranslation} from "react-i18next";
import {useUserGames} from "@/hooks/useUserGames";
import {useGroups} from "@/context/GroupsContext";

function getPrequelAndSequel(series: SeriesGame[], currentReleaseDate: string): { prequel?: SeriesGame; sequel?: SeriesGame } {
  const sorted = [...series].sort((a, b) => {
    if (!a.released) return 1;
    if (!b.released) return -1; // NE SVE IGRE SAMO IGRU PRIJE I IGRU POSLJE
    return new Date(a.released).getTime() - new Date(b.released).getTime();
  });

  const currentIndex = sorted.findIndex(s => s.released === currentReleaseDate);

  if (currentIndex === -1) {
    if (!currentReleaseDate) return {};
    const currentDate = new Date(currentReleaseDate).getTime();
    let closestBefore: SeriesGame | undefined;
    let closestAfter: SeriesGame | undefined;
    let minBeforeDiff = Infinity;
    let minAfterDiff = Infinity;

    for (const s of sorted) {
      if (!s.released) continue;
      const diff = new Date(s.released).getTime() - currentDate;
      if (diff < 0 && Math.abs(diff) < minBeforeDiff) {
        minBeforeDiff = Math.abs(diff);
        closestBefore = s;
      } else if (diff > 0 && diff < minAfterDiff) {
        minAfterDiff = diff;
        closestAfter = s;
      }
    }
    return { prequel: closestBefore, sequel: closestAfter };
  }

  return {
    prequel: currentIndex > 0 ? sorted[currentIndex - 1] : undefined,
    sequel: currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : undefined,
  };
}

export default function GameDetailsScreen() {
    const {t: tr} = useTranslation();
    const {theme} = useTheme();
    const t = colors[theme];
    const insets = useSafeAreaInsets();
    const {width: SCREEN_WIDTH} = useWindowDimensions();
    const isLargeScreen = SCREEN_WIDTH >= 400;
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const {game: gameParam} = useLocalSearchParams<{ game: string }>()
    const {games: userGames} = useUserGames();
    const {getGroupsForGame} = useGroups();
    const router = useRouter();
    const segments = useSegments();
    const tab = segments[1] as 'home' | 'favorites' | 'search';

    const game: Game | null = (() => {
        try {
            return gameParam ? JSON.parse(gameParam) : null
        } catch {
            return null;
        }
    })();
    if (!game) {
        return <Text style={{color: t.text, padding: 16}}>{tr('gameDetails.notFound')}</Text>
    }

    const navigateToReferencedGame = (seriesItem: SeriesGame) => {
      const matched = userGames.find(g => g.game_id === String(seriesItem.id));
      if (matched) {
        router.push({
          pathname: `/(tabs)/${tab}/details`,
          params: {game: JSON.stringify(matched)},
        });
      } else {
        router.push({
          pathname: '/(tabs)/search/rawg-details',
          params: {game: JSON.stringify({id: seriesItem.id, name: seriesItem.name, background_image: seriesItem.background_image})},
        });
      }
    };

    const {prequel, sequel} = getPrequelAndSequel(game?.series ?? [], game?.releaseDate ?? '');

    const galleryImages = [...new Set([undefined, ...(game.screenshot_urls ?? [])].filter(Boolean))] as string[]; // maknuo game.image_url, jer je to cover slika koja je dosta blurry zbog rezolucije.
    const prColor = progressColor(game.progress_value, game.progress_total)

    const mode = game.progress_mode && isProgressModeKey(game.progress_mode)
        ? PROGRESS_MODE_MAP[game.progress_mode]
        : null;

    const label = progressLabel(game.progress_mode, game.progress_value, game.progress_total);

    const metacriticColor = (() => {
        let meta;
        if (game?.metacriticScore === undefined) {
            meta = 0;
        } else {
            meta = game.metacriticScore;
        }
        const clamped = Math.max(0, Math.min(meta, 100))
        if (clamped >= 90) return '#00CE7A'
        if (clamped >= 75) return '#66CC33'
        if (clamped >= 50) return '#FFCC33'
        return '#FF0000'
    })()

    return (
        <>
            <Stack.Screen
                options={{
                    title: game.title,
                    headerBackTitle: tr("common.back"),
                    headerRight: () => (<View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                            <Link
                                href={{pathname: "/(modals)/modalEdit", params: {game: gameParam}}}
                                asChild
                            >
                                <Pressable accessibilityLabel={tr("gameDetails.editA11y")} hitSlop={10} style={{marginRight: 6, marginLeft: 4}}>
                                    <SymbolView
                                        name="square.and.pencil"
                                        style={{width: 32, height: 32}}
                                        tintColor={t.text}
                                    />
                                </Pressable>
                            </Link>

                            <Pressable
                                accessibilityLabel={tr("gameDetails.shareA11y")}
                                hitSlop={10}
                                onPress={() => {
                                    const shareUrl = `https://gamenote.eu/shared?id=${game.game_id}`;
                                    const message = tr('gameDetails.shareText', {
                                        gameName: game.title,
                                        shareUrl,
                                    });
                                    Share.share({ message });
                                }}
                                style={{marginRight: 6, marginLeft: 4}}
                            >
                                <SymbolView
                                    name="square.and.arrow.up"
                                    style={{width: 32, height: 32}}
                                    tintColor={t.text}
                                />
                            </Pressable>
                        </View>
                    ),
                }}
            />
            <ScrollView contentContainerStyle={{gap: 10, padding: 8}}
                        style={{backgroundColor: t.background}}
                        contentInsetAdjustmentBehavior="automatic"
                        automaticallyAdjustContentInsets={true}>
                <View style={[styles.card,
                    {
                        backgroundColor: t.card,
                        borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                    },
                ]}>

                    {galleryImages.length > 0 && (
                        <ScrollView
                            horizontal
                            decelerationRate="fast"
                            snapToInterval={(SCREEN_WIDTH - 32) + 8}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{
                                gap: 8,
                                paddingHorizontal: 8,
                                paddingTop: 8,
                                paddingBottom: 8
                            }}>
                            {galleryImages.map((uri, index) => (
                                <Pressable key={`${uri}-${index}`} onPress={() => setSelectedIndex(index)}>
                                    <Image
                                        source={{uri}}
                                        style={[styles.coverImage, {width: SCREEN_WIDTH - 32}]}
                                        contentFit="cover"
                                        cachePolicy="memory-disk"
                                        transition={{duration: 200, effect: "cross-dissolve"}}/>
                                </Pressable>
                            ))}
                        </ScrollView>
                    )}
                    <View style={{
                        padding: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                    }}>
                        {game.status ? (
                            <View
                                style={[
                                    styles.badge,
                                    {
                                        backgroundColor: STATUS_CONFIG[game.status]?.bg,
                                        marginBottom: 0,
                                    },
                                ]}
                            >
                                <Text style={{color: '#fff', fontWeight: '700', fontSize: isLargeScreen ? 15 : 13}}>
                                    {STATUS_CONFIG[game.status]?.label}
                                </Text>
                            </View>
                        ) : null}

                        {game.platform && STATUS_PLATFORM[game.platform] ? (
                            <View style={[
                                styles.badge,
                                {
                                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                                }
                            ]}>
                                <Text style={[styles.boldFont, {color: STATUS_PLATFORM[game.platform].text, fontSize: isLargeScreen ? 15 : 13}]}
                                      numberOfLines={1}
                                      adjustsFontSizeToFit
                                      minimumFontScale={0.8}>
                                    {typeof game.play_time === 'number'
                                        ? `${game.play_time}h via ${STATUS_PLATFORM[game.platform].label}`
                                        : `via ${STATUS_PLATFORM[game.platform].label}`}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={{paddingHorizontal: 12, paddingVertical: 8, gap: 16}}>


                        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                            {label ? (
                                <View style={{gap: 2}}>
                                    <Text style={{
                                        fontSize: 12,
                                        color: t.secondaryText,
                                        fontWeight: '700',
                                    }}>{mode?.label ?? tr("gameDetails.progressLabel")}</Text>
                                    <Text style={{fontSize: 18, fontWeight: '800', color: prColor}}>
                                        {label}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={{fontSize: 16, fontWeight: '600', color: t.secondaryText}}>{tr("gameDetails.noProgress")}</Text>)}

                            {typeof game.rating === 'number' && (
                                <View style={{flexDirection: 'row', gap: 4}}>
                                    {[1, 2, 3, 4, 5].map(star => (
                                        <SymbolView
                                            key={star}
                                            name={star <= game.rating! ? 'star.fill' : 'star'}
                                            style={{width: 24, height: 24}}
                                            tintColor={star <= game.rating! ? '#FF9F0A' : t.secondaryText}
                                        />
                                    ))}
                                </View>
                            )}

                        </View>

                        {!!(game.start_date || game.end_date) && (
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                                paddingVertical: isLargeScreen ? 8 : 6,
                                paddingHorizontal: isLargeScreen ? 16 : 12,
                                borderRadius: 8,
                                alignSelf: 'center'
                            }}>
                                {game.start_date ? (
                                    <Text style={{color: '#51d834', fontWeight: '700', fontSize: isLargeScreen ? 15 : 13}}
                                          numberOfLines={1}
                                          adjustsFontSizeToFit
                                          minimumFontScale={0.8}>
                                        {tr("gameDetails.startLabel")}{new Date(game.start_date).toLocaleDateString('en-GB')}
                                    </Text>
                                ) : <Text style={{color: t.secondaryText, fontSize: isLargeScreen ? 15 : 13}}>?</Text>}

                                <SymbolView
                                    name="arrow.right"
                                    style={{width: isLargeScreen ? 16 : 14, height: isLargeScreen ? 16 : 14}}
                                    tintColor={t.secondaryText}
                                />

                                {game.end_date ? (
                                    <Text style={{color: '#607de8', fontWeight: '700', fontSize: isLargeScreen ? 15 : 13}}
                                          numberOfLines={1}
                                          adjustsFontSizeToFit
                                          minimumFontScale={0.8}>
                                        {tr("gameDetails.endLabel")}{new Date(game.end_date).toLocaleDateString('en-GB')}
                                    </Text>
                                ) : <Text style={{color: t.secondaryText, fontSize: isLargeScreen ? 15 : 13}}>{tr("gameDetails.now")}</Text>}
                            </View>
                        )}
                        <Text style={{color: t.text, fontSize: 20, fontWeight: '600'}}>{tr("gameDetails.notesLabel")}</Text>
                        {game.notes ? (
                            <Text style={{fontStyle: 'italic', fontSize: 14, color: t.text}}>{game.notes}</Text>
                        ) : null}

                        {(() => {
                            const gameGroups = getGroupsForGame(game.db_id ?? game.game_id);
                            if (gameGroups.length === 0) return null;
                            return (
                                <>
                                    <Text style={{color: t.text, fontSize: 20, fontWeight: '600', marginTop: 12}}>{tr("gameDetails.groupsSection")}</Text>
                                    {gameGroups.map((g) => (
                                        <Pressable
                                            key={g.id}
                                            onPress={() => router.push({pathname: "/(tabs)/groups/group-detail", params: {id: g.id}})}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                paddingVertical: 8,
                                                paddingHorizontal: 12,
                                                borderRadius: 10,
                                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                                                marginTop: 4,
                                            }}
                                        >
                                            <Text style={{color: t.text, fontSize: 14, fontWeight: '600', flex: 1}}>{g.name}</Text>
                                            <SymbolView name="chevron.right" style={{width: 14, height: 14}} tintColor={t.secondaryText} />
                                        </Pressable>
                                    ))}
                                </>
                            );
                        })()}

                    </View>
                </View>
                <View style={[styles.card, {
                    backgroundColor: t.card,
                    borderColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                }]}>
                    <Pressable
                        onPress={() => setShowDetails(prev => !prev)}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 16,
                        }}
                    >
                        <Text style={{color: t.text, fontSize: 18, fontWeight: '700'}}>
                            {tr("gameDetails.detailsSection")}
                        </Text>
                        <SymbolView
                            name={showDetails ? 'chevron.up' : 'chevron.down'}
                            style={{width: 18, height: 18}}
                            tintColor={t.secondaryText}
                        />
                    </Pressable>

                    {showDetails && (
                        <View style={{
                            paddingHorizontal: 16,
                            paddingTop: 12,
                            gap: 12,
                            borderTopWidth: StyleSheet.hairlineWidth,
                            borderTopColor: theme === 'dark' ? '#2C2C2E' : '#E5E5EA',
                        }}>
                            {game.genre ? (
                                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.genre")}</Text>
                                    <Text style={{color: t.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right'}}>{game.genre}</Text>
                                </View>
                            ) : null}

                            {game.publisher ? (
                                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.developer")}</Text>
                                    <Text
                                        style={{color: t.text, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right'}}>{game.publisher}</Text>
                                </View>
                            ) : null}

                            {game.releaseDate ? (
                                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.releaseYear")}</Text>
                                    <Text style={{
                                        color: t.text,
                                        fontSize: 14,
                                        fontWeight: '600'
                                    }}>{game.releaseDate}</Text>
                                </View>
                            ) : null}

                            {game.metacriticScore ? (
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.metacritic")}</Text>
                                    <View style={{
                                        backgroundColor: metacriticColor,
                                        width: 36,
                                        height: 36,
                                        borderRadius: 4,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderColor: 'rgba(0,0,0,0.1)'
                                    }}>
                                        <Text style={{
                                            color: '#FFFFFF',
                                            fontSize: 16,
                                            fontWeight: 'bold'
                                        }}>
                                            {game.metacriticScore}
                                        </Text>
                                    </View>
                                </View>
                            ) : null}

                            {game.series && game.series.length > 0 ? (
                                <View style={{gap: 8, marginTop: 8}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14, marginBottom: 4}}>
                                        {tr("gameDetails.seriesSection")}
                                    </Text>
                                    {prequel ? (() => {
                                        const year = prequel.released ? prequel.released.split('-')[0] : '';
                                        return (
                                            <Pressable
                                                key={`prequel-${prequel.id}`}
                                                onPress={() => navigateToReferencedGame(prequel)}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                                                    padding: 8,
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <Image
                                                    source={{uri: prequel.background_image}}
                                                    style={{width: 100, aspectRatio: 10 / 7, borderRadius: 4}}
                                                    contentFit="cover"
                                                    cachePolicy="memory-disk"
                                                    transition={{duration: 200, effect: "cross-dissolve"}}
                                                />
                                                <View style={{flex: 1}}>
                                                    <Text
                                                        style={{color: t.text, fontSize: 14, fontWeight: '600'}}
                                                        numberOfLines={1}
                                                    >
                                                        {prequel.name}
                                                    </Text>
                                                    {year ? (
                                                        <Text style={{color: t.secondaryText, fontSize: 12}}>
                                                            {year}.
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </Pressable>
                                        );
                                    })() : (
                                        <Text style={{color: t.secondaryText, fontSize: 13, fontStyle: 'italic'}}>
                                            {tr("gameDetails.noPrequel")}
                                        </Text>
                                    )}
                                    {sequel ? (() => {
                                        const year = sequel.released ? sequel.released.split('-')[0] : '';
                                        return (
                                            <Pressable
                                                key={`sequel-${sequel.id}`}
                                                onPress={() => navigateToReferencedGame(sequel)}
                                                style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 12,
                                                    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                                                    padding: 8,
                                                    borderRadius: 8,
                                                }}
                                            >
                                                <Image
                                                    source={{uri: sequel.background_image}}
                                                    style={{width: 100, aspectRatio: 10 / 7, borderRadius: 4}}
                                                    contentFit="cover"
                                                    cachePolicy="memory-disk"
                                                    transition={{duration: 200, effect: "cross-dissolve"}}
                                                />
                                                <View style={{flex: 1}}>
                                                    <Text
                                                        style={{color: t.text, fontSize: 14, fontWeight: '600'}}
                                                        numberOfLines={1}
                                                    >
                                                        {sequel.name}
                                                    </Text>
                                                    {year ? (
                                                        <Text style={{color: t.secondaryText, fontSize: 12}}>
                                                            {year}.
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </Pressable>
                                        );
                                    })() : (
                                        <Text style={{color: t.secondaryText, fontSize: 13, fontStyle: 'italic'}}>
                                            {tr("gameDetails.noSequel")}
                                        </Text>
                                    )}
                                </View>
                            ) : null}

                            {game.about ? (
                                <View style={{gap: 4}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>{tr("gameDetails.descriptionSection")}</Text>
                                    <Text style={{color: t.text, fontSize: 14, lineHeight: 20}}>{game.about}</Text>
                                </View>
                            ) : null}

                        </View>
                    )}
                </View>

            </ScrollView>
            <Modal
                visible={selectedIndex !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedIndex(null)}>
                <View style={styles.modalOverlay}>
                    <View style={{paddingTop: insets.top}}>
                        <Pressable style={styles.modalCloseArea} onPress={() => setSelectedIndex(null)}>
                            <SymbolView
                                name="xmark.circle.fill"
                                style={{width: 40, height: 40}}
                                tintColor="rgba(255,255,255,0.85)"
                            />
                        </Pressable>
                    </View>
                    {galleryImages.length > 0 && (
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            contentOffset={{
                                x: (selectedIndex ?? 0) * SCREEN_WIDTH,
                                y: 0,
                            }}
                        >
                            {galleryImages.map((uri) => (
                                <ScrollView
                                    key={uri}
                                    style={{width: SCREEN_WIDTH, height: '100%'}}
                                    minimumZoomScale={1}
                                    maximumZoomScale={5}
                                    showsHorizontalScrollIndicator={false}
                                    showsVerticalScrollIndicator={false}
                                    centerContent={true}
                                >
                                    <Image
                                        source={{uri}}
                                        style={{width: SCREEN_WIDTH, aspectRatio: 4 / 3}}
                                        contentFit="contain"
                                        cachePolicy="memory-disk"
                                        transition={{duration: 200, effect: "cross-dissolve"}}
                                    />
                                </ScrollView>
                            ))}
                        </ScrollView>
                    )}
                </View>
            </Modal>
        </>

    );
}


const styles = StyleSheet.create({
    coverImage: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
    },
    title: {
        fontSize: 24, fontWeight: '800', marginBottom: 8
    },
    badge: {
        alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 8
    },
    meta: {
        fontSize: 13, marginTop: 4
    },
    notesBox: {
        padding: 12, borderRadius: 10, marginTop: 12
    },
    card: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: {width: 0, height: 3},
        elevation: 2,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    boldFont: {
        fontWeight: '700'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
    },
    modalCloseArea: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        zIndex: 1,
    },
    closeText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
})