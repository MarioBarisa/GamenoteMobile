import {Stack} from "expo-router";
import {FavoritesProvider} from "../context/favorites";
import {ThemeProvider} from "@/context/theme";
import {useNavigationTheme} from "@/constants/navigationTheme";

function RootNavigator() {
    const navTheme = useNavigationTheme();

    return (
        <FavoritesProvider>
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
                <Stack.Screen name="settings"
                              options={{
                                  headerShown: true,
                                  title: "Postavke",
                                  headerBackButtonDisplayMode: "minimal",
                              }}/>
            </Stack>
        </FavoritesProvider>
    );
}


export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootNavigator/>
        </ThemeProvider>
    );
}
