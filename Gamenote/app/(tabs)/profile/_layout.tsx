import {Stack, useRouter} from "expo-router";
import {Pressable} from "react-native";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {SymbolView} from "expo-symbols";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useTranslation} from "react-i18next";

export default function FavoritesLayout() {
  const navTheme = useNavigationTheme();
  const router = useRouter();
  const {theme} = useTheme();
  const t = colors[theme];
  const {t: tr} = useTranslation();

  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
          title: tr("screens.profileTitle"),
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
              <SymbolView
                name={"gear"}

                style={{width: 36, height: 30}}
                tintColor={t.text}
              />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}