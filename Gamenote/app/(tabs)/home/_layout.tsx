import { Stack } from "expo-router";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {useTranslation} from "react-i18next";

export default function HomeLayout() {
    const navTheme = useNavigationTheme();
    const {t} = useTranslation();
  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
          title: t("screens.homeTitle"),   // headerLargeTitle: true,
        }}
      />
        <Stack.Screen name="details" />
    </Stack>
  );
}
