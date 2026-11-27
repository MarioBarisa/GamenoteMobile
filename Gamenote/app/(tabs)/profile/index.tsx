import {useLocalMode} from "@/context/localMode";
import {useSettings} from "@/context/settings";
import {screenContent} from "@/constants/layout";
import {ScreenScrollView} from "@/components/ScreenViewport";
import {localImageUrl} from "@/services/localData";
import {Image} from "expo-image";
import {Text, StyleSheet, TextInput, View, Alert, Pressable, RefreshControl} from "react-native";
import {useCallback, useLayoutEffect, useState} from "react";
import {useTheme} from "@/context/theme";
import {useAuth} from "@/context/auth";
import {SymbolView} from "expo-symbols";
import {useUserGames} from "@/hooks/useUserGames";
import {useFocusEffect, useNavigation, useRouter} from "expo-router";
import {useTranslation} from "react-i18next";
import {ACCOUNT_SECURED_COLOR} from "@/constants/theme";
import {hasPlatinum} from "@/utils/profileAchievements";
import LocalModeEntry from "@/components/LocalModeEntry";
import PasswordInput from "@/components/PasswordInput";


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
    const {themeColors: t} = useTheme();
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

// noinspection JSUnusedGlobalSymbols
export default function FavoritesScreen() {
    const {t: tr} = useTranslation();
    const {loggedIn, user, username, signIn, signOut, totpFactors, refreshSecurity, openRecoveredProfile, openProfileAfterSignIn, acknowledgeProfile} = useAuth();
    const {activeSource, document, storageError, returnToCloudProfile, setReturnToCloudProfile} = useLocalMode();
    const {claimLocalModeOnboarding} = useSettings();
    const isLocal = activeSource === "local";
    const localName = document?.profile.name || tr("screens.localMode.localProfile");
    const profileName = isLocal ? localName : user?.user_metadata?.name;
    const profileLine = isLocal ? localName : user?.email ?? username;
    const avatar = isLocal ? localImageUrl(document?.profile.profileUrl) : user?.user_metadata?.avatar_url;
    const [failedAvatar, setFailedAvatar] = useState<string>();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [signingIn, setSigningIn] = useState(false);
    const {games, refresh, isLoading} = useUserGames();
    const {themeColors: t} = useTheme();
    const navigation = useNavigation();
    const router = useRouter();

    useFocusEffect(useCallback(() => {
        if (isLocal && claimLocalModeOnboarding()) router.push("/(modals)/localModeOnboarding");
    }, [isLocal, claimLocalModeOnboarding, router]));

    useFocusEffect(useCallback(() => {
        if (loggedIn && !isLocal) refreshSecurity().catch(() => {});
    }, [isLocal, loggedIn, refreshSecurity]));

    useFocusEffect(useCallback(() => {
        if (!isLocal && returnToCloudProfile) setReturnToCloudProfile(false);
    }, [isLocal, returnToCloudProfile, setReturnToCloudProfile]));

    useFocusEffect(useCallback(() => {
        if (openProfileAfterSignIn || openRecoveredProfile) acknowledgeProfile();
        if (openRecoveredProfile) {
            Alert.alert(tr("mfa.settings"), tr("mfa.recovered"));
        }
    }, [acknowledgeProfile, openProfileAfterSignIn, openRecoveredProfile, tr]));

    useLayoutEffect(() => { // CUSTOM POZDRAV TITLE ZA USERNAME
        navigation.setOptions({
            title: profileName ? tr("profile.greetingLogged", {username: profileName}) : tr("profile.greetingGuest"),
        });
    }, [navigation, profileName, tr]);

    function userStats() {
        const totalGames = games.length;

        let totalPlaytime = 0;
        let finishedGames = 0;

        let favoriteGameTitle = "N/A";
        let maxPlaytime = -1;

        const highRatedGenreCount = new Map<string, number>();
        let switchGames = 0;
        let bestGames = 0;

        for (const game of games) {
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
                const firstGenre = game.genre.split(',')[0].trim();
                highRatedGenreCount.set(firstGenre, (highRatedGenreCount.get(firstGenre) ?? 0) + 1);
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
                ? tr("profile.funFact", {percent: Math.round((switchGames / totalGames) * 100)})
                : tr("profile.funFactFallback");

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
    const accountSecured = totpFactors.length > 0;
    const platinum = hasPlatinum(userInfo, accountSecured);

    return (
        <ScreenScrollView
            backgroundColor={t.background}
            contentContainerStyle={loggedIn || isLocal ? screenContent.detail : screenContent.form}
            automaticallyAdjustKeyboardInsets
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { refresh(); if (!isLocal) refreshSecurity().catch(() => {}); }} tintColor={t.accent} />}
        >
            {(loggedIn || isLocal) && (
                <View style={styles.container}>
                    {avatar && (!isLocal || avatar !== failedAvatar) ? (
                        <Image
                            source={{uri: avatar}}
                            onError={isLocal ? () => setFailedAvatar(avatar) : undefined}
                            style={{
                                width: 150,
                                height: 150,
                                borderRadius: 360,
                                margin: 5,
                                alignSelf: "center",
                            }}
                            contentFit="cover"
                            cachePolicy={isLocal ? "memory" : "memory-disk"}
                            transition={{duration: 200, effect: "cross-dissolve"}}
                        />
                    ) : (
                        <View style={{
                            width: 150,
                            height: 150,
                            borderRadius: 360,
                            margin: 5,
                            alignSelf: "center",
                            backgroundColor: t.backgroundModal,
                            justifyContent: "center",
                            alignItems: "center",
                        }}>
                            <Text style={{
                                color: t.accent,
                                fontSize: 56,
                                fontWeight: "700",
                            }}>
                                {(profileLine || '?').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <Text style={{
                        color: t.secondaryText,
                        fontWeight: "bold",
                        fontSize: 12,
                        alignSelf: "center"
                    }}>{profileLine}</Text>
                    {isLocal && <View style={[styles.localBadge, {backgroundColor: t.backgroundModal}]}>
                        <SymbolView name="iphone" size={13} tintColor={t.accent}/>
                        <Text style={{color: t.accent, fontSize: 12, fontWeight: "600"}}>{tr("screens.localMode.badge")}</Text>
                    </View>}
                    {isLocal && storageError && <Text accessibilityRole="alert" style={{color: t.destructive}}>
                        {tr("screens.localMode.storageError")}
                    </Text>}
                    <Text style={{color: t.text, fontWeight: "bold", fontSize: 22, alignSelf: "center"}}>{tr("profile.statsTitle")}</Text>
                    <View style={styles.row}>
                        <StatCard
                            label={tr("profile.totalGames")}
                            value={String(userInfo.totalGames)}
                            valueColor="#F43098"
                            symbolName="gamecontroller.fill"
                            symbolColor="#F43098"
                        />
                        <StatCard
                            label={tr("profile.hoursPlayed")}
                            value={`${userInfo.totalPlaytime}h`}
                            valueColor="#6476ff"
                            symbolName="clock.fill"
                            symbolColor="#6476ff"
                        />
                        <StatCard
                            label={tr("profile.completed")}
                            value={String(userInfo.finishedGames)}
                            valueColor="#00D391"
                            symbolName="checkmark.circle.fill"
                            symbolColor="#00D391"
                        />
                    </View>

                    <View style={styles.row}>
                        <StatCard
                            label={tr("profile.completionRate")}
                            value={`${userInfo.completionRate}%`}
                            valueColor="#8116f3"
                            symbolName="chart.pie.fill"
                            symbolColor="#8116f3"
                        />
                        <StatCard
                            label={tr("profile.avgPlaytime")}
                            value={`${userInfo.avgPlaytime}h`}
                            valueColor="#fb2b61"
                            symbolName="chart.bar.fill"
                            symbolColor="#fb2b61"
                        />
                        <StatCard
                            label={tr("profile.inDays")}
                            value={`${(userInfo.totalPlaytime / 24).toFixed(1)}d`}
                            valueColor="#fb9207"
                            symbolName="calendar"
                            symbolColor="#fb9207"
                        />
                    </View>

                    <View style={styles.row}>
                        <StatCard
                            label={tr("profile.favoriteGame")}
                            value={userInfo.favoriteGameTitle}
                            valueColor="#ffd700"
                            symbolName="star.fill"
                            symbolColor="#ffd700"
                            wide
                        />
                        <StatCard
                            label={tr("profile.favoriteGenre")}
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
                    <Text style={{color: t.text, fontWeight: "bold", fontSize: 22, alignSelf: "center", margin: 12}}>{tr("profile.achievementsTitle")}</Text>
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
                            minimumFontScale={0.7}>{tr("profile.achBeginner")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>{tr("profile.achBeginnerDesc")}</Text>
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
                            minimumFontScale={0.7}>{tr("profile.achCollector")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>{tr("profile.achCollectorDesc")}</Text>
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
                            minimumFontScale={0.7}>{tr("profile.achCompletionMaster")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>{tr("profile.achCompletionMasterDesc")}</Text>
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
                            minimumFontScale={0.7}>{tr("profile.achSpeedster")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>{tr("profile.achSpeedsterDesc")}</Text>
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
                            minimumFontScale={0.7}>{tr("profile.achHardcore")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>{tr("profile.achHardcoreDesc")}</Text>
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
                            minimumFontScale={0.7}>{tr("profile.achLegend")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>{tr("profile.achLegendDesc")}</Text>
                        </View>
                        <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                            <SymbolView
                                name="trophy.fill"
                                style={{width: 24, height: 24}}
                                tintColor={platinum ? "#C0C0C0" : t.secondaryText}
                            />
                            <Text style={{
                                color: platinum ? "#C0C0C0" : t.secondaryText,
                                fontWeight: "bold",
                                fontSize: 11,
                                textAlign: "center"
                            }}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.7}>{tr("profile.achPlatinum")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}>
                                {tr("profile.achPlatinumDesc")}
                            </Text>
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
                            minimumFontScale={0.7}>{tr("profile.achGoty")}</Text>
                            <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}
                            numberOfLines={2}>{tr("profile.achGotyDesc")}</Text>
                        </View>

                        {!isLocal && (
                            <View style={{alignItems: "center", gap: 4, padding: 4, width: "30%"}}>
                                <SymbolView name="checkmark.shield.fill" size={24}
                                            tintColor={accountSecured ? ACCOUNT_SECURED_COLOR : t.secondaryText}/>
                                <Text style={{color: accountSecured ? ACCOUNT_SECURED_COLOR : t.secondaryText,
                                    fontWeight: "bold", fontSize: 11, textAlign: "center"}}
                                      numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                    {tr("mfa.achievement")}
                                </Text>
                                <Text style={{color: t.secondaryText, fontSize: 10, textAlign: "center"}}>
                                    {tr("mfa.achievementDescription")}
                                </Text>
                            </View>
                        )}
                    </View>
                    {isLocal ? <Pressable accessibilityRole="button" style={[styles.localBadge, {backgroundColor: t.backgroundModal, minHeight: 44}]}
                        onPress={() => router.push("/settings/local-mode")}>
                        <SymbolView name="person.crop.circle" size={18} tintColor={t.accent}/>
                        <Text style={{color: t.accent, fontWeight: "600"}}>{tr("screens.localMode.editProfile")}</Text>
                    </Pressable> : <View style={{flexDirection: "row", gap: 12, justifyContent: "center", flexWrap: "wrap"}}>

                        <Pressable
                            accessibilityLabel={tr("profile.manageAccountA11y")}
                            style={({pressed}) => [{
                                backgroundColor: t.backgroundModal,
                                margin: 4, padding: 12,
                                borderRadius: 32,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                opacity: pressed ? 0.6 : 1,
                            }]}
                             onPress={() => router.push('/(modals)/manageAccountModal')}
                        >
                            <SymbolView
                                name={"person.crop.circle" as any}
                                style={{width: 18, height: 18}}
                                tintColor={t.accent}
                            />
                            <Text style={{color: t.accent, fontWeight: "600", fontSize: 15}}>
                                {tr("profile.manageAccount")}
                            </Text>
                        </Pressable>

                        <Pressable
                            accessibilityLabel={tr("profile.logoutA11y")}
                            style={({pressed}) => [{
                                backgroundColor: t.backgroundModal,
                                margin: 4, padding: 12,
                                borderRadius: 22,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                                opacity: pressed ? 0.6 : 1,
                            }]}
                            onPress={async () => {
                                await signOut();
                                Alert.alert(tr("profile.logoutSuccess"));
                            }}
                        >
                            <SymbolView
                                name={"rectangle.portrait.and.arrow.right" as any}
                                style={{width: 18, height: 18}}
                                tintColor={t.destructive}
                            />
                            <Text style={{color: t.destructive, fontWeight: "600", fontSize: 15}}>
                                {tr("profile.logout")}
                            </Text>
                        </Pressable>

                    </View>}
                </View>
            )}

            {!loggedIn && !isLocal && (
                <View>
                    <View style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: t.accent,
                        borderRadius: 32,
                        margin: 12,
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                    }}>
                        <SymbolView
                            name={"info.circle.fill"}
                            style={{width: 20, height: 20, alignSelf: "center", margin: 5}} tintColor={'#FFFFFF'}
                        />
                        <Text style={[styles.textBodyCenterHiglighted, {color: '#FFFFFF', flexShrink: 1}]}>
                            {tr("profile.demoBanner")}
                        </Text>
                    </View>
                    <SymbolView
                        name={"person.crop.circle.badge.plus"}
                        style={{width: 110, height: 110, alignSelf: "center", margin: 5}}
                    />
                    <Text style={[styles.textBodyCenterHiglighted, {color: t.text}]}>
                       {tr("profile.demoPrompt")}
                    </Text>
                    <View style={{padding: 15, gap: 8, marginTop: 10}}>
                        <TextInput
                            placeholder={tr("profile.email")}  // <Text style={{color: '#dd2316'}}>Gamenote</Text>
                            placeholderTextColor={t.secondaryText}
                            clearButtonMode="unless-editing"
                            style={[styles.systemInput, {color: t.text}]}
                            textContentType="username"
                            autoComplete="username"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                            onChangeText={setEmail}
                        />
                        <PasswordInput
                            placeholder={tr("profile.password")}
                            placeholderTextColor={t.secondaryText}
                            clearButtonMode="unless-editing"
                            containerStyle={{marginHorizontal: 16}}
                            style={[styles.systemInput, {color: t.text, marginHorizontal: 0}]}
                            textContentType="password"
                            autoComplete="password"
                            value={password}
                            editable={!signingIn}
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
                                accessibilityLabel={tr("profile.loginA11y")}
                                disabled={signingIn}
                                onPress={async () => {
                                    if (!password) {
                                        Alert.alert(tr("profile.missingPasswordTitle"), tr("profile.missingPasswordMsg"));
                                        return;
                                    }
                                    setSigningIn(true);
                                    try {
                                        const result = await signIn(email, password);
                                        if (!result.success) {
                                            Alert.alert(tr("profile.login"), result.error || tr("mfa.unavailable"));
                                        }
                                    } catch {
                                        Alert.alert(tr("profile.login"), tr("mfa.unavailable"));
                                    } finally {
                                        setPassword("");
                                        setSigningIn(false);
                                    }
                                }}
                            >
                                <SymbolView
                                    name={"arrow.right" as any}
                                    style={{width: 22, height: 22}}
                                    tintColor={t.accent}
                                />
                                <Text style={{color: t.accent, fontWeight: "600", fontSize: 20}}>
                                    {tr("profile.login")}
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
                                accessibilityLabel={tr("profile.registerA11y")}
                                onPress={() => router.push('/(modals)/registerModal')}
                            >
                                <SymbolView
                                    name={"person.crop.circle.badge.plus"}
                                    style={{width: 28, height: 28}}
                                    tintColor={t.accent}
                                />
                                <Text style={{color: t.accent, fontWeight: "600", fontSize: 20}}>
                                    {tr("profile.register")}
                                </Text>
                            </Pressable>
                        </View>
                        <LocalModeEntry disabled={signingIn}/>
                    </View>
                </View>
            )}
        </ScreenScrollView>
    );
}


const CARD_GAP = 8;

const styles = StyleSheet.create({
    localBadge: {alignSelf: "center", borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4},
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
