import {useEffect, useRef} from "react";
import {ActivityIndicator, View} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {Stack} from "expo-router";
import {useTranslation} from "react-i18next";
import {UserGamesProvider} from "@/context/UserGamesContext";
import {preloadFoilTextures} from "@/services/foilTextures";
import {GroupsProvider} from "@/context/GroupsContext";
import {ThemeProvider, useTheme} from "@/context/theme";
import {LocalModeProvider, useLocalMode} from "@/context/localMode";
import {SettingsProvider, useSettings} from "@/context/settings";
import {TCGMotionProvider} from "@/context/TCGMotion";
import {AuthProvider, useAuth} from "@/context/auth";
import {useNavigationTheme} from "@/constants/navigationTheme";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/utils/i18n";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {anchor: "index"};

const fixedSheet = {
    presentation: "formSheet" as const,
    sheetAllowedDetents: [1],
    sheetExpandsWhenScrolledToEdge: false,
    headerShown: true,
    headerLargeTitle: false,
    headerBackVisible: false,
};

function AppContent() {
    const {phase, loggedIn} = useAuth();
    const {localModeEnabled, activeSource} = useLocalMode();
    const isLoading = phase === "starting";
    const canShowTabs = phase === "ready" || phase === "guest";
    const navTheme = useNavigationTheme();
    const {t} = useTranslation();
    const {themeColors} = useTheme();
    const tc = themeColors;
    const {tcgMode, tcgSettingsLoaded} = useSettings();
    const splash = useRef({deadline: 0, hidden: false});

    useEffect(() => {
        const preload = tcgMode && tcgSettingsLoaded ? preloadFoilTextures() : undefined;
        const startup = splash.current;
        if (isLoading || startup.hidden) return;

        function hideSplash() {
            if (startup.hidden) return;
            startup.hidden = true;
            void SplashScreen.hideAsync().catch(() => {});
        }

        if (tcgSettingsLoaded && !preload) {
            hideSplash();
            return;
        }

        startup.deadline ||= Date.now() + 400;
        const timer = setTimeout(hideSplash, Math.max(0, startup.deadline - Date.now()));
        let active = true;
        void preload?.then(() => { if (active) hideSplash(); });
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [isLoading, tcgMode, tcgSettingsLoaded]);

    if (isLoading) {
        return (
            <View style={{flex: 1, backgroundColor: tc.background, justifyContent: 'center', alignItems: 'center'}}>
                <ActivityIndicator size="large" color={tc.accent}/>
            </View>
        );
    }

    return (
        <GroupsProvider>
            <Stack screenOptions={navTheme}>
                <Stack.Screen name="index" options={{headerShown: false}}/>
                <Stack.Protected guard={canShowTabs}>
                    <Stack.Screen name="(tabs)"
                                  options={{
                                      headerShown: false,
                                      title: t("tabs.home"),
                                      animation: localModeEnabled ? "fade" : "default",
                                      animationDuration: localModeEnabled ? 180 : undefined,
                                  }}/>
                    <Stack.Screen
                        name="(modals)/modalEditGroups"
                        options={{
                            presentation: 'modal', title: t("screens.editGroupTitle"),
                        }}
                    />
                    <Stack.Screen
                        name="(modals)/addGroupModal"
                        options={{
                            presentation: 'modal', title: t("screens.addGroupTitle"),
                        }}
                    />
                    <Stack.Screen
                        name="(modals)/modalEdit"
                        options={{
                            presentation: 'modal',
                            title: t("screens.editGameTitle"),
                        }}
                    />
                    <Stack.Screen
                        name="(modals)/addGameModal"
                        options={{
                            presentation: 'modal',
                            title: t("screens.addGameTitle"),
                        }}
                    />
                    <Stack.Screen name="settings"
                                  options={{
                                      headerShown: true,
                                      title: t("screens.settingsTitle"),
                                      headerBackButtonDisplayMode: "minimal",
                                  }}/>
                </Stack.Protected>
                <Stack.Protected guard={canShowTabs && activeSource === "cloud"}>
                    <Stack.Screen
                        name="(modals)/registerModal"
                        options={{
                            presentation: 'modal',
                            headerShown: true,
                            title: t("screens.registerTitle"),
                        }}
                    />
                    <Stack.Screen
                        name="(modals)/onboardingModal"
                        options={{
                            presentation: 'modal',
                            headerShown: false,
                        }}
                    />
                </Stack.Protected>
                <Stack.Protected guard={canShowTabs && localModeEnabled}>
                    <Stack.Screen name="settings/local-mode"
                                  options={{headerShown: true, title: t("screens.localMode.title"), headerBackButtonDisplayMode: "minimal"}}/>
                    <Stack.Screen name="(modals)/localModeOnboarding"
                                  options={{...fixedSheet, title: t("onboarding.localMode.title")}}/>
                </Stack.Protected>
                <Stack.Protected guard={loggedIn && activeSource === "cloud"}>
                    <Stack.Screen
                        name="(modals)/manageAccountModal"
                        options={{
                            presentation: 'modal',
                            headerShown: true,
                            title: t("screens.manageAccountTitle"),
                        }}
                    />
                    <Stack.Screen name="(modals)/totpSettingsModal"
                                  options={{...fixedSheet, title: t("mfa.settings")}}/>
                    <Stack.Screen name="(modals)/shareProfileModal"
                                  options={{...fixedSheet, headerShown: false, title: t("libraryShare.title")}}/>
                </Stack.Protected>
                <Stack.Protected guard={!canShowTabs}>
                    <Stack.Screen name="(modals)/mfaSignInModal"
                                  options={{presentation: 'modal', headerShown: true, title: t("mfa.signInTitle"),
                                      gestureEnabled: false, headerBackVisible: false}}/>
                </Stack.Protected>
            </Stack>
        </GroupsProvider>
    );
}

function RootNavigator() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <LocalModeProvider>
                    <UserGamesProvider>
                        <AppContent/>
                    </UserGamesProvider>
                </LocalModeProvider>
            </AuthProvider>
        </ErrorBoundary>
    );
}


export default function RootLayout() {
    return (
        <ThemeProvider>
            <SettingsProvider>
                <TCGMotionProvider>
                    <RootNavigator/>
                </TCGMotionProvider>
            </SettingsProvider>
        </ThemeProvider>
    );
}
