import {Stack} from "expo-router";
import {useTranslation} from "react-i18next";
import {GroupsProvider} from "@/context/GroupsContext";
import {ThemeProvider} from "@/context/theme";
import {SettingsProvider} from "@/context/settings";
import {AuthProvider} from "@/context/auth";
import {useNavigationTheme} from "@/constants/navigationTheme";
import ErrorBoundary from "@/components/ErrorBoundary";
import "@/utils/i18n";

function RootNavigator() {
    const navTheme = useNavigationTheme();
    const {t} = useTranslation();

    return (
        <ErrorBoundary>
            <AuthProvider>
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
