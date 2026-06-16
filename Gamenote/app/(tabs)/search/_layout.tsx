import { Stack } from "expo-router";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {useTranslation} from "react-i18next";

// noinspection JSUnusedGlobalSymbols
export default function SearchLayout() {
    const navTheme = useNavigationTheme();
    const {t} = useTranslation();
  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
          title: t("screens.searchTitle"),
        }}
      />
        <Stack.Screen name="details" />
    </Stack>
  );
}
