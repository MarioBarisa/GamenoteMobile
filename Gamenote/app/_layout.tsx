import {useEffect} from "react";
import {ActivityIndicator, View} from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {Stack} from "expo-router";
import {useTranslation} from "react-i18next";
import {GroupsProvider} from "@/context/GroupsContext";
import {ThemeProvider, useTheme} from "@/context/theme";
import {SettingsProvider} from "@/context/settings";
import {AuthProvider, useAuth} from "@/context/auth";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {colors} from "@/constants/theme";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/utils/i18n";

SplashScreen.preventAutoHideAsync();

function AppContent() {
    const {isLoading} = useAuth();
    const navTheme = useNavigationTheme();
    const {t} = useTranslation();
    const {theme} = useTheme();
    const tc = colors[theme];

    useEffect(() => {
        if (!isLoading) {
            SplashScreen.hideAsync();
        }
    }, [isLoading]);

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
                <Stack.Screen name="(tabs)"
                              options={{
                                  headerShown: false,
                                  title: t("tabs.home"),
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
                <Stack.Screen
                    name="(modals)/registerModal"
                    options={{
                        presentation: 'modal',
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
                <Stack.Screen name="settings"
                              options={{
                                  headerShown: true,
                                  title: t("screens.settingsTitle"),
                                  headerBackButtonDisplayMode: "minimal",
                              }}/>
            </Stack>
        </GroupsProvider>
    );
}

function RootNavigator() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppContent/>
            </AuthProvider>
        </ErrorBoundary>
    );
}


export default function RootLayout() {
    return (
        <ThemeProvider>
            <SettingsProvider>
                <RootNavigator/>
            </SettingsProvider>
        </ThemeProvider>
    );
}
