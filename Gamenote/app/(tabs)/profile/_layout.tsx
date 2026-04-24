import { Stack, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import {useNavigationTheme} from "@/constants/navigationTheme";
import {SymbolView} from "expo-symbols";

export default function FavoritesLayout() {
    const navTheme = useNavigationTheme();
    const router = useRouter();
  return (
    <Stack screenOptions={navTheme}>
      <Stack.Screen
        name="index"
        options={{
         // headerLargeTitle: true,
          title: "Profile",
          headerRight: () => (
            <Pressable onPress={() => router.push("/settings")} hitSlop={10}>
             <SymbolView
                name={"gear"}
                resizeMode="scaleAspectFit"
                 style={{ width: 36, height: 30 }}
              />
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
