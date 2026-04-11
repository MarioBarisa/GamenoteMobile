import { Stack, useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import {useNavigationTheme} from "@/constants/navigationTheme";

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
              <Text style={{ color: "#0A84FF", fontWeight: "600" }}>Postavke</Text>
            </Pressable>
          ),
        }}
      />
    </Stack>
  );
}
