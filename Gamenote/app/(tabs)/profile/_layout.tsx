import {useState} from "react";
import {useLocalMode} from "@/context/localMode";
import {Stack, useRouter} from "expo-router";
import {Alert, Pressable, StyleSheet, View} from "react-native";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {SymbolView} from "expo-symbols";
import {useTheme} from "@/context/theme";
import {colors} from "@/constants/theme";
import {useTranslation} from "react-i18next";
import {useAuth} from "@/context/auth";

export default function FavoritesLayout() {
  const navTheme = useNavigationTheme();
  const router = useRouter();
  const {theme} = useTheme();
  const t = colors[theme];
  const {t: tr} = useTranslation();
  const {loggedIn} = useAuth();
  const {localModeEnabled, activeSource, switchSource} = useLocalMode();
  const [switching, setSwitching] = useState(false);

  async function changeProfile() {
    setSwitching(true);
    try {
      await switchSource();
    } catch {
      Alert.alert(tr("screens.localMode.storageError"));
    } finally {
      setSwitching(false);
    }
  }

  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
          title: tr("screens.profileTitle"),
          headerRight: () => (
            <View style={styles.actions}>
              {localModeEnabled && (
                <Pressable accessibilityRole="button" accessibilityLabel={tr("screens.localMode.switchProfile")}
                           accessibilityHint={tr(activeSource === "local" ? "screens.localMode.switchToCloud" : "screens.localMode.switchToLocal")}
                           accessibilityState={{busy: switching}} disabled={switching} onPress={changeProfile}
                           style={({pressed}) => [styles.action, (pressed || switching) && styles.switching]}>
                  <SymbolView name="arrow.left.arrow.right" size={22} tintColor={activeSource === "local" ? t.accent : t.text}/>
                </Pressable>
              )}
              {loggedIn && activeSource === "cloud" && (
                <Pressable accessibilityRole="button" accessibilityLabel={tr("libraryShare.title")}
                           onPress={() => router.push("/(modals)/shareProfileModal")} style={styles.action}>
                  <SymbolView name="square.and.arrow.up" size={22} tintColor={t.text}/>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" accessibilityLabel={tr("screens.settingsTitle")}
                         onPress={() => router.push("/settings")} style={styles.action}>
                <SymbolView name="gear" size={24} tintColor={t.text}/>
              </Pressable>
            </View>
          ),
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  actions: {flexDirection: "row", alignItems: "center"},
  action: {width: 44, height: 44, alignItems: "center", justifyContent: "center"},
  switching: {opacity: 0.55},
});
