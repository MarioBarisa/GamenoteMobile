import {Pressable} from "react-native";
import {SymbolView} from "expo-symbols";
import {useLocalMode} from "@/context/localMode";
import {useTheme} from "@/context/theme";
import {router, Stack} from "expo-router";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {useTranslation} from "react-i18next";

export default function HomeLayout() {
    const navTheme = useNavigationTheme();
    const {t} = useTranslation();
    const {activeSource} = useLocalMode();
    const {themeColors} = useTheme();
  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
          headerRight: activeSource === "local" ? () => (
            <Pressable accessibilityRole="button" accessibilityLabel={t("addGame.title")}
                       style={{width: 44, height: 44, alignItems: "center", justifyContent: "center"}}
                       onPress={() => router.push("/(modals)/addGameModal")}>
              <SymbolView name="plus" size={22} tintColor={themeColors.accent}/>
            </Pressable>
          ) : undefined,
          title: t("screens.homeTitle"),   // headerLargeTitle: true,
        }}
      />
        <Stack.Screen name="details" />
    </Stack>
  );
}
