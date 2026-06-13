import {useLocalSearchParams, Stack, Link} from "expo-router";
import {useState} from "react";
import {Image, ScrollView, StyleSheet, Text, View, Pressable, useWindowDimensions, Modal, Alert} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {Game} from "@/common/Game";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {SymbolView} from "expo-symbols";
import {STATUS_CONFIG, STATUS_PLATFORM} from "@/common/StatusCommons";
import {isProgressModeKey, PROGRESS_MODE_MAP, progressLabel, progressColor} from "@/common/ProgressSources";

export default function GameDetailsScreen() {
    const {theme} = useTheme();
    const t = colors[theme];
    const insets = useSafeAreaInsets();
    const {width: SCREEN_WIDTH} = useWindowDimensions();
    const isLargeScreen = SCREEN_WIDTH >= 400;
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [showDetails, setShowDetails] = useState<boolean>(false);
    const {game: gameParam} = useLocalSearchParams<{ game: string }>()

    const game: Game | null = (() => {
        try {
            return gameParam ? JSON.parse(gameParam) : null
        } catch {
            return null;
        }
    })();
    if (!game) {
        return <Text style={{color: t.text, padding: 16}}>Igra nije pronađena</Text>
    }

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
                    headerBackTitle: 'Natrag',
                    headerRight: () => (<View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                            <Link
                                href={{pathname: "/(modals)/modalEdit", params: {game: gameParam}}}
                                asChild
                            >
                                <Pressable accessibilityLabel="Uredi igru" hitSlop={10} style={{marginRight: 6, marginLeft: 4}}>
                                    <SymbolView
                                        name="square.and.pencil"
                                        resizeMode="scaleAspectFit"
                                        style={{width: 32, height: 32}}
                                        tintColor={t.text}
                                    />
                                </Pressable>
                            </Link>

                            <Pressable
                                accessibilityLabel="Podijeli igru."
                                hitSlop={10}
                                onPress={() => {Alert.alert('', `Link je kopiran.`, [   {text: 'Ok', onPress: () => null}
        ]);// ovdje netlify function za share gen
                                }}
                                style={{marginRight: 6, marginLeft: 4}}
                            >
                                <SymbolView
                                    name="square.and.arrow.up"
                                    resizeMode="scaleAspectFit"
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

                    {Array.isArray(game.image_url) && game.image_url.length > 0 && (
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
                            {game.image_url.map((uri, index) => (
                                <Pressable key={uri} onPress={() => setSelectedIndex(index)}>
                                    <Image
                                        key={uri}
                                        source={{uri}}
                                        style={[styles.coverImage, {width: SCREEN_WIDTH - 32}]}
                                        resizeMode="cover"/></Pressable>
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
                                    }}>{mode?.label ?? 'Progress'}</Text>
                                    <Text style={{fontSize: 18, fontWeight: '800', color: prColor}}>
                                        {label}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={{fontSize: 16, fontWeight: '600', color: t.secondaryText}}>Još nema
                                    progressa</Text>)}

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
                                        Start: {new Date(game.start_date).toLocaleDateString('hr-HR')}
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
                                        End: {new Date(game.end_date).toLocaleDateString('hr-HR')}
                                    </Text>
                                ) : <Text style={{color: t.secondaryText, fontSize: isLargeScreen ? 15 : 13}}>Sada</Text>}
                            </View>
                        )}
                        <Text style={{color: t.text, fontSize: 20, fontWeight: '600'}}>Tvoje bilješke:</Text>
                        {game.notes ? (
                            <Text style={{fontStyle: 'italic', fontSize: 14, color: t.text}}>{game.notes}</Text>
                        ) : null}

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
                            Detalji igre
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
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>Žanr</Text>
                                    <Text style={{color: t.text, fontSize: 14, fontWeight: '600'}}>{game.genre}</Text>
                                </View>
                            ) : null}

                            {game.publisher ? (
                                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>Developer</Text>
                                    <Text
                                        style={{color: t.text, fontSize: 14, fontWeight: '600'}}>{game.publisher}</Text>
                                </View>
                            ) : null}

                            {game.releaseDate ? (
                                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>Godina izlaska</Text>
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
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>Metacritic Ocjena:</Text>
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
                                        Igre iz serijala
                                    </Text>
                                    {game.series.map((item, index) => {
                                        const year = item.released ? item.released.split('-')[0] : '';
                                        return (
                                            <Pressable
                                                key={`${item.id}-${index}`}
                                                onPress={() => { /* Ovdje dodaj navigaciju na detalje ove igre */
                                                }}
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
                                                    source={{uri: item.background_image}}
                                                    style={{width: 100, aspectRatio: 10 / 7, borderRadius: 4}}
                                                    resizeMode="cover"
                                                />
                                                <View style={{flex: 1}}>
                                                    <Text
                                                        style={{color: t.text, fontSize: 14, fontWeight: '600'}}
                                                        numberOfLines={1}
                                                    >
                                                        {item.name}
                                                    </Text>
                                                    {year ? (
                                                        <Text style={{color: t.secondaryText, fontSize: 12}}>
                                                            {year}.
                                                        </Text>
                                                    ) : null}
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            ) : null}

                            {game.about ? (
                                <View style={{gap: 4}}>
                                    <Text style={{color: t.secondaryText, fontSize: 14}}>Opis</Text>
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
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        contentOffset={{
                            x: (selectedIndex ?? 0) * SCREEN_WIDTH,
                            y: 0,
                        }}
                    >
                        {(game.image_url ?? []).map((uri) => (
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
                                    resizeMode="contain"
                                />
                            </ScrollView>
                        ))}
                    </ScrollView>
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