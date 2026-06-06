import {Text, ScrollView, StyleSheet, TextInput, View, Alert, Image, Pressable, Linking} from "react-native";
import {useLayoutEffect, useState} from "react";
import {useTheme} from "@/context/theme";
import {useAuth} from "@/context/auth";
import {colors} from "@/constants/theme";
import {SymbolView} from "expo-symbols";
import {PLACEHOLDER_GAMES} from "@/constants/PLACEHOLDER_GAMES";
import {useNavigation, useRouter} from "expo-router";


// noinspection JSUnusedGlobalSymbols
export default function FavoritesScreen() {
    const {loggedIn, setLoggedIn, username, setUsername} = useAuth();
    const [password, setPassword] = useState("");
    const {theme} = useTheme();
    const t = colors[theme];
    const navigation = useNavigation();
    const router = useRouter();

    useLayoutEffect(() => { // CUSTOM POZDRAV TITLE ZA USERNAME
        navigation.setOptions({
            title: loggedIn && username ? `Pozdrav ${username}!` : "Dobrodošao!",
        });
    }, [navigation, loggedIn, username]);

    function userStats() {
        const totalGames = PLACEHOLDER_GAMES.length;

        let totalPlaytime = 0;
        let finishedGames = 0;

        let favoriteGameTitle = "N/A";
        let maxPlaytime = -1;

        const highRatedGenreCount = new Map<string, number>();
        let switchGames = 0;
        let bestGames = 0;

        for (const game of PLACEHOLDER_GAMES) {
            const playTime = game.play_time ?? 0;
            totalPlaytime += playTime;

            if (game.status === "completed") {
                finishedGames += 1;
            }

            // Najvise sati = omiljena igra
            if (playTime > maxPlaytime) {
                maxPlaytime = playTime;
                favoriteGameTitle = game.title;
            }

            // Omiljeni zanr = zanr koji se najcesce pojavljuje u igrama s rating >= 4
            if ((game.rating ?? 0) >= 4 && game.genre) {
                highRatedGenreCount.set(game.genre, (highRatedGenreCount.get(game.genre) ?? 0) + 1);
            }
            if ((game.rating ?? 0) >= 5) {
                bestGames++;
            }

            // Fora fact: koliko igara je na Nintendo platformi ( zamjeniti vjv )
            if ((game.platform ?? "").toLowerCase().includes("nintendo")) {
                switchGames += 1;
            }
        }

        const completionRate = totalGames > 0 ? Math.round((finishedGames / totalGames) * 100) : 0;

        let favoriteGenre = "N/A";
        let favoriteGenreCount = 0;
        for (const [genre, count] of highRatedGenreCount.entries()) {
            if (count > favoriteGenreCount) {
                favoriteGenre = genre;
                favoriteGenreCount = count;
            }
        }

        const avgPlaytime = totalGames > 0 ? Math.round(totalPlaytime / totalGames) : 0;

        const funFact =
            totalGames > 0
                ? `Igras Nintendo naslove u ${Math.round((switchGames / totalGames) * 100)}% kolekcije.`
                : "Dodaj jos koju igru za statistiku!";

        return {
            totalGames,
            totalPlaytime,
            finishedGames,
            completionRate,
            favoriteGameTitle,
            favoriteGenre,
            avgPlaytime,
            funFact,
            bestGames,
        };
    }

    const userInfo = userStats();

    function StatCard({  // reusable za stats
                          label,
                          value,
                          valueColor,
                          symbolName,
                          symbolColor,
                          wide = false,
                      }: {
        label: string;
        value: string;
        valueColor: string;
        symbolName: string;
        symbolColor: string;
        wide?: boolean;
    }) {
        return (
            <View style={[styles.statCard, {backgroundColor: t.backgroundModal}, wide && styles.statCardWide]}>
                <SymbolView
                    name={symbolName as any}
                    style={styles.statIcon}
                    tintColor={symbolColor}
                />
                <Text style={[styles.statLabel, {color: t.secondaryText}]}>{label}</Text>
                <Text style={[styles.statValue, {color: valueColor}]} numberOfLines={1} adjustsFontSizeToFit>
                    {value}
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={{backgroundColor: t.background}}
            contentInsetAdjustmentBehavior="automatic"
        >
            {loggedIn && (
                <View style={styles.container}>
                    <Image
                        source={{uri: "https://i.ibb.co/DgTDkWKD/IMG-3485.jpg"}}
                        style={{
                            width: 150,
                            height: 150,
                            resizeMode: "cover",
                            borderRadius: 360,
                            margin: 5,
                            alignSelf: "center",
                            //borderColor: t.secondaryText,
                            //borderWidth: 4

                        }}
                    />
                    <Text style={{
                        color: t.secondaryText,
                        fontWeight: "bold",
                        fontSize: 12,
                        alignSelf: "center"
                    }}>{username}@email.com</Text>
                    <Text style={{color: t.text, fontWeight: "bold", fontSize: 22, alignSelf: "center"}}>Tvoja Gamenote
                        statistika</Text>
                    <View style={styles.row}>
                        <StatCard
                            label="Ukupno igara"
                            value={String(userInfo.totalGames)}
                            valueColor="#F43098"
                            symbolName="gamecontroller.fill"
                            symbolColor="#F43098"
                        />
                        <StatCard
                            label="Sati igranja"
                            value={`${userInfo.totalPlaytime}h`}
                            valueColor="#6476ff"
                            symbolName="clock.fill"
                            symbolColor="#6476ff"
                        />
                        <StatCard
                            label="Završene"
                            value={String(userInfo.finishedGames)}
                            valueColor="#00D391"
                            symbolName="checkmark.circle.fill"
                            symbolColor="#00D391"
                        />
                    </View>

                    <View style={styles.row}>
                        <StatCard
                            label="Prolaznost"
                            value={`${userInfo.completionRate}%`}
                            valueColor="#8116f3"
                            symbolName="chart.pie.fill"
                            symbolColor="#8116f3"
                        />
                        <StatCard
                            label="AVG playtime"
                            value={`${userInfo.avgPlaytime}h`}
                            valueColor="#fb2b61"
                            symbolName="chart.bar.fill"
                            symbolColor="#fb2b61"
                        />
                        <StatCard
                            label="U danima"
                            value={`${(userInfo.totalPlaytime / 24).toFixed(1)}d`}
                            valueColor="#fb9207"
                            symbolName="calendar"
                            symbolColor="#fb9207"
                        />
                    </View>

                    <View style={styles.row}>
                        <StatCard
                            label="Omiljena igra"
                            value={userInfo.favoriteGameTitle}
                            valueColor="#ffd700"
                            symbolName="star.fill"
                            symbolColor="#ffd700"
                            wide
                        />
                        <StatCard
                            label="Omiljen genre"
                            value={userInfo.favoriteGenre}
                            valueColor="#006ad3"
                            symbolName="tag.fill"
                            symbolColor="#006ad3"
                            wide
                        />
                    </View>

                    {/*<View style={[styles.funFactCard, {backgroundColor: t.backgroundModal}]}> MOŽDA DODAT ILI NE DODATI VIDITI!!
                       <SymbolView
                            name={"info.circle.fill" as any}
                            style={styles.funFactIcon}
                            tintColor="#00aaf3"
                        />
                        <View style={styles.funFactTextWrap}>
                            <Text style={[styles.funFactTitle, {color: t.secondaryText}]}>Fun fact</Text>
                            <Text style={[styles.funFactBody, {color: "#00aaf3"}]}>{userInfo.funFact}</Text>
                        </View>
                    </View>*/}
                    <Text style={{color: t.text, fontWeight: "bold", fontSize: 22, alignSelf: "center", margin: 12}}>Gamenote
                        postignuća</Text>
                    <View style={{
                        backgroundColor: t.backgroundModal,
                        borderRadius: 32,
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 4
                    }}>

                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="flag.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.totalGames >= 1 ? "#4cd964" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.totalGames >= 1 ? "#4cd964" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>Beginner</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>Dodaj prvu
                                igru</Text>
                        </View>

                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="bookmark.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.totalGames >= 50 ? "#5ac8fa" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.totalGames >= 50 ? "#5ac8fa" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>Kolekcionar</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>50+ igara</Text>
                        </View>

                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="checkmark.seal.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.finishedGames >= 25 ? "#00D391" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.finishedGames >= 25 ? "#00D391" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>Completion master</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>Završi 25
                                igara</Text>
                        </View>

                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="bolt.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.totalPlaytime >= 100 ? "#ff9500" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.totalPlaytime >= 100 ? "#ff9500" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>Brzinski</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>100+ sati</Text>
                        </View>

                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="flame.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.totalPlaytime >= 1000 ? "#ff3b30" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.totalPlaytime >= 1000 ? "#ff3b30" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>Hardcore</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>1000+ sati</Text>
                        </View>

                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="crown.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.totalPlaytime >= 3000 ? "#bf5af2" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.totalPlaytime >= 3000 ? "#bf5af2" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>Legend</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>3000+ sati</Text>
                        </View>
                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="trophy.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.totalGames >= 50 && userInfo.finishedGames >= 25 && userInfo.totalPlaytime >= 3000 && userInfo.bestGames >= 10 ? "#C0C0C0" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.totalGames >= 50 && userInfo.finishedGames >= 25 && userInfo.totalPlaytime >= 3000 && userInfo.bestGames >= 10 ? "#C0C0C0" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>Gamenote Platinum</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>100% Gamenote
                                Completion</Text>
                        </View>

                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="medal.fill"
                                style={{width: 24, height: 24}}
                                tintColor={userInfo.bestGames >= 10 ? "#FFD700" : t.secondaryText}
                            />
                            <Text style={{
                                color: userInfo.bestGames >= 10 ? "#FFD700" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>GOTY enjoyer</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>Odigrano 10+ igara
                                s MAX ocjenom</Text>
                        </View>

                    </View>
                    <View style={{flexDirection: "row", gap: 12, justifyContent: "center", flexWrap: "wrap"}}>

                        <Pressable
                            accessibilityLabel="Upravljaj računom"
                            style={({pressed}) => [{
                                backgroundColor: t.backgroundModal,
                                margin: 4, padding: 12,
                                borderRadius: 32,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                opacity: pressed ? 0.6 : 1,
                            }]}
                            onPress={() => Linking.openURL("https://gamenote.barisa.me/profile")}
                        >
                            <SymbolView
                                name={"person.crop.circle" as any}
                                style={{width: 18, height: 18}}
                                tintColor={t.accent}
                            />
                            <Text style={{color: t.accent, fontWeight: "600", fontSize: 15}}>
                                Upravljaj računom
                            </Text>
                        </Pressable>

                        <Pressable
                            accessibilityLabel="Odjavi se"
                            style={({pressed}) => [{
                                backgroundColor: t.backgroundModal,
                                margin: 4, padding: 12,
                                borderRadius: 22,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                opacity: pressed ? 0.6 : 1,
                            }]}
                            onPress={() => {
                                setLoggedIn(false);
                                Alert.alert("Uspješno si se odjavio.");
                            }}
                        >
                            <SymbolView
                                name={"rectangle.portrait.and.arrow.right" as any}
                                style={{width: 18, height: 18}}
                                tintColor={t.destructive}
                            />
                            <Text style={{color: t.destructive, fontWeight: "600", fontSize: 15}}>
                                Odjavi se.
                            </Text>
                        </Pressable>

                    </View>
                </View>
            )}

            {!loggedIn && (
                <View>
                    <View style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: t.accent,
                        borderRadius: 32,
                        margin: 12,
                        padding: 6
                    }}>
                        <SymbolView
                            name={"info.circle.fill"}
                            style={{width: 20, height: 20, alignSelf: "center", margin: 5}} tintColor={'#FFFFFF'}
                        />
                        <Text style={[styles.textBodyCenterHiglighted, {color: '#FFFFFF'}]}>
                            Trenutno gledaš demo podatke
                        </Text>
                    </View>
                    <SymbolView
                        name={"person.crop.circle.badge.plus"}
                        style={{width: 110, height: 110, alignSelf: "center", margin: 5}}
                    />
                    <Text style={[styles.textBodyCenterHiglighted, {color: t.text}]}>
                       Napravi Gamenote profil ili se prijavi
                    </Text>
                    <View style={{padding: 15, gap: 8, marginTop: 10}}>
                        <TextInput
                            placeholder="Gamenote Username"  // <Text style={{color: '#dd2316'}}>Gamenote</Text>
                            placeholderTextColor={t.secondaryText}
                            clearButtonMode="unless-editing"
                            style={[styles.systemInput, {color: t.text}]}
                            onChangeText={setUsername}
                        />
                        <TextInput
                            placeholder="Gamenote Password"
                            placeholderTextColor={t.secondaryText}
                            clearButtonMode="unless-editing"
                            secureTextEntry
                            style={[styles.systemInput, {color: t.text}]}
                            onChangeText={setPassword}
                        />
                        <View style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            flexWrap: "wrap",
                            margin: 12,
                            gap: 4
                        }}>
                            <Pressable
                                style={({pressed}) => [{
                                    backgroundColor: t.backgroundModal,
                                    margin: 4, padding: 12,
                                    borderRadius: 32,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    opacity: pressed ? 0.6 : 1
                                }]}
                        accessibilityLabel="Prijavi se"
                        onPress={() => {
                                    if (password === "") {
                                        Alert.alert("Fali lozinka.", "Unesite ispravnu lozinku.");
                                    } else {
                                        setLoggedIn(true);
                                    }
                                }}
                            >
                                <SymbolView
                                    name={"arrow.right" as any}
                                    style={{width: 22, height: 22}}
                                    tintColor={t.accent}
                                />
                                <Text style={{color: t.accent, fontWeight: "600", fontSize: 20}}>
                                    Prijavi se
                                </Text>
                            </Pressable>
                            <Pressable
                                style={({pressed}) => [{
                                    backgroundColor: t.backgroundModal,
                                    margin: 4, padding: 12,
                                    borderRadius: 32,
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    opacity: pressed ? 0.6 : 1
                                }]}
                                accessibilityLabel="Izradi račun"
                                onPress={() => router.push('/(modals)/registerModal')}
                            >
                                <SymbolView
                                    name={"person.crop.circle.badge.plus"}
                                    style={{width: 28, height: 28}}
                                    tintColor={t.accent}
                                />
                                <Text style={{color: t.accent, fontWeight: "600", fontSize: 20}}>
                                    Izradi račun
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}


const CARD_GAP = 8;

const styles = StyleSheet.create({
    container: {
        padding: 12,
        gap: 8,
    },
    row: {
        flexDirection: "row",
        gap: CARD_GAP,
    },

    profileHeader: {
        alignItems: "center",
        paddingVertical: 12,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        marginBottom: 8,
    },
    profileName: {
        fontSize: 18,
        fontWeight: "600",
    },
    profileSub: {
        fontSize: 13,
        marginTop: 2,
    },
    statCard: {
        flex: 1,
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        gap: 4,
    },
    statCardWide: {
        flex: 1,
    },
    statIcon: {
        width: 22,
        height: 22,
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "500",
        textAlign: "center",
    },
    statValue: {
        fontSize: 15,
        fontWeight: "700",
        textAlign: "center",
    },
    funFactCard: {
        borderRadius: 12,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    funFactIcon: {
        width: 22,
        height: 22,
        flexShrink: 0,
    },
    funFactTextWrap: {
        flex: 1,
        gap: 2,
    },
    funFactTitle: {
        fontSize: 11,
        fontWeight: "500",
    },
    funFactBody: {
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 19,
    },
    textBodyCenterHiglighted: {
        fontSize: 15,
        fontWeight: "bold",
        textAlign: "center",
    },
    systemInput: {
        backgroundColor: "rgba(118, 118, 128, 0.12)",
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 7,
        fontSize: 17,
        marginHorizontal: 16,
    },
});