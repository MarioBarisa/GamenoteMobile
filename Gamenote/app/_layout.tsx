import {Stack} from "expo-router";
import {GroupsProvider} from "@/context/GroupsContext";
import {ThemeProvider} from "@/context/theme";
import {SettingsProvider} from "@/context/settings";
import {AuthProvider} from "@/context/auth";
import {useNavigationTheme} from "@/constants/navigationTheme";

function RootNavigator() {
    const navTheme = useNavigationTheme();

    return (
        <AuthProvider>
            <GroupsProvider>
                <Stack screenOptions={navTheme}>
                    <Stack.Screen name="(tabs)"
                                  options={{
                                      headerShown: false,
                                      title: "Početna",
                                  }}/>
                    <Stack.Screen name="details"
                                  options={{
                                      //   headerLargeTitle: true,
                                      //  title: "Detalji", -> naziv dodan unutar details.tsx kako bi svaki naslov bio = naziv igre
                                      headerBackButtonDisplayMode: "minimal",

                                  }}/>
                    <Stack.Screen
                        name="(modals)/modalEditGroups"
                        options={{
                            presentation: 'modal', title: "Uredi Info grupe",
                        }}
                    />
                     <Stack.Screen
                        name="(modals)/addGroupModal"
                        options={{
                            presentation: 'modal', title: "Dodaj novu grupu",
                        }}
                    />
                    <Stack.Screen
                        name="(modals)/modalEdit"
                        options={{
                            presentation: 'modal',
                            title: "Uredi igru",
                        }}
                    />
                    <Stack.Screen
                        name="(modals)/registerModal"
                        options={{
                            presentation: 'modal',
                            title: "Izradi račun",
                        }}
                    />
                    <Stack.Screen name="settings"
                                  options={{
                                      headerShown: true,
                                      title: "Postavke",
                                      headerBackButtonDisplayMode: "minimal",
                                  }}/>
                </Stack>
            </GroupsProvider>
        </AuthProvider>
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
