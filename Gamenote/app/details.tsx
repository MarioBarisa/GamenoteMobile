import {useLocalSearchParams, Stack} from "expo-router";
import {useEffect, useState} from "react";
import {Image, ScrollView, StyleSheet, Text, View, Pressable, Dimensions, Modal} from "react-native";
import {Game} from "@/components/GameCard";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {SymbolView} from "expo-symbols";
import {inspect} from "node:util";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function Index() {
    const {theme} = useTheme();
    const t = colors[theme];
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);


    const STATUS_CONFIG = {
        playing: {label: "Playing", bg: '#0A84FF', text: '#FFFFFF'},
        paused: {label: "Paused", bg: '#FF9F0A', text: '#FFFFFF'},
        completed: {label: "Completed", bg: '#30D158', text: '#FFFFFF'},
        dropped: {label: "Dropped", bg: '#FF453A', text: '#FFFFFF'},
        backlog: {label: "Backlog", bg: '#b364da', text: '#FFFFFF'},
    }

    const STATUS_PLATFORM: Record<string, { label: string; text: string }> = {
        PlayStation: {label: "PlayStation", text: '#2760f4'},
        'PlayStation 5': {label: "PlayStation 5", text: '#2760f4'},
        'PlayStation 4': {label: "PlayStation 4", text: '#2760f4'},

        Xbox: {label: "Xbox", text: '#27f427'},
        'Xbox Series X/S': {label: "Xbox Series X/S", text: '#27f427'},
        'Xbox One': {label: "Xbox One", text: '#27f427'},

        Nintendo: {label: "Nintendo", text: '#eb0e30'},
        'Nintendo Switch': {label: "Nintendo Switch", text: '#eb0e30'},
        'Nintendo Switch 2': {label: "Nintendo Switch 2", text: '#eb0e30'},

        PC: {label: "PC", text: '#0df9e1'},
        iOS: {label: "iOS", text: '#FFFFFF'},
        Android: {label: "Android", text: '#FFFFFF'},
        Other: {label: "Other", text: '#a3a3a3'},
    }

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

    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    // @ts-ignore
    return (
        <>
            <Stack.Screen
                options={{title: game.title, headerBackTitle: 'Natrag'}}
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
                            snapToInterval={(SCREEN_WIDTH - 32) + 8} /* Cover slike,  širina slike + gap */
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
                                        style={styles.coverImage}
                                        resizeMode="cover"/> </Pressable>
                            ))}
                        </ScrollView>

                    )}
                    {/* Info row */}
                    <View style={{
                        padding: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'space-evenly'
                    }}>
                        {/*  možda maknuti space-evenly? ,STATUS BADGES */}
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
                                <Text style={{color: '#fff', fontWeight: '700'}}>
                                    {STATUS_CONFIG[game.status]?.label}
                                </Text>
                            </View>
                        ) : null}

                        {/* platforma i playtime */}
                        <View>
                            {game.platform && STATUS_PLATFORM[game.platform] ? (
                                <View style={[
                                    styles.badge,
                                    {
                                        marginRight: 8,
                                        backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                                    }
                                ]}>
                                    <Text style={[styles.boldFont, {color: STATUS_PLATFORM[game.platform].text}]}>
                                        {typeof game.play_time === 'number'
                                            ? `${game.play_time}h via ${STATUS_PLATFORM[game.platform].label}`
                                            : `via ${STATUS_PLATFORM[game.platform].label}`}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                    </View>

                    {/* start i end datumi */}
                    <View style={{
                        padding: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        justifyContent: 'space-evenly'
                    }}>
                        {game.start_date ? (
                            <Text style={{color: t.text, fontWeight: '700', paddingLeft: 8}}>
                                {new Date(game.start_date).toLocaleDateString('hr-HR')}
                            </Text>
                        ) : null}
                        <SymbolView name={"arrow.right"}
                                    style={{width: 20, height: 20, alignSelf: "center", margin: 5}}/>
                        {game.end_date ? (
                            <Text style={{color: t.text, fontWeight: '700'}}>
                                {new Date(game.end_date).toLocaleDateString('hr-HR')}
                            </Text>
                        ) : null}


                        {/* Progress */}
                        {typeof game.progress_value === 'number' && typeof game.progress_total === 'number' && (
                            <Text style={{padding: 4, fontWeight: 800, color: t.text}}>
                                Postignuća: {game.progress_value}/{game.progress_total}
                            </Text>
                        )}
                    </View>

                </View>

            </ScrollView>
            <Modal
                visible={selectedIndex !== null}
                transparent
                animationType="fade"
                onRequestClose={() => setSelectedIndex(null)}
            >
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalCloseArea} onPress={() => setSelectedIndex(null)}>
                        <SymbolView name={"xmark.circle"} style={{width: 42, height: 40, alignSelf: "flex-start", margin: 1}}/>
                    </Pressable>

                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        contentOffset={{
                            x: (selectedIndex ?? 0) * SCREEN_WIDTH, //da lijepo zauzme prostor
                            y: 0,
                        }}
                    >
                        {/* @ts-ignore */}
                        {game.image_url.map((uri) => (
                          <View key={uri} style={styles.fullscreenSlide}>
                            <Image
                              source={{ uri }}
                              style={styles.fullscreenImage}
                              resizeMode="contain"
                            />
                          </View>
                        ))}
                    </ScrollView>
                </View>
            </Modal>
        </>

    );
}


const styles = StyleSheet.create({
    coverImage: {
        width: SCREEN_WIDTH - 32,
        height: 240,
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
    fullscreenImage: {
        width: "100%",
        height: "100%",
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.95)",
    },
    modalCloseArea: {
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 12,
        zIndex: 1,
    },
    closeText: {
        color: "#fff",
        fontSize: 16,
        fontWeight: "700",
    },
    fullscreenSlide: {
        width: SCREEN_WIDTH,
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
    },
})
